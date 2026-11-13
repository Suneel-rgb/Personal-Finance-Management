import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const debt = await prisma.debt.findUnique({
      where: { id },
      include: {
        party: true,
        settlements: {
          include: {
            transaction: {
              include: { account: true },
            },
          },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    return NextResponse.json(debt);
  } catch (error: any) {
    console.error("Get debt error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch debt details" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dueDate, notes, status } = body;

    const debt = await prisma.debt.findUnique({ where: { id } });
    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    const updated = await prisma.debt.update({
      where: { id },
      data: {
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : debt.dueDate,
        notes: notes !== undefined ? notes : debt.notes,
        status: status !== undefined ? status : debt.status,
      },
      include: { party: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update debt error:", error);
    return NextResponse.json({ error: error.message || "Failed to update debt" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const debt = await prisma.debt.findUnique({
      where: { id },
      include: {
        settlements: { include: { transaction: true } },
        transactions: true,
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Revert all settlements and adjust account balances
      for (const settlement of debt.settlements) {
        if (settlement.transaction) {
          const { accountId, amount } = settlement.transaction;
          if (debt.type === "LENT") {
            // LENT settlement was received (+) -> revert by decrementing
            await tx.account.update({
              where: { id: accountId },
              data: { currentBalance: { decrement: amount } },
            });
          } else {
            // BORROWED settlement was paid (-) -> revert by incrementing
            await tx.account.update({
              where: { id: accountId },
              data: { currentBalance: { increment: amount } },
            });
          }
          await tx.debtSettlement.delete({ where: { id: settlement.id } });
          await tx.transaction.delete({ where: { id: settlement.transactionId } });
        }
      }

      // 2. Revert any initial transactions linked to this debt
      for (const t of debt.transactions) {
        if (t.type === "LEND") {
          // LEND was outflow (-) -> revert by incrementing (+)
          await tx.account.update({
            where: { id: t.accountId },
            data: { currentBalance: { increment: t.amount } },
          });
          await tx.transaction.delete({ where: { id: t.id } });
        } else if (t.type === "BORROW") {
          // BORROW was inflow (+) -> revert by decrementing (-)
          await tx.account.update({
            where: { id: t.accountId },
            data: { currentBalance: { decrement: t.amount } },
          });
          await tx.transaction.delete({ where: { id: t.id } });
        }
      }

      // 3. Delete the debt
      await tx.debt.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete debt error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete debt" }, { status: 500 });
  }
}

