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

    // 1. Fetch Accounts
    const accounts = await prisma.account.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    const liquidBalance = accounts.reduce((sum, acc) => {
      if (acc.type === "CREDIT_CARD") return sum;
      return sum + acc.currentBalance;
    }, 0);

    const creditCardOutstanding = accounts
      .filter((acc) => acc.type === "CREDIT_CARD")
      .reduce((sum, acc) => sum + Math.abs(acc.currentBalance), 0);

    // 2. Fetch Debts (Receivables & Payables)
    const debts = await prisma.debt.findMany({
      where: { userId: user.id },
      include: {
        party: true,
        settlements: {
          include: {
            transaction: { select: { account: true, transactionDate: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const pendingReceivables = debts
      .filter((d) => d.type === "LENT" && d.status !== "SETTLED")
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const pendingPayables = debts
      .filter((d) => d.type === "BORROWED" && d.status !== "SETTLED")
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    // Net worth = Liquid Balance + Pending Receivables - Pending Payables - Credit Card Outstanding
    const netWorth = liquidBalance + pendingReceivables - pendingPayables - creditCardOutstanding;

    // 3. Fetch All Transactions for Aggregations
    const allTransactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: {
        account: { select: { id: true, name: true, color: true, type: true } },
        toAccount: { select: { id: true, name: true } },
        category: { select: { id: true, nameEn: true, nameTe: true, color: true, icon: true } },
        party: { select: { id: true, name: true } },
        debt: { select: { id: true, type: true } },
      },
      orderBy: { transactionDate: "desc" },
    });

    // All-time Metrics
    let totalIncomeAllTime = 0;
    let totalExpensesAllTime = 0;
    let totalReceivedMoney = 0;
    let totalPaidMoney = 0;

    allTransactions.forEach((t) => {
      if (t.type === "INCOME") {
        totalIncomeAllTime += t.amount;
      } else if (t.type === "EXPENSE") {
        totalExpensesAllTime += t.amount;
      } else if (t.type === "RECEIVABLE_COLLECTED" || t.type === "BORROW") {
        totalReceivedMoney += t.amount;
      } else if (t.type === "PAYABLE_PAID" || t.type === "LEND") {
        totalPaidMoney += t.amount;
      } else if (t.type === "SETTLEMENT") {
        if (t.debt?.type === "LENT") {
          totalReceivedMoney += t.amount;
        } else if (t.debt?.type === "BORROWED") {
          totalPaidMoney += t.amount;
        }
      }
    });

    // 4. Time Intervals for Daily, Weekly, and Monthly Summaries
    // Daily (Today 00:00:00 to 23:59:59)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Weekly (Sunday of current week 00:00:00 to now)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    // Monthly (1st of month to end of month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const computeSummary = (from: Date, to: Date) => {
      const filtered = allTransactions.filter((t) => {
        const txDate = new Date(t.transactionDate);
        return txDate >= from && txDate <= to;
      });

      let income = 0;
      let expenses = 0;
      let received = 0;
      let paid = 0;

      filtered.forEach((t) => {
        if (t.type === "INCOME") income += t.amount;
        else if (t.type === "EXPENSE") expenses += t.amount;
        else if (t.type === "RECEIVABLE_COLLECTED" || t.type === "BORROW") received += t.amount;
        else if (t.type === "PAYABLE_PAID" || t.type === "LEND") paid += t.amount;
        else if (t.type === "SETTLEMENT") {
          if (t.debt?.type === "LENT") received += t.amount;
          else if (t.debt?.type === "BORROWED") paid += t.amount;
        }
      });

      return {
        income,
        expenses,
        received,
        paid,
        netInflow: income + received,
        netOutflow: expenses + paid,
        netSavings: income - expenses,
        netCashFlow: income + received - (expenses + paid),
        txCount: filtered.length,
      };
    };

    const dailySummary = computeSummary(startOfToday, endOfToday);
    const weeklySummary = computeSummary(startOfWeek, now);
    const monthlySummary = computeSummary(startOfMonth, endOfMonth);

    // Monthly savings rate
    const monthlySavings = monthlySummary.netSavings;
    const monthlySavingsRate =
      monthlySummary.income > 0
        ? Math.round((monthlySavings / monthlySummary.income) * 100)
        : 0;

    // 5. Chart 1: Income vs Expenses Interactive Timeframes
    // A) Daily (Last 7 days)
    const dailyChartData = [];
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now);
      dayDate.setDate(now.getDate() - i);
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
      const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59);

      const dayTxs = allTransactions.filter((t) => {
        const d = new Date(t.transactionDate);
        return d >= dayStart && d <= dayEnd;
      });

      const inc = dayTxs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
      const exp = dayTxs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

      dailyChartData.push({
        label: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
        date: dayDate.toISOString().split("T")[0],
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }

    // B) Weekly (Last 4 weeks)
    const weeklyChartData = [];
    for (let i = 3; i >= 0; i--) {
      const wEnd = new Date(now);
      wEnd.setDate(now.getDate() - i * 7);
      const wStart = new Date(wEnd);
      wStart.setDate(wEnd.getDate() - 6);
      wStart.setHours(0, 0, 0, 0);
      wEnd.setHours(23, 59, 59, 999);

      const wTxs = allTransactions.filter((t) => {
        const d = new Date(t.transactionDate);
        return d >= wStart && d <= wEnd;
      });

      const inc = wTxs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
      const exp = wTxs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

      weeklyChartData.push({
        label: `Wk ${4 - i}`,
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }

    // C) Monthly (Last 6 months)
    const monthlyChartData = [];
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1, 0, 0, 0);
      const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59);

      const mTxs = allTransactions.filter((t) => {
        const d = new Date(t.transactionDate);
        return d >= mStart && d <= mEnd;
      });

      const inc = mTxs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
      const exp = mTxs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
      const rec = mTxs
        .filter((t) => t.type === "RECEIVABLE_COLLECTED" || t.type === "BORROW" || (t.type === "SETTLEMENT" && t.debt?.type === "LENT"))
        .reduce((s, t) => s + t.amount, 0);
      const pd = mTxs
        .filter((t) => t.type === "PAYABLE_PAID" || t.type === "LEND" || (t.type === "SETTLEMENT" && t.debt?.type === "BORROWED"))
        .reduce((s, t) => s + t.amount, 0);

      monthlyChartData.push({
        label: mDate.toLocaleString("en-US", { month: "short" }),
        monthEn: mDate.toLocaleString("en-US", { month: "short" }),
        monthTe: mDate.toLocaleString("te-IN", { month: "short" }),
        year: mDate.getFullYear(),
        income: inc,
        expense: exp,
        savings: inc - exp,
        received: rec,
        paid: pd,
        net: inc - exp,
      });
    }

    // 6. Chart 3: Category-wise Expense Breakdown
    // Computes from all actual expense transactions (or current month expenses)
    const categorySpendMap: Record<string, { id: string; nameEn: string; nameTe: string; color: string; amount: number }> = {};
    const monthlyExpensesTxs = allTransactions.filter((t) => {
      const d = new Date(t.transactionDate);
      return t.type === "EXPENSE" && d >= startOfMonth && d <= endOfMonth;
    });

    // Fallback to all-time expense if current month has low activity
    const expenseSource = monthlyExpensesTxs.length > 0
      ? monthlyExpensesTxs
      : allTransactions.filter((t) => t.type === "EXPENSE");

    expenseSource.forEach((t) => {
      const catId = t.categoryId || "other";
      const catNameEn = t.category?.nameEn || "Other";
      const catNameTe = t.category?.nameTe || "ఇతర";
      const color = t.category?.color || "#64748B";

      if (!categorySpendMap[catId]) {
        categorySpendMap[catId] = {
          id: catId,
          nameEn: catNameEn,
          nameTe: catNameTe,
          color,
          amount: 0,
        };
      }
      categorySpendMap[catId].amount += t.amount;
    });

    const totalCategorySpent = Object.values(categorySpendMap).reduce((s, c) => s + c.amount, 0);
    const categoryBreakdown = Object.values(categorySpendMap)
      .map((cat) => ({
        ...cat,
        percentage: totalCategorySpent > 0 ? Math.round((cat.amount / totalCategorySpent) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 7. Chart 4: Paid vs Received & Debts Distribution
    const paidVsReceivedChart = [
      {
        category: "Total Cash Flow",
        categoryTe: "మొత్తం నగదు ప్రవాహం",
        Received: totalReceivedMoney,
        Paid: totalPaidMoney,
      },
      {
        category: "Pending Dues",
        categoryTe: "రావాల్సిన/చెల్లించాల్సిన బకాయిలు",
        Received: pendingReceivables,
        Paid: pendingPayables,
      },
    ];

    // 8. Chart 5: Account-wise Balances
    const accountBalancesChart = accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      balance: acc.currentBalance,
      color: acc.color || "#3B82F6",
      accountNumber: acc.accountNumber,
    }));

    // 9. Budgets Health
    const budgets = await prisma.budget.findMany({
      where: {
        userId: user.id,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { category: true },
    });

    const budgetStatus = budgets.map((b) => {
      const spent = categorySpendMap[b.categoryId]?.amount || 0;
      const pct = Math.round((spent / b.amountLimit) * 100);
      return {
        id: b.id,
        categoryNameEn: b.category.nameEn,
        categoryNameTe: b.category.nameTe,
        color: b.category.color,
        amountLimit: b.amountLimit,
        spentAmount: spent,
        percentage: pct,
        isOver: pct >= 100,
        isWarning: pct >= b.alertThresholdPct,
      };
    });

    // 10. Urgent Reminders (Debts due soon or overdue)
    const urgentReminders = debts
      .filter((d) => d.status !== "SETTLED" && d.dueDate)
      .map((d) => {
        const dueDate = new Date(d.dueDate!);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: d.id,
          type: d.type,
          partyName: d.party.name,
          partyId: d.partyId,
          remainingAmount: d.remainingAmount,
          dueDate: d.dueDate,
          diffDays,
          isOverdue: diffDays < 0,
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 5);

    // 11. Recent Transactions (last 10)
    const recentTransactions = allTransactions.slice(0, 10);

    return NextResponse.json({
      summary: {
        netWorth,
        availableBalance: liquidBalance,
        totalIncome: monthlySummary.income,
        totalIncomeAllTime,
        totalExpenses: monthlySummary.expenses,
        totalExpensesAllTime,
        totalReceivedMoney,
        totalPaidMoney,
        pendingReceivables,
        pendingPayables,
        monthlySavings,
        monthlySavingsRate,
        creditCardOutstanding,
      },
      summaries: {
        daily: dailySummary,
        weekly: weeklySummary,
        monthly: monthlySummary,
      },
      charts: {
        daily: dailyChartData,
        weekly: weeklyChartData,
        monthly: monthlyChartData,
        categoryBreakdown,
        paidVsReceived: paidVsReceivedChart,
        accountBalances: accountBalancesChart,
      },
      accounts,
      recentTransactions,
      budgetStatus,
      urgentReminders,
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
