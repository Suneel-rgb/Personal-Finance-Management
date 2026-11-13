import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function GET(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const frequency = searchParams.get("frequency");

    const whereClause: any = { userId: user.id };
    if (frequency) {
      whereClause.frequency = frequency;
    }

    const debts = await prisma.debt.findMany({
      where: whereClause,
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
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });

    // Check overdue statuses dynamically and calculate paid amount
    const now = new Date();
    const updatedDebts = debts.map((d) => {
      let currentStatus = d.status;
      if (d.status !== "SETTLED" && d.dueDate && new Date(d.dueDate) < now) {
        currentStatus = "OVERDUE";
      }
      const paid = Math.max(0, d.originalAmount - d.remainingAmount);
      return { ...d, paidAmount: paid, status: currentStatus };
    });

    const receivables = updatedDebts.filter((d) => d.type === "LENT");
    const payables = updatedDebts.filter((d) => d.type === "BORROWED");

    const totalReceivable = receivables
      .filter((d) => d.status !== "SETTLED")
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalPayable = payables
      .filter((d) => d.status !== "SETTLED")
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    return NextResponse.json({
      debts: updatedDebts,
      receivables,
      payables,
      summary: {
        totalReceivable,
        totalPayable,
        receivableCount: receivables.filter((d) => d.status !== "SETTLED").length,
        payableCount: payables.filter((d) => d.status !== "SETTLED").length,
      },
    });
  } catch (error: any) {
    console.error("Debts GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch debts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      paymentName,
      partyId,
      partyName,
      type, // "LENT" (to receive) or "BORROWED" (to pay)
      amount,
      frequency, // "WEEKLY" | "MONTHLY" | "ONE_TIME"
      dueDate,
      notes,
      paymentMethod,
      accountId, // optional: if provided, immediately updates account balance
    } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Please enter a valid amount" }, { status: 400 });
    }

    const resolvedTitle = title || paymentName || (partyName ? `Payment for ${partyName}` : "Pending Payment");

    const result = await prisma.$transaction(async (tx) => {
      let finalPartyId = partyId;

      // Create party if not selected
      if (!finalPartyId && partyName) {
        const newParty = await tx.party.create({
          data: {
            userId: user.id,
            name: partyName,
          },
        });
        finalPartyId = newParty.id;
      }

      if (!finalPartyId) {
        throw new Error("Party/Person name is required");
      }

      // Create Debt
      const debt = await tx.debt.create({
        data: {
          userId: user.id,
          partyId: finalPartyId,
          title: resolvedTitle,
          type: type || "BORROWED",
          frequency: frequency || "ONE_TIME",
          originalAmount: numAmount,
          remainingAmount: numAmount,
          paidAmount: 0,
          paymentMethod: paymentMethod || "UPI",
          dueDate: dueDate ? new Date(dueDate) : null,
          status: "PENDING",
          notes: notes || null,
        },
        include: { party: true },
      });

      // If accountId is specified, record the cash/bank transaction
      if (accountId) {
        const txType = type === "LENT" ? "LEND" : "BORROW";
        await tx.transaction.create({
          data: {
            userId: user.id,
            accountId,
            partyId: finalPartyId,
            debtId: debt.id,
            type: txType,
            amount: numAmount,
            transactionDate: new Date(),
            notes: notes || (type === "LENT" ? `Lent money to ${debt.party.name}` : `Borrowed money from ${debt.party.name}`),
          },
        });

        if (type === "LENT") {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { decrement: numAmount } },
          });
        } else {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { increment: numAmount } },
          });
        }
      }

      return debt;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Debts POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create debt record" }, { status: 500 });
  }
}

