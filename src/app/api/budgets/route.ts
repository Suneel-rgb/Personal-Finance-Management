import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function GET() {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fetch all active budgets
    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    });

    // Fetch this month's expenses for all categories
    const monthlyExpenses = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: "EXPENSE",
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
        categoryId: { not: null },
      },
      select: {
        categoryId: true,
        amount: true,
      },
    });

    const categorySpend: Record<string, number> = {};
    monthlyExpenses.forEach((t) => {
      if (t.categoryId) {
        categorySpend[t.categoryId] = (categorySpend[t.categoryId] || 0) + t.amount;
      }
    });

    const daysInMonth = endOfMonth.getDate();
    const currentDay = now.getDate();

    const result = budgets.map((b) => {
      const spent = categorySpend[b.categoryId] || 0;
      const remaining = Math.max(0, b.amountLimit - spent);
      const percentage = Math.round((spent / b.amountLimit) * 100);

      // Pacing calculation
      const dailySpend = currentDay > 0 ? spent / currentDay : 0;
      const projectedSpend = Math.round(dailySpend * daysInMonth);

      return {
        id: b.id,
        categoryId: b.categoryId,
        category: b.category,
        period: b.period,
        amountLimit: b.amountLimit,
        alertThresholdPct: b.alertThresholdPct,
        spentAmount: spent,
        remainingAmount: remaining,
        percentage,
        isOverBudget: spent > b.amountLimit,
        isWarning: percentage >= b.alertThresholdPct,
        projectedSpend,
        startDate: b.startDate,
        endDate: b.endDate,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Budgets GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch budgets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { categoryId, amountLimit, alertThresholdPct } = body;

    const limit = parseFloat(amountLimit);
    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json({ error: "Please enter a valid limit" }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Upsert budget for current month
    const existing = await prisma.budget.findFirst({
      where: {
        userId: user.id,
        categoryId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    let budget;
    if (existing) {
      budget = await prisma.budget.update({
        where: { id: existing.id },
        data: {
          amountLimit: limit,
          alertThresholdPct: alertThresholdPct ? parseInt(alertThresholdPct) : 80,
        },
        include: { category: true },
      });
    } else {
      budget = await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId,
          period: "MONTHLY",
          amountLimit: limit,
          alertThresholdPct: alertThresholdPct ? parseInt(alertThresholdPct) : 80,
          startDate: startOfMonth,
          endDate: endOfMonth,
        },
        include: { category: true },
      });
    }

    return NextResponse.json(budget, { status: 201 });
  } catch (error: any) {
    console.error("Budgets POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to set budget" }, { status: 500 });
  }
}

