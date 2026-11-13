"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Clock,
  AlertCircle,
  Building2,
  Banknote,
  CreditCard,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  ArrowRight,
  Sparkles,
  Search,
  Check,
  ShieldAlert,
  Download,
  Send,
  PieChart as PieIcon,
  BarChart3,
  Activity,
  PlusCircle,
  Eye,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RecordFormModal } from "@/components/modals/RecordFormModal";
import { TransactionDetailModal } from "@/components/modals/TransactionDetailModal";
import { SettleDebtModal } from "@/components/modals/SettleDebtModal";

export default function DashboardPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Live Database State
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Timeframe and view toggles
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [summaryPeriod, setSummaryPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [incomeMode, setIncomeMode] = useState<"month" | "all">("month");
  const [expenseMode, setExpenseMode] = useState<"month" | "all">("month");
  const [debtTab, setDebtTab] = useState<"RECEIVABLE" | "PAYABLE">("RECEIVABLE");
  const [txFilter, setTxFilter] = useState<"ALL" | "INCOME" | "EXPENSE" | "TRANSFER">("ALL");
  const [txSearch, setTxSearch] = useState("");

  // Modal States
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordModalType, setRecordModalType] = useState<"INCOME" | "EXPENSE" | "LEND" | "BORROW">("INCOME");
  const [viewingTx, setViewingTx] = useState<any | null>(null);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [settlingDebt, setSettlingDebt] = useState<any | null>(null);

  // Fetch live dashboard data from API
  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Event listener for automated real-time updates when any transaction/debt is added, edited, or deleted
    const handleDataChanged = () => {
      fetchDashboardData();
    };

    window.addEventListener("finance_data_changed", handleDataChanged);
    return () => window.removeEventListener("finance_data_changed", handleDataChanged);
  }, []);

  const summary = data?.summary || {
    netWorth: 0,
    availableBalance: 0,
    totalIncome: 0,
    totalIncomeAllTime: 0,
    totalExpenses: 0,
    totalExpensesAllTime: 0,
    totalReceivedMoney: 0,
    totalPaidMoney: 0,
    pendingReceivables: 0,
    pendingPayables: 0,
    monthlySavings: 0,
    monthlySavingsRate: 0,
  };

  const summaries = data?.summaries || {
    daily: { income: 0, expenses: 0, received: 0, paid: 0, netCashFlow: 0, txCount: 0 },
    weekly: { income: 0, expenses: 0, received: 0, paid: 0, netCashFlow: 0, txCount: 0 },
    monthly: { income: 0, expenses: 0, received: 0, paid: 0, netCashFlow: 0, txCount: 0 },
  };

  const activeSummary = summaries[summaryPeriod];

  // Income vs Expenses Chart data based on selected timeframe
  const activeChartData = useMemo(() => {
    if (!data?.charts) return [];
    return data.charts[timeframe] || [];
  }, [data, timeframe]);

  // Filtered Recent Transactions
  const filteredTransactions = useMemo(() => {
    if (!data?.recentTransactions) return [];
    return data.recentTransactions.filter((tx: any) => {
      if (txFilter === "INCOME") {
        if (tx.type !== "INCOME" && tx.type !== "RECEIVABLE_COLLECTED" && tx.type !== "BORROW")
          return false;
      } else if (txFilter === "EXPENSE") {
        if (tx.type !== "EXPENSE" && tx.type !== "PAYABLE_PAID" && tx.type !== "LEND")
          return false;
      } else if (txFilter === "TRANSFER") {
        if (tx.type !== "TRANSFER") return false;
      }

      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const matchesNote = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
        const matchesParty = tx.party?.name ? tx.party.name.toLowerCase().includes(q) : false;
        const matchesCat = tx.category?.nameEn ? tx.category.nameEn.toLowerCase().includes(q) : false;
        const matchesCatTe = tx.category?.nameTe ? tx.category.nameTe.toLowerCase().includes(q) : false;
        const matchesAcc = tx.account?.name ? tx.account.name.toLowerCase().includes(q) : false;
        return matchesNote || matchesParty || matchesCat || matchesCatTe || matchesAcc;
      }

      return true;
    });
  }, [data, txFilter, txSearch]);

  // Filtered Pending Debts (Reminders)
  const pendingDebtsList = useMemo(() => {
    if (!data?.urgentReminders) return [];
    const expectedType = debtTab === "RECEIVABLE" ? "LENT" : "BORROWED";
    return data.urgentReminders.filter((d: any) => d.type === expectedType);
  }, [data, debtTab]);

  const handleOpenAddRecord = (type: "INCOME" | "EXPENSE" | "LEND" | "BORROW") => {
    setRecordModalType(type);
    setRecordModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setViewingTx(null);
        fetchDashboardData();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. SaaS Hero Net Worth Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-950 text-white p-6 sm:p-8 border border-emerald-800/40 shadow-sm">
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md text-emerald-300 border border-white/15 text-xs font-semibold">
              <Sparkles size={13} className="text-emerald-400" />
              <span>
                {language === "te"
                  ? "ప్రత్యక్ష డేటాబేస్ ద్వారా ఆర్థిక నిర్వహణ"
                  : "Live Database Financial Engine"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t("dashboard.welcome")} 👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-normal leading-relaxed">
              {t("dashboard.subtitle")}
            </p>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => handleOpenAddRecord("INCOME")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>{t("dashboard.addIncome")}</span>
              </button>
              <button
                onClick={() => handleOpenAddRecord("EXPENSE")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>{t("dashboard.addExpense")}</span>
              </button>
              <button
                onClick={() => handleOpenAddRecord("LEND")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
              >
                <HandCoins size={14} />
                <span>{t("dashboard.recordDebt")}</span>
              </button>
            </div>
          </div>

          {/* Real Net Worth Card */}
          <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/80 rounded-2xl p-5 min-w-[280px] flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/90">
                {t("dashboard.netWorth")}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                <TrendingUp size={11} /> Live DB
              </span>
            </div>

            <div className="mt-3">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">
                {formatCurrency(summary.netWorth)}
              </span>
              <span className="text-[11px] text-slate-300 block mt-1">
                {t("dashboard.netWorthDesc")}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span>{t("dashboard.liquidBalance")}:</span>
              <strong className="text-white">{formatCurrency(summary.availableBalance)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards: Income, Expenses, Available Balance, Monthly Savings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income Card */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("dashboard.totalIncome")}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(
                  incomeMode === "month" ? summary.totalIncome : summary.totalIncomeAllTime
                )}
              </span>
              <button
                onClick={() => setIncomeMode(incomeMode === "month" ? "all" : "month")}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 cursor-pointer"
              >
                {incomeMode === "month"
                  ? language === "te"
                    ? "నెలవారీ"
                    : "Monthly"
                  : language === "te"
                  ? "మొత్తం"
                  : "All-Time"}
              </button>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-semibold flex items-center gap-1">
              <ArrowUpRight size={13} />
              <span>
                {language === "te" ? "వాస్తవ ఆదాయం క్రెడిట్స్" : "Verified income cash inflow"}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Total Expenses Card */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("dashboard.totalExpenses")}
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <TrendingDown size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(
                  expenseMode === "month" ? summary.totalExpenses : summary.totalExpensesAllTime
                )}
              </span>
              <button
                onClick={() => setExpenseMode(expenseMode === "month" ? "all" : "month")}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                {expenseMode === "month"
                  ? language === "te"
                    ? "నెలవారీ"
                    : "Monthly"
                  : language === "te"
                  ? "మొత్తం"
                  : "All-Time"}
              </button>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 font-semibold flex items-center gap-1">
              <ArrowDownRight size={13} />
              <span>
                {language === "te" ? "రోజువారీ & నెలవారీ ఖర్చులు" : "Daily & monthly outflow"}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Available Liquidity / Balance Card */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("dashboard.availableLiquidity")}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Wallet size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
              {formatCurrency(summary.availableBalance)}
            </span>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
              <span>
                {data?.accounts?.length || 0}{" "}
                {language === "te" ? "ఖాతాలలో నిల్వ" : "active accounts"}
              </span>
              <a href="/accounts" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                {language === "te" ? "వివరాలు" : "View"} &rarr;
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Savings Card */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("dashboard.monthlySavings")}
            </span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <Activity size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-black tracking-tight ${
                  summary.monthlySavings >= 0
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrency(summary.monthlySavings)}
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                {summary.monthlySavingsRate}% {t("dashboard.savingsRate")}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {language === "te"
                ? "ఈ నెల నికర పొదుపు మిగులు"
                : "Net cash retained after all expenses"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Debts & Lending Metrics: Received Money, Paid Money, Pending Receivables, Pending Payables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Received Money */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("dashboard.totalReceived")}
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Download size={16} />
              </div>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white block mt-2">
              {formatCurrency(summary.totalReceivedMoney)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {t("dashboard.totalReceivedDesc")}
          </p>
        </div>

        {/* Total Paid Money */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("dashboard.totalPaid")}
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Send size={16} />
              </div>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white block mt-2">
              {formatCurrency(summary.totalPaidMoney)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {t("dashboard.totalPaidDesc")}
          </p>
        </div>

        {/* Pending Receivables (Money to receive) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("dashboard.receivables")}
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <HandCoins size={16} />
              </div>
            </div>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block mt-2">
              {formatCurrency(summary.pendingReceivables)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className="text-slate-400 dark:text-slate-500">
              {language === "te" ? "రావాల్సిన బాకీలు" : "To collect from others"}
            </span>
            <a href="/pending-receivables" className="text-purple-600 dark:text-purple-400 font-bold hover:underline">
              {language === "te" ? "వసూలు చేయండి" : "Collect"} &rarr;
            </a>
          </div>
        </div>

        {/* Pending Payables (Money to pay) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("dashboard.payables")}
              </span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <Clock size={16} />
              </div>
            </div>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block mt-2">
              {formatCurrency(summary.pendingPayables)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className="text-slate-400 dark:text-slate-500">
              {language === "te" ? "చెల్లించాల్సిన అప్పులు" : "To pay to others"}
            </span>
            <a href="/pending-payments" className="text-rose-600 dark:text-rose-400 font-bold hover:underline">
              {language === "te" ? "చెల్లించండి" : "Pay Dues"} &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* 4. Financial Summary Tabs (Daily, Weekly, Monthly Summary) */}
      <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                {summaryPeriod === "daily"
                  ? t("dashboard.dailySummary")
                  : summaryPeriod === "weekly"
                  ? t("dashboard.weeklySummary")
                  : t("dashboard.monthlySummary")}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {summaryPeriod === "daily"
                ? language === "te"
                  ? "ఈరోజు నమోదు చేయబడిన పూర్తి ఆర్థిక లావాదేవీల సంక్షిప్త రూపం"
                  : "Real-time summary of today's financial transactions"
                : summaryPeriod === "weekly"
                ? language === "te"
                  ? "ఈ వారంలో నమోదైన మొత్తం రాబడి, ఖర్చులు మరియు నగదు ప్రవాహం"
                  : "This week's accumulated inflows, outflows, and net cash flow"
                : language === "te"
                ? "ఈ నెలలో నమోదైన మొత్తం ఆర్థిక గణాంకాలు"
                : "This month's consolidated financial statement"}
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
            {(["daily", "weekly", "monthly"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSummaryPeriod(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  summaryPeriod === period
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t(`dashboard.tabs.${period}`)}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 block">
                {language === "te" ? "రాబడి (Income)" : "Income Inflow"}
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                +{formatCurrency(activeSummary.income)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 block">
                {language === "te" ? "ఖర్చులు (Expenses)" : "Expenses Outflow"}
              </span>
              <span className="text-lg font-black text-rose-600 dark:text-rose-400 block mt-1">
                -{formatCurrency(activeSummary.expenses)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 block">
                {language === "te" ? "స్వీకరించినది" : "Money Received"}
              </span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400 block mt-1">
                +{formatCurrency(activeSummary.received)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 block">
                {language === "te" ? "చెల్లించినది" : "Money Paid"}
              </span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400 block mt-1">
                -{formatCurrency(activeSummary.paid)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 block">
                {language === "te" ? "నికర నగదు ప్రవాహం" : "Net Cash Flow"}
              </span>
              <span
                className={`text-lg font-black block mt-1 ${
                  activeSummary.netCashFlow >= 0
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {activeSummary.netCashFlow >= 0 ? "+" : ""}
                {formatCurrency(activeSummary.netCashFlow)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 block">
                {language === "te" ? "లావాదేవీల సంఖ్య" : "Transactions"}
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white block mt-1">
                {activeSummary.txCount}{" "}
                <span className="text-xs font-normal text-slate-400">
                  {language === "te" ? "నమోదులు" : "records"}
                </span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Interactive Charts Section (5 Live Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Income vs Expenses (Interactive Daily / Weekly / Monthly Switcher) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 size={17} className="text-emerald-600 dark:text-emerald-400" />
                <span>{t("dashboard.incomeVsExpenses")}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {language === "te"
                  ? "రాబడి మరియు ఖర్చుల సమగ్ర పోలిక"
                  : "Comparison of income credits against actual expense debits"}
              </CardDescription>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
              {(["daily", "weekly", "monthly"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTimeframe(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeframe === tab
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t(`dashboard.tabs.${tab}`)}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            <div className="h-72 w-full pt-4">
              {activeChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  {t("common.loading")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#F1F5F9"} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isDark ? "#94A3B8" : "#64748B", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isDark ? "#94A3B8" : "#64748B", fontSize: 11 }}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), ""]}
                      contentStyle={{
                        backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                        borderColor: isDark ? "#1E293B" : "#E2E8F0",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar
                      name={language === "te" ? "రాబడి (Income)" : "Income"}
                      dataKey="income"
                      fill="#10B981"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      name={language === "te" ? "ఖర్చులు (Expenses)" : "Expenses"}
                      dataKey="expense"
                      fill="#F43F5E"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Category-wise Expenses Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon size={17} className="text-emerald-600 dark:text-emerald-400" />
              <span>{t("dashboard.expenseBreakdown")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {language === "te" ? "వర్గాల వారీ ఖర్చుల నిష్పత్తి" : "Category distribution from database"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {(!data?.charts?.categoryBreakdown || data.charts.categoryBreakdown.length === 0) ? (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400">
                <PieIcon size={32} className="text-slate-300 dark:text-slate-700 mb-2" />
                <span>{language === "te" ? "ఖర్చుల వివరాలు లేవు" : "No expense transactions recorded"}</span>
              </div>
            ) : (
              <div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.charts.categoryBreakdown}
                        dataKey="amount"
                        nameKey="nameEn"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {data.charts.categoryBreakdown.map((cat: any, idx: number) => (
                          <Cell key={idx} fill={cat.color || "#3B82F6"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val)), "Amount"]}
                        contentStyle={{
                          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                          borderColor: isDark ? "#1E293B" : "#E2E8F0",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Compact Legend */}
                <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {data.charts.categoryBreakdown.slice(0, 5).map((cat: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {language === "te" ? cat.nameTe : cat.nameEn}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(cat.amount)} ({cat.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Second Charts Row: Monthly Financial Performance & Paid vs Received & Account-wise Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 2: Monthly Financial Performance Trend (AreaChart) */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={17} className="text-teal-600 dark:text-teal-400" />
              <span>{t("dashboard.monthlyPerformance")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {language === "te" ? "6 నెలల పొదుపు మరియు నికర ధోరణి" : "6-month cash flow & savings trend"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.charts?.monthly || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#F1F5F9"} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? "#94A3B8" : "#64748B", fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? "#94A3B8" : "#64748B", fontSize: 11 }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), ""]}
                    contentStyle={{
                      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                      borderColor: isDark ? "#1E293B" : "#E2E8F0",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    name={language === "te" ? "నికర పొదుపు" : "Net Savings"}
                    dataKey="savings"
                    stroke="#0D9488"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSavings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 4: Paid vs Received (Comparative Bar Chart) */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight size={17} className="text-blue-600 dark:text-blue-400" />
              <span>{t("dashboard.paidVsReceived")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {language === "te"
                ? "చెల్లించిన మరియు స్వీకరించిన నిధుల పోలిక"
                : "Comparative flow of received funds vs debts paid"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.charts?.paidVsReceived || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#F1F5F9"} />
                  <XAxis
                    dataKey="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? "#94A3B8" : "#64748B", fontSize: 10 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? "#94A3B8" : "#64748B", fontSize: 11 }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), ""]}
                    contentStyle={{
                      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                      borderColor: isDark ? "#1E293B" : "#E2E8F0",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    name={language === "te" ? "స్వీకరించినది" : "Received"}
                    dataKey="Received"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    name={language === "te" ? "చెల్లించినది" : "Paid"}
                    dataKey="Paid"
                    fill="#F59E0B"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 5: Account-wise Balances */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet size={17} className="text-emerald-600 dark:text-emerald-400" />
                <span>{t("dashboard.accountBalances")}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {language === "te" ? "ఖాతాలలో ప్రత్యక్ష నిల్వలు" : "Live balances across all bank & cash accounts"}
              </CardDescription>
            </div>
            <a href="/accounts" className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
              {language === "te" ? "నిర్వహణ" : "Manage"} &rarr;
            </a>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-1">
              {(data?.charts?.accountBalances || []).map((acc: any) => {
                const isCash = acc.type === "CASH";
                const isCC = acc.type === "CREDIT_CARD";

                return (
                  <div
                    key={acc.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: acc.color || "#3B82F6" }}
                      >
                        {isCash ? <Banknote size={15} /> : isCC ? <CreditCard size={15} /> : <Building2 size={15} />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {acc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {acc.accountNumber || acc.type}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-sm font-black ${
                        isCC
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7. Bottom Section: Recent Database Transactions & Pending Dues Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight size={17} className="text-emerald-600 dark:text-emerald-400" />
                <span>{t("dashboard.recentTransactions")}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {language === "te"
                  ? "డేటాబేస్ నుండి ఇటీవలి వాస్తవ లావాదేవీలు"
                  : "Verified transaction records from the database"}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(["ALL", "INCOME", "EXPENSE"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTxFilter(mode)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      txFilter === mode
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {mode === "ALL"
                      ? language === "te"
                        ? "అన్నీ"
                        : "All"
                      : mode === "INCOME"
                      ? language === "te"
                        ? "రాబడి"
                        : "Income"
                      : language === "te"
                      ? "ఖర్చులు"
                      : "Expense"}
                  </button>
                ))}
              </div>

              <a
                href="/transactions"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1"
              >
                {t("dashboard.viewAll")} &rarr;
              </a>
            </div>
          </CardHeader>

          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {t("dashboard.emptyTransactions")}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx: any) => {
                  const isIncome =
                    tx.type === "INCOME" ||
                    tx.type === "RECEIVABLE_COLLECTED" ||
                    tx.type === "BORROW";
                  const isExpense =
                    tx.type === "EXPENSE" ||
                    tx.type === "PAYABLE_PAID" ||
                    tx.type === "LEND";

                  return (
                    <div
                      key={tx.id}
                      onClick={() => setViewingTx(tx)}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl text-white ${
                            isIncome
                              ? "bg-emerald-500"
                              : isExpense
                              ? "bg-rose-500"
                              : "bg-blue-500"
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight size={15} />
                          ) : isExpense ? (
                            <ArrowDownRight size={15} />
                          ) : (
                            <ArrowLeftRight size={15} />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {tx.notes || (language === "te" ? tx.category?.nameTe : tx.category?.nameEn) || tx.type}
                            </span>
                            {tx.paymentMethod && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                                {tx.paymentMethod}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                            {formatDate(tx.transactionDate)} • {tx.account?.name}
                            {tx.party?.name ? ` • ${tx.party.name}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <span
                          className={`text-sm font-black ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isExpense
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {isIncome ? "+" : isExpense ? "-" : ""}
                          {formatCurrency(tx.amount)}
                        </span>
                        <Eye size={13} className="text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Dues & Urgent Reminders Widget */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle size={17} className="text-amber-500" />
                <span>{t("dashboard.urgentReminders")}</span>
              </CardTitle>
            </div>

            {/* Debt Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mt-2">
              <button
                onClick={() => setDebtTab("RECEIVABLE")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  debtTab === "RECEIVABLE"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {language === "te" ? "రావాల్సినవి (To Receive)" : "To Receive"}
              </button>
              <button
                onClick={() => setDebtTab("PAYABLE")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  debtTab === "PAYABLE"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {language === "te" ? "ఇవ్వాల్సినవి (To Pay)" : "To Pay"}
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {pendingDebtsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {t("dashboard.noReminders")}
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDebtsList.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.partyName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.isOverdue
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {item.isOverdue
                          ? t("dashboard.overdue")
                          : `${t("dashboard.dueIn")} ${item.diffDays} ${t("dashboard.days")}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {language === "te" ? "మిగిలిన బకాయి" : "Remaining Due"}
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {formatCurrency(item.remainingAmount)}
                        </span>
                      </div>

                      <button
                        onClick={() => setSettlingDebt(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        {language === "te" ? "చెల్లించండి" : "Settle"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Add Income / Expense / Debt Modal */}
      <RecordFormModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onSuccess={() => {
          setRecordModalOpen(false);
          fetchDashboardData();
          window.dispatchEvent(new Event("finance_data_changed"));
        }}
        defaultType={recordModalType}
        mode="create"
      />

      {/* View Transaction Details Modal */}
      <TransactionDetailModal
        isOpen={!!viewingTx}
        transaction={viewingTx}
        onClose={() => setViewingTx(null)}
        onEdit={(tx) => {
          setViewingTx(null);
          setEditingTx(tx);
        }}
        onDelete={handleDeleteTransaction}
      />

      {/* Edit Transaction Modal */}
      <RecordFormModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        onSuccess={() => {
          setEditingTx(null);
          fetchDashboardData();
          window.dispatchEvent(new Event("finance_data_changed"));
        }}
        mode="edit"
        initialData={editingTx}
      />

      {/* Settle Debt Modal */}
      <SettleDebtModal
        isOpen={!!settlingDebt}
        onClose={() => setSettlingDebt(null)}
        onSuccess={() => {
          setSettlingDebt(null);
          fetchDashboardData();
          window.dispatchEvent(new Event("finance_data_changed"));
        }}
        debt={settlingDebt}
      />
    </div>
  );
}
