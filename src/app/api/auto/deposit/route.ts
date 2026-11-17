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
    const {
      amount,
      accountId,
      date,
      paymentMethod = "CASH",
      notes,
    } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Please enter a valid amount to deposit" }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: "Please select an account to deposit into" }, { status: 400 });
    }

    const txDate = date ? new Date(date) : new Date();

    // Find or create "Auto Rickshaw Business" party
    let party = await prisma.party.findFirst({
      where: { userId: user.id, name: "Auto Rickshaw Earnings" },
    });
    if (!party) {
      party = await prisma.party.create({
        data: {
          userId: user.id,
          name: "Auto Rickshaw Earnings",
          notes: "Daily rides and auto business income",
        },
      });
    }

    // Find or create "Business & Freelance" or "Auto Business" category
    let category = await prisma.category.findFirst({
      where: {
        userId: user.id,
        nameEn: { in: ["Freelance & Business", "Auto Business", "Business Income"] },
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Credit account
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: numAmount } },
      });

      // 2. Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          accountId,
          partyId: party.id,
          categoryId: category?.id || null,
          type: "INCOME",
          amount: numAmount,
          paymentMethod: paymentMethod || "CASH",
          transactionDate: txDate,
          title: "Auto Rickshaw Daily Earnings",
          notes: notes || `Auto daily net earnings deposited on ${txDate.toISOString().split("T")[0]}`,
        },
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      transaction: result,
      message: "Auto net earnings successfully deposited into your account and recorded in Received Money!",
    });
  } catch (error: any) {
    console.error("POST /api/auto/deposit error:", error);
    return NextResponse.json({ error: error.message || "Failed to deposit auto earnings" }, { status: 500 });
  }
}
