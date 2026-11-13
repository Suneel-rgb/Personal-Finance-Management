"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Building2,
  Banknote,
  CreditCard,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Search,
  Eye,
  PlusCircle,
  BarChart3,
  PieChart as PieIcon,
  AlertCircle,
  Percent,
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

    const handleDataChanged = () => {
      fetchDashboardData();
    };

    window.addEventListener("finance_data_changed", handleDataChanged);
    return () => window.removeEventListener("finance_data_changed", handleDataChanged);
  }, []);

  const summary = data?.summary || {
    todayExpenses: 0,
    todayReceived: 0,
    totalPendingPayments: 0,
    weeklyPayments: 0,
    monthlyPayments: 0,
    totalPaidAmount: 0,
    totalReceivedAmount: 0,
    currentAvailableBalance: 0,
    netWorth: 0,
    availableBalance: 0,
  };

  const financialOverview = data?.financialOverview || {
    dailyExpenses: { today: 0, thisWeek: 0, thisMonth: 0 },
    weeklyPaymentSummary: { total: 0, count: 0, items: [] },
    monthlyPaymentSummary: { total: 0, count: 0, items: [] },
    businessReceivedSummary: { today: 0, thisMonth: 0, total: 0 },
    pendingVsPaid: { pending: 0, paid: 0 },
  };

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

  const handleOpenAddRecord = (type: "INCOME" | "EXPENSE" | "LEND" | "BORROW") => {
    setRecordModalType(type);
    setRecordModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm(t("transactions.deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setViewingTx(null);
        fetchDashboardData();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete transaction");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  const totalPayablesAndPaid =
    (financialOverview.pendingVsPaid.pending || 0) + (financialOverview.pendingVsPaid.paid || 0);
  const paidPct =
    totalPayablesAndPaid > 0
      ? Math.round((financialOverview.pendingVsPaid.paid / totalPayablesAndPaid) * 100)
      : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Banner & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 dark:from-slate-950 dark:via-emerald-950 dark:to-slate-950 p-6 sm:p-8 text-white border border-emerald-900/40 shadow-xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md text-emerald-300 border border-white/15 text-xs font-semibold">
              <Sparkles size={13} className="text-emerald-400" />
              <span>
                {language === "te"
                  ? "ప్రత్యక్ష డేటాబేస్ ద్వారా ఆర్థిక నిర్వహణ"
                  : "Live Personal & Business Money Management"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t("dashboard.welcome")} 👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-normal leading-relaxed">
              {t("dashboard.subtitle")}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => handleOpenAddRecord("EXPENSE")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>{language === "te" ? "+ ఖర్చు నమోదు" : "+ Add Expense"}</span>
              </button>
              <button
                onClick={() => handleOpenAddRecord("INCOME")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>{language === "te" ? "+ నగదు రాబడి" : "+ Received Money"}</span>
              </button>
              <Link
                href="/pending-payments"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Clock size={14} />
                <span>{language === "te" ? "+ పెండింగ్ చెల్లింపు" : "+ Pending Payment"}</span>
              </Link>
            </div>
          </div>

          {/* Available Liquid Funds Quick Card */}
          <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-slate-800 rounded-2xl p-5 min-w-[280px] flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/90">
                {language === "te" ? "ప్రస్తుత అందుబాటులో ఉన్న బ్యాలెన్స్" : "Available Balance"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                <Wallet size={11} /> Live DB
              </span>
            </div>

            <div className="mt-3">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">
                {formatCurrency(summary.currentAvailableBalance ?? summary.availableBalance ?? 0)}
              </span>
              <span className="text-[11px] text-slate-300 block mt-1">
                {language === "te"
                  ? "చేతిలో నగదు మరియు బ్యాంక్ ఖాతా నిల్వలు"
                  : "Liquid cash & bank accounts ready to spend"}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span>{language === "te" ? "ఖాతాలు:" : "Active Accounts:"}</span>
              <Link href="/accounts" className="text-emerald-300 hover:underline font-bold flex items-center gap-1">
                {data?.accounts?.length || 0} {language === "te" ? "ఖాతాలు" : "accounts"} &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. EXACT 8 DASHBOARD SUMMARY CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {language === "te" ? "ఆర్థిక సారాంశ కార్డ్‌లు" : "Key Financial Indicators"}
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {language === "te" ? "వాస్తవ రికార్డుల ద్వారా లెక్కింపు" : "Auto-calculated from live records"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Expenses */}
          <Link href="/expenses" className="block group">
            <Card className="hover:border-rose-400 dark:hover:border-rose-600 transition-all cursor-pointer h-full border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {t("dashboard.todayExpenses")}
                </span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 group-hover:scale-110 transition-transform">
                  <TrendingDown size={18} />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                  {formatCurrency(summary.todayExpenses ?? 0)}
                </span>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <ArrowDownRight size={13} />
                    <span>{language === "te" ? "నేటి ఖర్చులు" : "Daily Outflow"}</span>
                  </span>
                  <span className="text-slate-400 group-hover:text-rose-600 transition-colors">
                    {language === "te" ? "చూడండి" : "View"} &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 2: Today's Received Money */}
          <Link href="/received-money" className="block group">
            <Card className="hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer h-full border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {t("dashboard.todayReceived")}
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <TrendingUp size={18} />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                  {formatCurrency(summary.todayReceived ?? 0)}
                </span>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ArrowUpRight size={13} />
                    <span>{language === "te" ? "వ్యాపార రాబడి" : "Business Inflow"}</span>
                  </span>
                  <span className="text-slate-400 group-hover:text-emerald-600 transition-colors">
                    {language === "te" ? "చూడండి" : "View"} &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 3: Total Pending Payments */}
          <Link href="/pending-payments" className="block group">
            <Card className="hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer h-full border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {t("dashboard.totalPendingPayments")}
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <Clock size={18} />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight block">
                  {formatCurrency(summary.totalPendingPayments ?? 0)}
                </span>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {language === "te" ? "చెల్లించాల్సిన బకాయి" : "Unpaid Balance"}
                  </span>
                  <span className="text-slate-400 group-hover:text-amber-600 transition-colors">
                    {language === "te" ? "చెల్లించండి" : "Manage"} &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 4: Weekly Payments */}
          <Link href="/weekly-payments" className="block group">
            <Card className="hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer h-full border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {t("dashboard.weeklyPaymentsCard")}
                </span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Calendar size={18} />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                  {formatCurrency(summary.weeklyPayments ?? 0)}
                </span>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    {financialOverview.weeklyPaymentSummary.count}{" "}
                    {language === "te" ? "వారపు చెల్లింపులు" : "active weekly"}
                  </span>
                  <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                    {language === "te" ? "చూడండి" : "View"} &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 5: Monthly Payments */}
          <Link href="/monthly-payments" className="block group">
            <Card className="hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer h-full border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {t("dashboard.monthlyPaymentsCard")}
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Calendar size={18} />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                  {formatCurrency(summary.monthlyPayments ?? 0)}
                </span>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {financialOverview.monthlyPaymentSummary.count}{" "}
                    {language === "te" ? "నెలవారీ రికరింగ్" : "recurring monthly"}
                  </span>
                  <span className="text-slate-400 group-hover:text-blue-600 transition-colors">
                    {language === "te" ? "చూడండి" : "View"} &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 6: Total Paid Amount */}
          <Link href="/paid-history" className="block group">
            <Card className="hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer h-full border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {t("dashboard.totalPaidAmount")}
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={18} />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight block">
                  {formatCurrency(summary.totalPaidAmount ?? 0)}
                </span>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-slate-400 font-medium">
                    {language === "te" ? "నమోదైన చెల్లింపులు" : "Actual transactions"}
                  </span>
                  <span className="text-slate-400 group-hover:text-emerald-600 transition-colors">
                    {language === "te" ? "చరిత్ర" : "History"} &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 7: Total Received Amount */}
          <Link href="/received-money" className="block group">
            <Card className="hover:border-teal-400 dark:hover:border-teal-600 transition-all cursor-pointer h-full border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {t("dashboard.totalReceivedAmount")}
                </span>
                <div className="p-2 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 group-hover:scale-110 transition-transform">
                  <Banknote size={18} />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                  {formatCurrency(summary.totalReceivedAmount ?? 0)}
                </span>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-slate-400 font-medium">
                    {language === "te" ? "మొత్తం నగదు రాబడి" : "All-time inflows"}
                  </span>
                  <span className="text-slate-400 group-hover:text-teal-600 transition-colors">
                    {language === "te" ? "చూడండి" : "View"} &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 8: Current Available Balance */}
          <Link href="/accounts" className="block group">
            <Card className="hover:border-violet-400 dark:hover:border-violet-600 transition-all cursor-pointer h-full border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {t("dashboard.availableBalance")}
                </span>
                <div className="p-2 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 group-hover:scale-110 transition-transform">
                  <Wallet size={18} />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                  {formatCurrency(summary.currentAvailableBalance ?? summary.availableBalance ?? 0)}
                </span>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-violet-600 dark:text-violet-400 font-semibold">
                    {data?.accounts?.length || 0} {language === "te" ? "ఖాతాలలో నిల్వ" : "active accounts"}
                  </span>
                  <span className="text-slate-400 group-hover:text-violet-600 transition-colors">
                    {language === "te" ? "ఖాతాలు" : "Accounts"} &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* 3. FINANCIAL OVERVIEW SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={20} className="text-emerald-600 dark:text-emerald-400" />
              <span>{language === "te" ? "ఆర్థిక సమగ్ర సమీక్ష" : "Financial Overview"}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {language === "te"
                ? "రోజువారీ ఖర్చులు, వారపు మరియు నెలవారీ చెల్లింపులు, వ్యాపార రాబడి మరియు పెండింగ్ విశ్లేషణ"
                : "Consolidated breakdown of daily expenses, weekly/monthly commitments, business inflows, and dues"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Section A: Daily Expenses Summary */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingDown size={16} className="text-rose-600 dark:text-rose-400" />
                  <span>{language === "te" ? "రోజువారీ ఖర్చుల సారాంశం" : "Daily Expenses Summary"}</span>
                </CardTitle>
                <Link
                  href="/expenses"
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  {language === "te" ? "అన్నీ చూడండి" : "View All"} &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === "te" ? "నేడు" : "Today"}
                  </span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 block mt-1">
                    {formatCurrency(financialOverview.dailyExpenses.today)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === "te" ? "ఈ వారం" : "This Week"}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white block mt-1">
                    {formatCurrency(financialOverview.dailyExpenses.thisWeek)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === "te" ? "ఈ నెల" : "This Month"}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white block mt-1">
                    {formatCurrency(financialOverview.dailyExpenses.thisMonth)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => handleOpenAddRecord("EXPENSE")}
                  className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-xs font-bold py-2 rounded-xl"
                >
                  <PlusCircle size={14} className="mr-1.5" />
                  {language === "te" ? "+ కొత్త ఖర్చు నమోదు చేయండి" : "+ Add Everyday Expense"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section B: Weekly Payment Summary */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span>{language === "te" ? "వారపు చెల్లింపుల సారాంశం" : "Weekly Payment Summary"}</span>
                </CardTitle>
                <Link
                  href="/weekly-payments"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {language === "te" ? "పేజీకి వెళ్లండి" : "Weekly Page"} &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                <div>
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium block">
                    {language === "te" ? "మొత్తం వారపు బాధ్యత" : "Total Weekly Dues"}
                  </span>
                  <span className="text-lg font-black text-indigo-900 dark:text-indigo-100">
                    {formatCurrency(financialOverview.weeklyPaymentSummary.total)}
                  </span>
                </div>
                <Badge className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold">
                  {financialOverview.weeklyPaymentSummary.count} {language === "te" ? "చెల్లింపులు" : "items"}
                </Badge>
              </div>

              {/* Quick Weekly list */}
              {financialOverview.weeklyPaymentSummary.items && financialOverview.weeklyPaymentSummary.items.length > 0 ? (
                <div className="space-y-1.5">
                  {financialOverview.weeklyPaymentSummary.items.slice(0, 2).map((item: any) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {item.title || item.party?.name || "Weekly Payment"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.dueDate ? formatDate(item.dueDate) : "Weekly"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.remainingAmount)}
                        </span>
                        <button
                          onClick={() => setSettlingDebt(item)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          {language === "te" ? "చెల్లించండి" : "Pay"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">
                  {language === "te" ? "వారపు చెల్లింపులు లేవు." : "No weekly obligations recorded."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section C: Monthly Payment Summary */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>{language === "te" ? "నెలవారీ చెల్లింపుల సారాంశం" : "Monthly Payment Summary"}</span>
                </CardTitle>
                <Link
                  href="/monthly-payments"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {language === "te" ? "పేజీకి వెళ్లండి" : "Monthly Page"} &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                <div>
                  <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium block">
                    {language === "te" ? "నెలవారీ రికరింగ్ మొత్తం" : "Total Monthly Dues"}
                  </span>
                  <span className="text-lg font-black text-blue-900 dark:text-blue-100">
                    {formatCurrency(financialOverview.monthlyPaymentSummary.total)}
                  </span>
                </div>
                <Badge className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-xs font-bold">
                  {financialOverview.monthlyPaymentSummary.count} {language === "te" ? "చెల్లింపులు" : "bills"}
                </Badge>
              </div>

              {/* Quick Monthly list */}
              {financialOverview.monthlyPaymentSummary.items && financialOverview.monthlyPaymentSummary.items.length > 0 ? (
                <div className="space-y-1.5">
                  {financialOverview.monthlyPaymentSummary.items.slice(0, 2).map((item: any) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {item.title || item.party?.name || "Monthly Bill"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.dueDate ? formatDate(item.dueDate) : "Monthly"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.remainingAmount)}
                        </span>
                        <button
                          onClick={() => setSettlingDebt(item)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          {language === "te" ? "చెల్లించండి" : "Pay"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">
                  {language === "te" ? "నెలవారీ బిల్లులు లేవు." : "No monthly obligations recorded."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section D: Business Money Received */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{language === "te" ? "వ్యాపార రాబడి సారాంశం" : "Business Money Received"}</span>
                </CardTitle>
                <Link
                  href="/received-money"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {language === "te" ? "అన్నీ చూడండి" : "View All"} &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === "te" ? "నేడు" : "Today"}
                  </span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                    {formatCurrency(financialOverview.businessReceivedSummary.today)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === "te" ? "ఈ నెల" : "This Month"}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white block mt-1">
                    {formatCurrency(financialOverview.businessReceivedSummary.thisMonth)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === "te" ? "మొత్తం" : "All-Time"}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white block mt-1">
                    {formatCurrency(financialOverview.businessReceivedSummary.total)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => handleOpenAddRecord("INCOME")}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 text-xs font-bold py-2 rounded-xl"
                >
                  <PlusCircle size={14} className="mr-1.5" />
                  {language === "te" ? "+ వ్యాపార రాబడి నమోదు చేయండి" : "+ Record Business Inflow"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section E: Pending vs Paid Payments Comparison */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between md:col-span-2 lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowLeftRight size={16} className="text-amber-500" />
                  <span>{language === "te" ? "పెండింగ్ వర్సెస్ చెల్లించిన చెల్లింపులు" : "Pending vs Paid Payments"}</span>
                </CardTitle>
                <div className="flex items-center gap-3 text-xs">
                  <Link href="/pending-payments" className="text-amber-600 dark:text-amber-400 font-bold hover:underline">
                    {language === "te" ? "పెండింగ్ బకాయిలు" : "Pending Dues"} &rarr;
                  </Link>
                  <Link href="/paid-history" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                    {language === "te" ? "చెల్లించిన చరిత్ర" : "Paid History"} &rarr;
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                      {language === "te" ? "మొత్తం పెండింగ్ బకాయిలు" : "Total Pending Dues"}
                    </span>
                    <Badge className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 text-[10px]">
                      Pending (Orange)
                    </Badge>
                  </div>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block mt-2">
                    {formatCurrency(financialOverview.pendingVsPaid.pending)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    {language === "te" ? "ఇంకా చెల్లించాల్సిన బాకీలు" : "Remaining payable obligations"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {language === "te" ? "మొత్తం చెల్లించిన మొత్తం" : "Total Paid Amount"}
                    </span>
                    <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[10px]">
                      Paid (Green)
                    </Badge>
                  </div>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-2">
                    {formatCurrency(financialOverview.pendingVsPaid.paid)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    {language === "te" ? "వాస్తవంగా చెల్లించిన రికార్డులు" : "Completed settlements recorded"}
                  </span>
                </div>
              </div>

              {/* Progress bar comparison */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">
                    {language === "te" ? "చెల్లింపుల పరిష్కార శాతం" : "Settlement Ratio"}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{paidPct}% Completed</span>
                </div>
                <div className="w-full bg-amber-200 dark:bg-amber-950/60 rounded-full h-3 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${paidPct}%` }}
                    title={`Paid: ${paidPct}%`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${100 - paidPct}%` }}
                    title={`Pending: ${100 - paidPct}%`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. INTERACTIVE CHARTS: Cash Flow & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Income vs Expenses */}
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
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charts?.[timeframe] || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                    name={language === "te" ? "రాబడి" : "Income / Inflow"}
                    dataKey="income"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    name={language === "te" ? "ఖర్చులు" : "Expenses / Outflow"}
                    dataKey="expense"
                    fill="#F43F5E"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Category Breakdown */}
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
            {!data?.charts?.categoryBreakdown || data.charts.categoryBreakdown.length === 0 ? (
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

      {/* 5. RECENT TRANSACTIONS TABLE */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight size={17} className="text-emerald-600 dark:text-emerald-400" />
              <span>{t("dashboard.recentTransactions")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {language === "te"
                ? "డేటాబేస్ నుండి ఇటీవలి వాస్తవ లావాదేవీలు"
                : "Real-time records from your financial database"}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === "te" ? "శోధించండి..." : "Search transactions..."}
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-emerald-500"
              />
            </div>

            {/* Type Filters */}
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

            <Link
              href="/reports"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1"
            >
              {language === "te" ? "నివేదికలు" : "Reports"} &rarr;
            </Link>
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

      {/* Modals */}
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
