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
    const reportType = searchParams.get("reportType") || searchParams.get("interval") || "monthly";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const categoryId = searchParams.get("categoryId");

    const now = new Date();

    // 1. Determine Date Filter
    let dateFilter: any = {};
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    }

    // 2. Fetch all matching transactions with relations
    const txWhere: any = { userId: user.id };
    if (dateFilter.gte) txWhere.transactionDate = dateFilter;
    if (categoryId && categoryId !== "all") txWhere.categoryId = categoryId;

    const transactions = await prisma.transaction.findMany({
      where: txWhere,
      include: {
        category: true,
        account: true,
        party: true,
        debt: { include: { party: true } },
      },
      orderBy: { transactionDate: "desc" },
    });

    // 3. Compute High-Level Summary Metrics
    let totalIncome = 0;
    let totalExpense = 0;
    let totalReceived = 0;
    let totalPaid = 0;

    transactions.forEach((t) => {
      if (t.type === "INCOME") totalIncome += t.amount;
      else if (t.type === "EXPENSE") totalExpense += t.amount;
      else if (t.type === "RECEIVABLE_COLLECTED" || t.type === "BORROW") totalReceived += t.amount;
      else if (t.type === "PAYABLE_PAID" || t.type === "LEND") totalPaid += t.amount;
      else if (t.type === "SETTLEMENT") {
        if (t.debt?.type === "LENT") totalReceived += t.amount;
        else if (t.debt?.type === "BORROWED") totalPaid += t.amount;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    // 4. Fetch Debts (for Pending Payment / Received Payment reports)
    const allDebts = await prisma.debt.findMany({
      where: { userId: user.id },
      include: {
        party: true,
        settlements: {
          include: { transaction: { include: { account: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const pendingPayables = allDebts.filter((d) => d.type === "BORROWED" && d.status !== "SETTLED");
    const totalPendingPayables = pendingPayables.reduce((sum, d) => sum + d.remainingAmount, 0);

    const pendingReceivables = allDebts.filter((d) => d.type === "LENT" && d.status !== "SETTLED");
    const totalPendingReceivables = pendingReceivables.reduce((sum, d) => sum + d.remainingAmount, 0);

    // 5. Fetch Savings Goals (for Savings report)
    const savingsGoals = await prisma.savingsGoal.findMany({
      where: { userId: user.id },
      include: {
        contributions: {
          include: { account: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { targetDate: "asc" },
    });

    const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSavingsAccumulated = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);

    // 6. Multi-Interval Series Data Generation
    const timeSeriesData: Array<{
      label: string;
      labelTe: string;
      income: number;
      expense: number;
      net: number;
    }> = [];

    if (reportType === "daily") {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

        const txs = transactions.filter((t) => {
          const tDate = new Date(t.transactionDate);
          return tDate >= dayStart && tDate <= dayEnd;
        });

        const inc = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
        const exp = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

        timeSeriesData.push({
          label: `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`,
          labelTe: `${d.getDate()} ${d.toLocaleString("te-IN", { month: "short" })}`,
          income: inc,
          expense: exp,
          net: inc - exp,
        });
      }
    } else if (reportType === "weekly") {
      // Last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        const txs = transactions.filter((t) => {
          const tDate = new Date(t.transactionDate);
          return tDate >= weekStart && tDate <= weekEnd;
        });

        const inc = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
        const exp = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

        timeSeriesData.push({
          label: `W-${12 - i} (${weekStart.getDate()} ${weekStart.toLocaleString("en-US", { month: "short" })})`,
          labelTe: `వారం-${12 - i} (${weekStart.getDate()} ${weekStart.toLocaleString("te-IN", { month: "short" })})`,
          income: inc,
          expense: exp,
          net: inc - exp,
        });
      }
    } else if (reportType === "yearly") {
      // Past 5 years
      const currentYear = now.getFullYear();
      for (let y = currentYear - 4; y <= currentYear; y++) {
        const yStart = new Date(y, 0, 1);
        const yEnd = new Date(y, 11, 31, 23, 59, 59);

        const txs = transactions.filter((t) => {
          const tDate = new Date(t.transactionDate);
          return tDate >= yStart && tDate <= yEnd;
        });

        const inc = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
        const exp = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

        timeSeriesData.push({
          label: `${y}`,
          labelTe: `${y} సం.`,
          income: inc,
          expense: exp,
          net: inc - exp,
        });
      }
    } else {
      // Default: Monthly (Last 12 months)
      for (let i = 11; i >= 0; i--) {
        const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1, 0, 0, 0);
        const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59);

        const txs = transactions.filter((t) => {
          const tDate = new Date(t.transactionDate);
          return tDate >= mStart && tDate <= mEnd;
        });

        const inc = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
        const exp = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

        timeSeriesData.push({
          label: mDate.toLocaleString("en-US", { month: "short", year: "2-digit" }),
          labelTe: mDate.toLocaleString("te-IN", { month: "short", year: "2-digit" }),
          income: inc,
          expense: exp,
          net: inc - exp,
        });
      }
    }

    // 7. Category Expense Breakdown
    const categoryExpenseMap: Record<string, { id: string; nameEn: string; nameTe: string; color: string; amount: number; count: number }> = {};
    transactions
      .filter((t) => t.type === "EXPENSE" && t.category)
      .forEach((t) => {
        const id = t.categoryId || "other";
        if (!categoryExpenseMap[id]) {
          categoryExpenseMap[id] = {
            id,
            nameEn: t.category?.nameEn || "Other",
            nameTe: t.category?.nameTe || "ఇతర",
            color: t.category?.color || "#64748B",
            amount: 0,
            count: 0,
          };
        }
        categoryExpenseMap[id].amount += t.amount;
        categoryExpenseMap[id].count += 1;
      });

    const categoryExpenses = Object.values(categoryExpenseMap)
      .map((cat) => ({
        ...cat,
        percentage: totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 8. Category Income Breakdown
    const categoryIncomeMap: Record<string, { id: string; nameEn: string; nameTe: string; color: string; amount: number; count: number }> = {};
    transactions
      .filter((t) => t.type === "INCOME" && t.category)
      .forEach((t) => {
        const id = t.categoryId || "other";
        if (!categoryIncomeMap[id]) {
          categoryIncomeMap[id] = {
            id,
            nameEn: t.category?.nameEn || "Other",
            nameTe: t.category?.nameTe || "ఇతర",
            color: t.category?.color || "#10B981",
            amount: 0,
            count: 0,
          };
        }
        categoryIncomeMap[id].amount += t.amount;
        categoryIncomeMap[id].count += 1;
      });

    const categoryIncomes = Object.values(categoryIncomeMap)
      .map((cat) => ({
        ...cat,
        percentage: totalIncome > 0 ? Math.round((cat.amount / totalIncome) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        totalReceived,
        totalPaid,
        totalPendingPayables,
        totalPendingReceivables,
        totalSavingsTarget,
        totalSavingsAccumulated,
        transactionCount: transactions.length,
      },
      timeSeriesData,
      categoryExpenses,
      categoryIncomes,
      transactions,
      pendingPayables,
      pendingReceivables,
      savingsGoals,
    });
  } catch (error: any) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
