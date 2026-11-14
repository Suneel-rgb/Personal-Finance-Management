import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;

    const debt = await prisma.debt.findUnique({
      where: { id, userId: user.id },
      include: {
        installments: true,
        settlements: { include: { transaction: true } },
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Weekly loan not found" }, { status: 404 });
    }

    // Refund balances if settlements were recorded
    for (const settlement of debt.settlements) {
      if (settlement.transaction) {
        await prisma.account.update({
          where: { id: settlement.transaction.accountId },
          data: {
            currentBalance: { increment: settlement.amountPaid },
          },
        });
        await prisma.transaction.delete({ where: { id: settlement.transactionId } });
      }
    }

    // Delete installments
    await prisma.installment.deleteMany({
      where: { debtId: debt.id },
    });

    // Delete debt
    await prisma.debt.delete({
      where: { id: debt.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/debts/weekly/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete weekly payment" }, { status: 500 });
  }
}

