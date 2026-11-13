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
    const reportType = searchParams.get("reportType") || searchParams.get("interval") || "monthly_expenses";
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

    // 3. Fetch Debts with relations
    const debtWhere: any = { userId: user.id };
    if (dateFilter.gte) debtWhere.createdAt = dateFilter;

    const allDebts = await prisma.debt.findMany({
      where: debtWhere,
      include: {
        party: true,
        settlements: {
          include: { transaction: { include: { account: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // 4. Fetch Debt Settlements (Paid History)
    const settlementWhere: any = {
      debt: { userId: user.id },
    };
    if (dateFilter.gte) {
      settlementWhere.paymentDate = dateFilter;
    }

    const settlements = await prisma.debtSettlement.findMany({
      where: settlementWhere,
      include: {
        debt: { include: { party: true } },
        transaction: { include: { account: true } },
      },
      orderBy: { paymentDate: "desc" },
    });

    // Compute Overall Summary Metrics
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

    const pendingPayables = allDebts.filter((d) => d.type === "BORROWED" && d.status !== "SETTLED");
    const totalPendingPayables = pendingPayables.reduce((sum, d) => sum + d.remainingAmount, 0);

    const weeklyPayables = allDebts.filter(
      (d) => d.type === "BORROWED" && (d.frequency === "WEEKLY" || d.notes?.toLowerCase().includes("week"))
    );
    const totalWeeklyPayables = weeklyPayables.reduce((sum, d) => sum + d.remainingAmount, 0);

    const monthlyPayables = allDebts.filter(
      (d) => d.type === "BORROWED" && (d.frequency === "MONTHLY" || d.notes?.toLowerCase().includes("month"))
    );
    const totalMonthlyPayables = monthlyPayables.reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalSettlementsPaid = settlements.reduce((sum, s) => sum + s.amountPaid, 0);

    // Multi-Interval Chart Generation
    const timeSeriesData: Array<{
      label: string;
      labelTe: string;
      income: number;
      expense: number;
      net: number;
    }> = [];

    // Monthly data points
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

    // Category Expense Breakdown
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

    return NextResponse.json({
      reportType,
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        totalReceived,
        totalPaid: totalPaid + totalSettlementsPaid,
        totalPendingPayables,
        totalWeeklyPayables,
        totalMonthlyPayables,
        totalSettlementsPaid,
        settlementCount: settlements.length,
        transactionCount: transactions.length,
        debtCount: allDebts.length,
      },
      timeSeriesData,
      categoryExpenses,
      transactions,
      pendingPayables,
      weeklyPayables,
      monthlyPayables,
      settlements,
      allDebts,
    });
  } catch (error: any) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
