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
    const { fromAccountId, toAccountId, amount, notes, date } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Invalid transfer amount" }, { status: 400 });
    }

    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      return NextResponse.json({ error: "Select distinct source and destination accounts" }, { status: 400 });
    }

    const txDate = date ? new Date(date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const fromAccount = await tx.account.findUnique({ where: { id: fromAccountId } });
      const toAccount = await tx.account.findUnique({ where: { id: toAccountId } });

      if (!fromAccount || !toAccount) {
        throw new Error("ACCOUNTS_NOT_FOUND");
      }

      if (fromAccount.type !== "CREDIT_CARD" && fromAccount.currentBalance < numAmount) {
        throw new Error(`INSUFFICIENT_FUNDS:Insufficient balance in ${fromAccount.name}. Available: ₹${fromAccount.currentBalance}`);
      }

      // 1. Create Transfer Transaction
      const transferTx = await tx.transaction.create({
        data: {
          userId: user.id,
          accountId: fromAccountId,
          toAccountId: toAccountId,
          type: "TRANSFER",
          amount: numAmount,
          transactionDate: txDate,
          notes: notes || "Account transfer",
        },
      });

      // 2. Decrement from source
      await tx.account.update({
        where: { id: fromAccountId },
        data: { currentBalance: { decrement: numAmount } },
      });

      // 3. Increment to destination
      await tx.account.update({
        where: { id: toAccountId },
        data: { currentBalance: { increment: numAmount } },
      });

      return transferTx;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Transfer error:", error);
    const msg = error.message || "";
    if (msg === "ACCOUNTS_NOT_FOUND") {
      return NextResponse.json({ error: "One or both selected accounts not found" }, { status: 404 });
    }
    if (msg.startsWith("INSUFFICIENT_FUNDS:")) {
      return NextResponse.json({ error: msg.replace("INSUFFICIENT_FUNDS:", "") }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to transfer funds" }, { status: 500 });
  }
}

