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
    const { goalId, accountId, amount, notes } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Valid contribution amount required" }, { status: 400 });
    }

    if (!goalId || !accountId) {
      return NextResponse.json({ error: "Goal and Account are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findUnique({ where: { id: goalId } });
      if (!goal) {
        throw new Error("GOAL_NOT_FOUND");
      }

      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      if (account.type !== "CREDIT_CARD" && account.currentBalance < numAmount) {
        throw new Error(`INSUFFICIENT_FUNDS:Insufficient balance in ${account.name}. Available: ₹${account.currentBalance}`);
      }

      // 1. Create Savings Contribution
      const contribution = await tx.savingsContribution.create({
        data: {
          goalId,
          accountId,
          amount: numAmount,
          notes: notes || null,
        },
      });

      // 2. Increment goal currentAmount
      const updatedGoal = await tx.savingsGoal.update({
        where: { id: goalId },
        data: {
          currentAmount: { increment: numAmount },
        },
      });

      // Check if completed
      if (updatedGoal.currentAmount >= updatedGoal.targetAmount) {
        await tx.savingsGoal.update({
          where: { id: goalId },
          data: { isCompleted: true },
        });
      }

      // 3. Decrement from source account
      await tx.account.update({
        where: { id: accountId },
        data: {
          currentBalance: { decrement: numAmount },
        },
      });

      return contribution;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Savings contribute error:", error);
    const msg = error.message || "";
    if (msg === "GOAL_NOT_FOUND") {
      return NextResponse.json({ error: "Savings goal not found" }, { status: 404 });
    }
    if (msg === "ACCOUNT_NOT_FOUND") {
      return NextResponse.json({ error: "Source account not found" }, { status: 404 });
    }
    if (msg.startsWith("INSUFFICIENT_FUNDS:")) {
      return NextResponse.json({ error: msg.replace("INSUFFICIENT_FUNDS:", "") }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to add funds to savings goal" }, { status: 500 });
  }
}

