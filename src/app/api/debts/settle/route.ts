import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { debtId, accountId, amount, paymentDate, notes } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Please enter a valid payment amount" }, { status: 400 });
    }

    if (!debtId || !accountId) {
      return NextResponse.json({ error: "Debt ID and Account ID are required" }, { status: 400 });
    }

    const date = paymentDate ? new Date(paymentDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findUnique({
        where: { id: debtId },
        include: { party: true },
      });

      if (!debt) {
        throw new Error("DEBT_NOT_FOUND");
      }

      if (debt.status === "SETTLED" || debt.remainingAmount <= 0) {
        throw new Error("DEBT_ALREADY_SETTLED");
      }

      if (numAmount > debt.remainingAmount) {
        throw new Error(`OVERPAYMENT:Payment amount (₹${numAmount}) exceeds remaining balance of ₹${debt.remainingAmount}`);
      }

      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      // If paying back borrowed money, ensure account has sufficient funds
      if (debt.type === "BORROWED" && account.type !== "CREDIT_CARD" && account.currentBalance < numAmount) {
        throw new Error(`INSUFFICIENT_FUNDS:Insufficient balance in ${account.name}. Available: ₹${account.currentBalance}`);
      }

      const newRemaining = Math.max(0, debt.remainingAmount - numAmount);
      const newStatus = newRemaining === 0 ? "SETTLED" : "PARTIALLY_PAID";

      // 1. Create Transaction for Settlement
      const settlementTx = await tx.transaction.create({
        data: {
          userId: user.id,
          accountId,
          partyId: debt.partyId,
          debtId: debt.id,
          type: "SETTLEMENT",
          amount: numAmount,
          transactionDate: date,
          notes:
            notes ||
            (debt.type === "LENT"
              ? `Repayment received from ${debt.party.name}`
              : `Debt repayment made to ${debt.party.name}`),
        },
      });

      // 2. Create DebtSettlement record
      const settlement = await tx.debtSettlement.create({
        data: {
          debtId: debt.id,
          transactionId: settlementTx.id,
          amountPaid: numAmount,
          paymentDate: date,
          notes: notes || null,
        },
      });

      // 3. Update Debt remainingAmount and status
      await tx.debt.update({
        where: { id: debt.id },
        data: {
          remainingAmount: newRemaining,
          status: newStatus,
        },
      });

      // 4. Update Account balance
      // If LENT: user receives money -> account balance increments (+)
      // If BORROWED: user pays money back -> account balance decrements (-)
      if (debt.type === "LENT") {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: numAmount } },
        });
      } else {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: numAmount } },
        });
      }

      return {
        ...settlement,
        remainingAmount: newRemaining,
        status: newStatus,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Debt settlement error:", error);
    const msg = error.message || "";
    if (msg === "DEBT_NOT_FOUND") {
      return NextResponse.json({ error: "Debt record not found" }, { status: 404 });
    }
    if (msg === "DEBT_ALREADY_SETTLED") {
      return NextResponse.json({ error: "This debt is already fully settled" }, { status: 400 });
    }
    if (msg.startsWith("OVERPAYMENT:")) {
      return NextResponse.json({ error: msg.replace("OVERPAYMENT:", "") }, { status: 400 });
    }
    if (msg === "ACCOUNT_NOT_FOUND") {
      return NextResponse.json({ error: "Selected payment account not found" }, { status: 404 });
    }
    if (msg.startsWith("INSUFFICIENT_FUNDS:")) {
      return NextResponse.json({ error: msg.replace("INSUFFICIENT_FUNDS:", "") }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to process settlement" }, { status: 500 });
  }
}

