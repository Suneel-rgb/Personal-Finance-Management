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
    const period = searchParams.get("period") || "all";
    const type = searchParams.get("type");
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const where: any = { userId: user.id };

    // Period filter
    const now = new Date();
    if (period === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      where.transactionDate = { gte: startOfDay, lte: endOfDay };
    } else if (period === "week") {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      where.transactionDate = { gte: startOfWeek, lte: now };
    } else if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      where.transactionDate = { gte: startOfMonth, lte: endOfMonth };
    } else if (period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      where.transactionDate = { gte: startOfYear, lte: endOfYear };
    }

    if (type && type !== "all") {
      where.type = type;
    }

    if (accountId && accountId !== "all") {
      where.OR = [{ accountId: accountId }, { toAccountId: accountId }];
    }

    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId;
    }

    if (search) {
      where.notes = { contains: search };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, color: true } },
        toAccount: { select: { id: true, name: true } },
        category: { select: { id: true, nameEn: true, nameTe: true, color: true, icon: true } },
        party: { select: { id: true, name: true } },
      },
      orderBy: { transactionDate: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error("Transactions GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch transactions" }, { status: 500 });
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
      accountId,
      toAccountId,
      categoryId,
      partyId,
      type,
      amount,
      paymentMethod,
      transactionDate,
      notes,
      dueDate, // for LEND or BORROW
    } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Please enter a valid amount greater than 0" }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: "Account is required" }, { status: 400 });
    }

    if (type === "TRANSFER" && (!toAccountId || accountId === toAccountId)) {
      return NextResponse.json({ error: "Transfer requires different source and destination accounts" }, { status: 400 });
    }

    const date = transactionDate ? new Date(transactionDate) : new Date();

    // Use Prisma Transaction to guarantee balance integrity
    const result = await prisma.$transaction(async (tx) => {
      let createdDebtId: string | null = null;

      // If LEND or BORROW, create corresponding Debt record
      if ((type === "LEND" || type === "BORROW") && partyId) {
        const debtType = type === "LEND" ? "LENT" : "BORROWED";
        const newDebt = await tx.debt.create({
          data: {
            userId: user.id,
            partyId,
            type: debtType,
            originalAmount: numAmount,
            remainingAmount: numAmount,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: "PENDING",
            notes: notes || (type === "LEND" ? "Money lent" : "Money borrowed"),
          },
        });
        createdDebtId = newDebt.id;
      }

      // Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          accountId,
          toAccountId: type === "TRANSFER" ? toAccountId : null,
          categoryId: categoryId || null,
          partyId: partyId || null,
          debtId: createdDebtId,
          type,
          amount: numAmount,
          paymentMethod: paymentMethod || "UPI",
          transactionDate: date,
          notes: notes || null,
        },
        include: {
          account: true,
          toAccount: true,
          category: true,
          party: true,
        },
      });

      // Update Balances
      if (type === "INCOME" || type === "BORROW") {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: numAmount } },
        });
      } else if (type === "EXPENSE" || type === "LEND") {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: numAmount } },
        });
      } else if (type === "TRANSFER" && toAccountId) {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: numAmount } },
        });
        await tx.account.update({
          where: { id: toAccountId },
          data: { currentBalance: { increment: numAmount } },
        });
      }

      return transaction;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Transactions POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create transaction" }, { status: 500 });
  }
}

