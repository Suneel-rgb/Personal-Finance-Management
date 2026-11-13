"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  Percent,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  Printer,
  Filter,
  Search,
  HandCoins,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
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
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import * as XLSX from "xlsx";

type ReportType =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "income"
  | "expense"
  | "pending_payment"
  | "received_payment"
  | "savings";

export default function ReportsPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Filter & Report States
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [tableSearch, setTableSearch] = useState("");

  const [categories, setCategories] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load categories
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((cats) => {
        if (Array.isArray(cats)) setCategories(cats);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch report data
  const fetchReports = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append("reportType", reportType);

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (categoryId !== "all") params.append("categoryId", categoryId);

    fetch(`/api/reports?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setData(res);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();

    const handleDataChange = () => fetchReports();
    window.addEventListener("finance_data_changed", handleDataChange);
    return () => window.removeEventListener("finance_data_changed", handleDataChange);
  }, [reportType, startDate, endDate, categoryId]);

  // Handle Date Presets
  const handleSelectPreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (preset === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (preset === "last_30_days") {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "this_year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    }
  };

  const handleResetFilters = () => {
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setCategoryId("all");
    setTableSearch("");
  };

  // Language-aware Excel Export
  const exportReportExcel = () => {
    if (!data) return;
    const isTe = language === "te";

    let rows: any[] = [];
    let sheetName = "Report";

    if (reportType === "daily" || reportType === "weekly" || reportType === "monthly" || reportType === "yearly") {
      sheetName = isTe ? "నగదు_ప్రవాహం" : "Cash_Flow";
      rows = (data.timeSeriesData || []).map((item: any) => ({
        [isTe ? "కాలవ్యవధి (Interval)" : "Interval"]: isTe && item.labelTe ? item.labelTe : item.label,
        [isTe ? "రాబడి (Income ₹)" : "Income (₹)"]: item.income,
        [isTe ? "ఖర్చులు (Expense ₹)" : "Expense (₹)"]: item.expense,
        [isTe ? "నికర పొదుపు (Net Savings ₹)" : "Net Savings (₹)"]: item.net,
        [isTe ? "పొదుపు శాతం (Savings Rate)" : "Savings Rate"]: item.income > 0 ? `${Math.round((item.net / item.income) * 100)}%` : "0%",
      }));
    } else if (reportType === "income") {
      sheetName = isTe ? "రాబడి_నివేదిక" : "Income_Report";
      rows = (data.transactions || []).filter((t: any) => t.type === "INCOME").map((t: any) => ({
        [isTe ? "తేదీ (Date)" : "Date"]: formatDate(t.transactionDate),
        [isTe ? "వర్గం (Category)" : "Category"]: isTe ? t.category?.nameTe : t.category?.nameEn,
        [isTe ? "ఖాతా (Account)" : "Account"]: t.account?.name || "",
        [isTe ? "చెల్లింపు విధానం (Payment Method)" : "Payment Method"]: t.paymentMethod || "UPI",
        [isTe ? "వివరాలు (Notes)" : "Notes"]: t.notes || "",
        [isTe ? "మొత్తం (Amount ₹)" : "Amount (₹)"]: t.amount,
      }));
    } else if (reportType === "expense") {
      sheetName = isTe ? "ఖర్చుల_నివేదిక" : "Expense_Report";
      rows = (data.transactions || []).filter((t: any) => t.type === "EXPENSE").map((t: any) => ({
        [isTe ? "తేదీ (Date)" : "Date"]: formatDate(t.transactionDate),
        [isTe ? "వర్గం (Category)" : "Category"]: isTe ? t.category?.nameTe : t.category?.nameEn,
        [isTe ? "ఖాతా (Account)" : "Account"]: t.account?.name || "",
        [isTe ? "చెల్లింపు విధానం (Payment Method)" : "Payment Method"]: t.paymentMethod || "UPI",
        [isTe ? "వివరాలు (Notes)" : "Notes"]: t.notes || "",
        [isTe ? "మొత్తం (Amount ₹)" : "Amount (₹)"]: t.amount,
      }));
    } else if (reportType === "pending_payment") {
      sheetName = isTe ? "చెల్లించాల్సిన_బాకీలు" : "Pending_Payables";
      rows = (data.pendingPayables || []).map((d: any) => ({
        [isTe ? "వ్యక్తి / సంస్థ (Creditor)" : "Person/Party"]: d.party?.name || "",
        [isTe ? "అసలు మొత్తం (Original ₹)" : "Original Amount (₹)"]: d.originalAmount,
        [isTe ? "మిగిలిన బాకీ (Remaining ₹)" : "Remaining Due (₹)"]: d.remainingAmount,
        [isTe ? "గడువు తేదీ (Due Date)" : "Due Date"]: d.dueDate ? formatDate(d.dueDate) : "N/A",
        [isTe ? "స్థితి (Status)" : "Status"]: d.status,
        [isTe ? "వివరాలు (Notes)" : "Notes"]: d.notes || "",
      }));
    } else if (reportType === "received_payment") {
      sheetName = isTe ? "స్వీకరించిన_నిధులు" : "Received_Collections";
      rows = (data.pendingReceivables || []).map((d: any) => ({
        [isTe ? "వ్యక్తి / సంప్రదింపు (Debtor)" : "Person/Party"]: d.party?.name || "",
        [isTe ? "అసలు మొత్తం (Original ₹)" : "Original Amount (₹)"]: d.originalAmount,
        [isTe ? "మిగిలిన రావలసినది (Remaining ₹)" : "Remaining Due (₹)"]: d.remainingAmount,
        [isTe ? "గడువు తేదీ (Due Date)" : "Due Date"]: d.dueDate ? formatDate(d.dueDate) : "N/A",
        [isTe ? "స్థితి (Status)" : "Status"]: d.status,
      }));
    } else if (reportType === "savings") {
      sheetName = isTe ? "పొదుపు_లక్ష్యాలు" : "Savings_Goals";
      rows = (data.savingsGoals || []).map((g: any) => ({
        [isTe ? "లక్ష్యం పేరు (Goal Name)" : "Goal Name"]: isTe ? g.nameTe : g.nameEn,
        [isTe ? "లక్ష్య మొత్తం (Target ₹)" : "Target Amount (₹)"]: g.targetAmount,
        [isTe ? "ఇప్పటివరకు పొదుపు (Saved ₹)" : "Accumulated (₹)"]: g.currentAmount,
        [isTe ? "పూర్తయిన శాతం (Progress)" : "Progress"]: `${Math.round((g.currentAmount / g.targetAmount) * 100)}%`,
        [isTe ? "లక్ష్య తేదీ (Target Date)" : "Target Date"]: g.targetDate ? formatDate(g.targetDate) : "N/A",
      }));
    }

    if (rows.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(
      workbook,
      `${isTe ? "ఆర్థిక_నివేదిక" : "Financial_Report"}_${reportType}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Language-aware CSV Export (with UTF-8 BOM)
  const exportReportCSV = () => {
    if (!data) return;
    const isTe = language === "te";

    let rows: any[] = [];
    if (reportType === "daily" || reportType === "weekly" || reportType === "monthly" || reportType === "yearly") {
      rows = (data.timeSeriesData || []).map((item: any) => ({
        Interval: isTe && item.labelTe ? item.labelTe : item.label,
        Income: item.income,
        Expense: item.expense,
        NetSavings: item.net,
      }));
    } else {
      rows = (data.transactions || []).map((t: any) => ({
        Date: formatDate(t.transactionDate),
        Type: t.type,
        Category: isTe ? t.category?.nameTe || t.category?.nameEn : t.category?.nameEn,
        Account: t.account?.name || "",
        Amount: t.amount,
        Notes: t.notes || "",
      }));
    }

    if (rows.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows recognizes Telugu Unicode glyphs properly
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isTe ? "నివేదిక" : "Report"}_${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const reportTabs: Array<{ id: ReportType; label: string; icon: any }> = [
    { id: "daily", label: t("reports.reportDaily"), icon: Calendar },
    { id: "weekly", label: t("reports.reportWeekly"), icon: Calendar },
    { id: "monthly", label: t("reports.reportMonthly"), icon: BarChart3 },
    { id: "yearly", label: t("reports.reportYearly"), icon: Layers },
    { id: "income", label: t("reports.reportIncome"), icon: TrendingUp },
    { id: "expense", label: t("reports.reportExpense"), icon: TrendingDown },
    { id: "pending_payment", label: t("reports.reportPendingPayment"), icon: Clock },
    { id: "received_payment", label: t("reports.reportReceivedPayment"), icon: HandCoins },
    { id: "savings", label: t("reports.reportSavings"), icon: Target },
  ];

  const summary = data?.summary || {
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    savingsRate: 0,
    totalPendingPayables: 0,
    totalPendingReceivables: 0,
    totalSavingsTarget: 0,
    totalSavingsAccumulated: 0,
  };

  // Filtered transactions in table
  const filteredTableTxs = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter((tx: any) => {
      if (reportType === "income" && tx.type !== "INCOME") return false;
      if (reportType === "expense" && tx.type !== "EXPENSE") return false;

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchesNote = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
        const matchesCatEn = tx.category?.nameEn ? tx.category.nameEn.toLowerCase().includes(q) : false;
        const matchesCatTe = tx.category?.nameTe ? tx.category.nameTe.toLowerCase().includes(q) : false;
        const matchesParty = tx.party?.name ? tx.party.name.toLowerCase().includes(q) : false;
        const matchesAcc = tx.account?.name ? tx.account.name.toLowerCase().includes(q) : false;
        return matchesNote || matchesCatEn || matchesCatTe || matchesParty || matchesAcc;
      }

      return true;
    });
  }, [data, reportType, tableSearch]);

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#64748B"];

  return (
    <div className="space-y-6 pb-16 print:p-0 animate-in fade-in duration-200">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-emerald-600 dark:text-emerald-400" />
            <span>{t("reports.title")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("reports.subtitle")}
          </p>
        </div>

        {/* Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
          >
            <Printer size={14} />
            <span>{t("reports.downloadPDF")}</span>
          </button>

          <button
            onClick={exportReportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
          >
            <FileText size={14} />
            <span>{t("reports.downloadCSV")}</span>
          </button>

          <button
            onClick={exportReportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>{t("reports.downloadExcel")}</span>
          </button>
        </div>
      </div>

      {/* 2. All 9 Report Types Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-1.5 overflow-x-auto print:hidden">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Filters Toolbar: Custom Date Range & Category Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Calendar size={14} />
              <span>{language === "te" ? "త్వరిత ఎంపిక:" : "Quick Filter:"}</span>
            </span>

            {[
              { id: "all", label: language === "te" ? "అన్నీ (All Time)" : "All Time" },
              { id: "this_month", label: language === "te" ? "ఈ నెల" : "This Month" },
              { id: "last_month", label: language === "te" ? "గత నెల" : "Last Month" },
              { id: "last_30_days", label: language === "te" ? "గత 30 రోజులు" : "Last 30 Days" },
              { id: "this_year", label: language === "te" ? "ఈ సంవత్సరం" : "This Year" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                  datePreset === p.id
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="self-start lg:self-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>{language === "te" ? "ఫిల్టర్లు రీసెట్" : "Reset Filters"}</span>
          </button>
        </div>

        {/* Custom Date Pickers & Category Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {language === "te" ? "ప్రారంభ తేదీ (From Date)" : "Start Date"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("custom");
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {language === "te" ? "ముగింపు తేదీ (To Date)" : "End Date"}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("custom");
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              {t("reports.filterCategory")}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">{t("reports.allCategories")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {language === "te" ? cat.nameTe : cat.nameEn} ({cat.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. High-Level Summary KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block">
            {t("reports.totalIncome")}
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
            {formatCurrency(summary.totalIncome)}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {language === "te" ? "నమోదైన మొత్తం రాబడి క్రెడిట్స్" : "Total verified income credits"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block">
            {t("reports.totalExpense")}
          </span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block mt-1">
            {formatCurrency(summary.totalExpense)}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {language === "te" ? "నమోదైన మొత్తం ఖర్చుల డెబిట్స్" : "Total verified expense debits"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block">
            {t("reports.netSavings")}
          </span>
          <span
            className={`text-2xl font-black block mt-1 ${
              summary.netSavings >= 0 ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(summary.netSavings)}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {language === "te" ? "రాబడి - ఖర్చుల నికర మిగులు" : "Net cash retention balance"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block">
            {reportType === "pending_payment"
              ? language === "te" ? "చెల్లించాల్సిన బాకీలు" : "Total Payables"
              : reportType === "received_payment"
              ? language === "te" ? "రావాల్సిన బాకీలు" : "Total Receivables"
              : reportType === "savings"
              ? language === "te" ? "పొదుపు లక్ష్య మొత్తం" : "Target Savings"
              : t("reports.savingsRate")}
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white block mt-1">
            {reportType === "pending_payment"
              ? formatCurrency(summary.totalPendingPayables)
              : reportType === "received_payment"
              ? formatCurrency(summary.totalPendingReceivables)
              : reportType === "savings"
              ? formatCurrency(summary.totalSavingsTarget)
              : `${summary.savingsRate}%`}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {reportType === "savings"
              ? `${formatCurrency(summary.totalSavingsAccumulated)} accumulated`
              : language === "te"
              ? "నికర పొదుపు శాతపు సామర్థ్యం"
              : "Financial efficiency index"}
          </span>
        </div>
      </div>

      {/* 5. Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Time-Series Cash Flow Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 size={17} className="text-emerald-600 dark:text-emerald-400" />
                <span>
                  {reportType === "income"
                    ? language === "te" ? "రాబడి ధోరణి (Income Trend)" : "Income Inflow Trajectory"
                    : reportType === "expense"
                    ? language === "te" ? "ఖర్చుల ధోరణి (Expense Trend)" : "Expenditure Outflow Trajectory"
                    : t("reports.incomeVsExpense")}
                </span>
              </h2>
              <span className="text-xs text-slate-400">
                {language === "te" ? "కాలక్రమంలో నమోదైన నగదు ప్రవాహం" : "Time-series comparative analysis"}
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {(!data?.timeSeriesData || data.timeSeriesData.length === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                {t("common.loading")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#F1F5F9"} />
                  <XAxis
                    dataKey={language === "te" ? "labelTe" : "label"}
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
                  {(reportType !== "expense") && (
                    <Bar
                      name={language === "te" ? "రాబడి (Income)" : "Income Inflow"}
                      dataKey="income"
                      fill="#10B981"
                      radius={[6, 6, 0, 0]}
                    />
                  )}
                  {(reportType !== "income") && (
                    <Bar
                      name={language === "te" ? "ఖర్చులు (Expenses)" : "Expense Outflow"}
                      dataKey="expense"
                      fill="#F43F5E"
                      radius={[6, 6, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {reportType === "income"
                  ? language === "te" ? "రాబడి వర్గాలు" : "Income Categories"
                  : t("reports.categoryBreakdown")}
              </h2>
            </div>

            {/* Donut Chart */}
            {((reportType === "income" ? data?.categoryIncomes : data?.categoryExpenses) || []).length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                {language === "te" ? "విశ్లేషణకు సరిపడా రికార్డులు లేవు" : "No categorized records found"}
              </div>
            ) : (
              <div>
                <div className="h-44 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportType === "income" ? data.categoryIncomes : data.categoryExpenses}
                        dataKey="amount"
                        nameKey="nameEn"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {(reportType === "income" ? data.categoryIncomes : data.categoryExpenses).map(
                          (cat: any, idx: number) => (
                            <Cell key={idx} fill={cat.color || COLORS[idx % COLORS.length]} />
                          )
                        )}
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

                {/* List Breakdown */}
                <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {(reportType === "income" ? data?.categoryIncomes : data?.categoryExpenses)
                    ?.slice(0, 5)
                    .map((cat: any, idx: number) => (
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
          </div>
        </div>
      </div>

      {/* 6. Detailed Report Records Statement Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("reports.summaryReport")}
            </h2>
            <span className="text-xs text-slate-400">
              {language === "te"
                ? `ఎంచుకున్న కాలవ్యవధిలో మొత్తం ${filteredTableTxs.length} లావాదేవీల పూర్తి జాబితా`
                : `Complete ledger statement of ${filteredTableTxs.length} matching transactions`}
            </span>
          </div>

          <div className="relative w-full sm:w-64 print:hidden">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={language === "te" ? "రికార్డులలో వెతకండి..." : "Search in statement..."}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            {t("common.loading")}
          </div>
        ) : filteredTableTxs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            {language === "te" ? "ఈ ప్రమాణాలకు తగిన రికార్డులు ఏవీ లేవు." : "No records found matching this criteria."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">{t("transactions.colDate")}</th>
                  <th className="py-3 px-4">{t("transactions.colType")}</th>
                  <th className="py-3 px-4">{t("transactions.colCategory")}</th>
                  <th className="py-3 px-4">{t("transactions.colAccount")}</th>
                  <th className="py-3 px-4">{language === "te" ? "చెల్లింపు పద్ధతి" : "Payment Method"}</th>
                  <th className="py-3 px-4">{t("transactions.colNote")}</th>
                  <th className="py-3 px-4 text-right">{t("transactions.colAmount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTableTxs.slice(0, 50).map((tx: any) => {
                  const isInc = tx.type === "INCOME" || tx.type === "RECEIVABLE_COLLECTED" || tx.type === "BORROW";
                  const isExp = tx.type === "EXPENSE" || tx.type === "PAYABLE_PAID" || tx.type === "LEND";

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isInc
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : isExp
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                          }`}
                        >
                          {t(`transactions.types.${tx.type}`, tx.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {language === "te" ? tx.category?.nameTe : tx.category?.nameEn || "General"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {tx.account?.name || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 uppercase text-[10px] font-semibold">
                        {tx.paymentMethod || "UPI"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {tx.notes || (tx.party?.name ? `Party: ${tx.party.name}` : "—")}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black whitespace-nowrap ${
                          isInc
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isExp
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {isInc ? "+" : isExp ? "-" : ""}
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
