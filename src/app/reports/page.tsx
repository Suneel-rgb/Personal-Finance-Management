"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  Printer,
  Filter,
  Search,
  HandCoins,
  Clock,
  CheckCircle2,
  Banknote,
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
  CartesianGrid,
} from "recharts";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type ReportType =
  | "daily_expenses"
  | "weekly_expenses"
  | "monthly_expenses"
  | "business_received"
  | "weekly_payments"
  | "monthly_payments"
  | "pending_payments"
  | "paid_history";

export default function ReportsPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Filter & Report States
  const [reportType, setReportType] = useState<ReportType>("daily_expenses");
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch report data
  const fetchReports = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append("reportType", reportType);

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

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
  }, [reportType, startDate, endDate]);

  // Handle Date Presets
  const handleSelectPreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "this_week") {
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
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
    setTableSearch("");
  };

  // 8 Specific Report Configurations
  const reportTabs: Array<{ id: ReportType; labelEn: string; labelTe: string; icon: any }> = [
    { id: "daily_expenses", labelEn: "Daily Expenses Report", labelTe: "రోజువారీ ఖర్చుల నివేదిక", icon: TrendingDown },
    { id: "weekly_expenses", labelEn: "Weekly Expenses Report", labelTe: "వారపు ఖర్చుల నివేదిక", icon: Calendar },
    { id: "monthly_expenses", labelEn: "Monthly Expenses Report", labelTe: "నెలవారీ ఖర్చుల నివేదిక", icon: BarChart3 },
    { id: "business_received", labelEn: "Business Received Money Report", labelTe: "వ్యాపార రాబడి నివేదిక", icon: Banknote },
    { id: "weekly_payments", labelEn: "Weekly Payments Report", labelTe: "వారపు చెల్లింపుల నివేదిక", icon: Clock },
    { id: "monthly_payments", labelEn: "Monthly Payments Report", labelTe: "నెలవారీ చెల్లింపుల నివేదిక", icon: Layers },
    { id: "pending_payments", labelEn: "Pending Payments Report", labelTe: "పెండింగ్ చెల్లింపుల నివేదిక", icon: Clock },
    { id: "paid_history", labelEn: "Paid History Report", labelTe: "చెల్లించిన చరిత్ర నివేదిక", icon: CheckCircle2 },
  ];

  // Prepare Rows for Current Selected Report
  const currentReportRows = useMemo(() => {
    if (!data) return [];
    const isTe = language === "te";

    if (reportType === "daily_expenses" || reportType === "weekly_expenses" || reportType === "monthly_expenses") {
      const txs = (data.transactions || []).filter((t: any) => t.type === "EXPENSE");
      return txs.map((t: any) => ({
        date: formatDate(t.transactionDate),
        rawDate: t.transactionDate,
        title: t.notes || (isTe ? t.category?.nameTe : t.category?.nameEn) || "Expense",
        category: isTe ? t.category?.nameTe || t.category?.nameEn : t.category?.nameEn || "General",
        account: t.account?.name || "Cash",
        paymentMethod: t.paymentMethod || "UPI",
        amount: t.amount,
        status: "PAID",
      }));
    }

    if (reportType === "business_received") {
      const txs = (data.transactions || []).filter(
        (t: any) => t.type === "INCOME" || t.type === "RECEIVABLE_COLLECTED" || t.type === "BORROW"
      );
      return txs.map((t: any) => ({
        date: formatDate(t.transactionDate),
        rawDate: t.transactionDate,
        title: t.party?.name || t.notes || "Business Inflow",
        category: isTe ? t.category?.nameTe || t.category?.nameEn : t.category?.nameEn || "Revenue",
        account: t.account?.name || "Bank",
        paymentMethod: t.paymentMethod || "UPI",
        amount: t.amount,
        status: "RECEIVED",
      }));
    }

    if (reportType === "weekly_payments") {
      const debts = (data.weeklyPayables || []).length > 0
        ? data.weeklyPayables
        : (data.allDebts || []).filter((d: any) => d.type === "BORROWED" && d.frequency === "WEEKLY");
      return debts.map((d: any) => ({
        date: d.dueDate ? formatDate(d.dueDate) : "Weekly",
        rawDate: d.dueDate || d.createdAt,
        title: d.title || d.party?.name || "Weekly Obligation",
        category: "Weekly Payment",
        account: d.paymentMethod || "UPI",
        paymentMethod: d.paymentMethod || "UPI",
        amount: d.originalAmount,
        paidAmount: d.paidAmount || (d.originalAmount - d.remainingAmount),
        remainingAmount: d.remainingAmount,
        status: d.status,
      }));
    }

    if (reportType === "monthly_payments") {
      const debts = (data.monthlyPayables || []).length > 0
        ? data.monthlyPayables
        : (data.allDebts || []).filter((d: any) => d.type === "BORROWED" && d.frequency === "MONTHLY");
      return debts.map((d: any) => ({
        date: d.dueDate ? formatDate(d.dueDate) : "Monthly",
        rawDate: d.dueDate || d.createdAt,
        title: d.title || d.party?.name || "Monthly Recurring",
        category: "Monthly Bill",
        account: d.paymentMethod || "Bank",
        paymentMethod: d.paymentMethod || "Bank",
        amount: d.originalAmount,
        paidAmount: d.paidAmount || (d.originalAmount - d.remainingAmount),
        remainingAmount: d.remainingAmount,
        status: d.status,
      }));
    }

    if (reportType === "pending_payments") {
      const debts = (data.pendingPayables || []).length > 0
        ? data.pendingPayables
        : (data.allDebts || []).filter((d: any) => d.type === "BORROWED" && d.status !== "SETTLED");
      return debts.map((d: any) => ({
        date: d.dueDate ? formatDate(d.dueDate) : "Pending",
        rawDate: d.dueDate || d.createdAt,
        title: d.title || d.party?.name || "Pending Obligation",
        category: d.frequency || "Pending Dues",
        account: d.paymentMethod || "UPI",
        paymentMethod: d.paymentMethod || "UPI",
        amount: d.originalAmount,
        paidAmount: d.paidAmount || (d.originalAmount - d.remainingAmount),
        remainingAmount: d.remainingAmount,
        status: d.status,
      }));
    }

    if (reportType === "paid_history") {
      const settlements = data.settlements || [];
      return settlements.map((s: any) => ({
        date: formatDate(s.paymentDate),
        rawDate: s.paymentDate,
        title: s.debt?.title || s.debt?.party?.name || "Paid Obligation",
        category: s.debt?.frequency || "Settlement",
        account: s.transaction?.account?.name || "Default Account",
        paymentMethod: s.paymentMethod || s.transaction?.paymentMethod || "UPI",
        amount: s.amountPaid,
        status: "SETTLED",
      }));
    }

    return [];
  }, [data, reportType, language]);

  // Filtered Rows by search text
  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return currentReportRows;
    const q = tableSearch.toLowerCase();
    return currentReportRows.filter(
      (r: any) =>
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.account && r.account.toLowerCase().includes(q)) ||
        (r.status && r.status.toLowerCase().includes(q))
    );
  }, [currentReportRows, tableSearch]);

  const reportTotalAmount = useMemo(() => {
    return filteredRows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  }, [filteredRows]);

  // Excel Export
  const exportReportExcel = () => {
    if (filteredRows.length === 0) return;
    const isTe = language === "te";

    const exportData = filteredRows.map((r: any) => ({
      [isTe ? "తేదీ (Date)" : "Date"]: r.date,
      [isTe ? "శీర్షిక / వివరణ (Title)" : "Title / Description"]: r.title,
      [isTe ? "వర్గం (Category / Type)" : "Category / Type"]: r.category,
      [isTe ? "ఖాతా / విధానం (Account / Method)" : "Account / Method"]: `${r.account} (${r.paymentMethod})`,
      [isTe ? "మొత్తం (Amount ₹)" : "Amount (₹)"]: r.amount,
      [isTe ? "స్థితి (Status)" : "Status"]: r.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(
      workbook,
      `${isTe ? "ఆర్థిక_నివేదిక" : "Finance_Report"}_${reportType}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // CSV Export with UTF-8 BOM
  const exportReportCSV = () => {
    if (filteredRows.length === 0) return;
    const isTe = language === "te";

    const exportData = filteredRows.map((r: any) => ({
      Date: r.date,
      Title: r.title,
      Category: r.category,
      Account: r.account,
      Method: r.paymentMethod,
      Amount: r.amount,
      Status: r.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

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

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16 print:p-0">
      {/* 1. Header & Global Exports */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-emerald-600 dark:text-emerald-400" />
            <span>{language === "te" ? "ఆర్థిక నివేదికలు" : "Financial Reports"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === "te"
              ? "ఖర్చులు, వ్యాపార రాబడి, వారపు/నెలవారీ చెల్లింపులు మరియు చెల్లించిన చరిత్ర సమగ్ర నివేదికలు"
              : "Generate, filter, and export detailed financial reports with custom date ranges"}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handlePrintPDF}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <Printer size={14} />
            <span>PDF</span>
          </Button>
          <Button
            onClick={exportReportCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <FileText size={14} />
            <span>CSV</span>
          </Button>
          <Button
            onClick={exportReportExcel}
            size="sm"
            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileSpreadsheet size={14} />
            <span>Excel</span>
          </Button>
        </div>
      </div>

      {/* 2. 8 REPORT TYPE TABS */}
      <div className="print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                }`}
              >
                <Icon size={14} />
                <span>{language === "te" ? tab.labelTe : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. DATE FILTERS & SEARCH BAR */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", labelEn: "All Time", labelTe: "అన్ని సమయాలు" },
                { id: "today", labelEn: "Today", labelTe: "నేడు" },
                { id: "this_week", labelEn: "This Week", labelTe: "ఈ వారం" },
                { id: "this_month", labelEn: "This Month", labelTe: "ఈ నెల" },
                { id: "last_month", labelEn: "Last Month", labelTe: "గత నెల" },
                { id: "this_year", labelEn: "This Year", labelTe: "ఈ సంవత్సరం" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    datePreset === p.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {language === "te" ? p.labelTe : p.labelEn}
                </button>
              ))}
            </div>

            {/* Reset */}
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>{language === "te" ? "రీసెట్" : "Reset"}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Custom Dates */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">{language === "te" ? "ప్రారంభ:" : "From:"}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setStartDate(e.target.value);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">{language === "te" ? "ముగింపు:" : "To:"}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setEndDate(e.target.value);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>

            {/* Keyword Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === "te" ? "శోధించండి..." : "Search rows..."}
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. SUMMARY KPI CARDS FOR SELECTED REPORT */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs text-slate-400 font-medium block">
              {language === "te" ? "నివేదిక మొత్తం విలువ" : "Total Report Value"}
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white block mt-1">
              {formatCurrency(reportTotalAmount)}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs text-slate-400 font-medium block">
              {language === "te" ? "మొత్తం రికార్డుల సంఖ్య" : "Total Record Count"}
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
              {filteredRows.length} {language === "te" ? "నమోదులు" : "records"}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs text-slate-400 font-medium block">
              {language === "te" ? "సగటు లావాదేవీ మొత్తం" : "Average Value"}
            </span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block mt-1">
              {filteredRows.length > 0
                ? formatCurrency(Math.round(reportTotalAmount / filteredRows.length))
                : formatCurrency(0)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 5. TABULAR DATA REPORT */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                {language === "te"
                  ? reportTabs.find((t) => t.id === reportType)?.labelTe
                  : reportTabs.find((t) => t.id === reportType)?.labelEn}
              </span>
            </CardTitle>
            <span className="text-xs text-slate-400 font-semibold">
              {filteredRows.length} {language === "te" ? "ఫలితాలు" : "entries"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              {language === "te"
                ? "ఎంచుకున్న కాలవ్యవధిలో ఎలాంటి రికార్డులు కనుగొనబడలేదు."
                : "No matching records found for the selected timeframe."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{language === "te" ? "తేదీ" : "Date"}</th>
                    <th className="py-3 px-4">{language === "te" ? "వివరాలు / శీర్షిక" : "Title / Description"}</th>
                    <th className="py-3 px-4">{language === "te" ? "వర్గం / రకం" : "Category / Type"}</th>
                    <th className="py-3 px-4">{language === "te" ? "చెల్లింపు విధానం" : "Method"}</th>
                    <th className="py-3 px-4 text-right">{language === "te" ? "మొత్తం" : "Amount"}</th>
                    <th className="py-3 px-4 text-center">{language === "te" ? "స్థితి" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.map((row: any, idx: number) => {
                    const isPending = row.status === "PENDING";
                    const isPaid = row.status === "PAID" || row.status === "SETTLED" || row.status === "RECEIVED";
                    const isPartial = row.status === "PARTIALLY_PAID";
                    const isOverdue = row.status === "OVERDUE";

                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-500 whitespace-nowrap">{row.date}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                          {row.title}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{row.category}</td>
                        <td className="py-3 px-4 text-slate-500">
                          <span className="uppercase text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {row.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPaid
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : isPartial
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : isOverdue
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
