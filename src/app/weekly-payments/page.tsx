"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Calendar,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  Clock,
  AlertCircle,
  Download,
  Users,
  Wallet,
  ArrowRight,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building2,
  Banknote,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import * as XLSX from "xlsx";

export default function WeeklyPaymentsPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();
  const isTe = language === "te";

  // Data states
  const [weeklyLoans, setWeeklyLoans] = useState<any[]>([]);
  const [thisWeekInstallments, setThisWeekInstallments] = useState<any[]>([]);
  const [totalDueThisWeek, setTotalDueThisWeek] = useState(0);
  const [totalWeeklyRemaining, setTotalWeeklyRemaining] = useState(0);
  const [totalWeeklyPaid, setTotalWeeklyPaid] = useState(0);
  const [activeLendersCount, setActiveLendersCount] = useState(0);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<"this_week" | "all_loans">("this_week");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState<any | null>(null);

  // Add Loan Form Fields
  const [personName, setPersonName] = useState("");
  const [disbursedAmount, setDisbursedAmount] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [firstDueDate, setFirstDueDate] = useState(() => {
    // Default to next Monday or today
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [depositToAccount, setDepositToAccount] = useState(false);
  const [selectedDepositAccountId, setSelectedDepositAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Payment Form Fields (When marking installment as paid)
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("UPI");
  const [payNotes, setPayNotes] = useState("");
  const [payingLoading, setPayingLoading] = useState(false);

  // Auto-calculated fields for Add Form
  const totalRepayNum = parseFloat(originalAmount) || 0;
  const weeklyInstNum = parseFloat(installmentAmount) || 0;
  const disbursedNum = parseFloat(disbursedAmount) || 0;

  const calculatedWeeks = useMemo(() => {
    if (totalRepayNum > 0 && weeklyInstNum > 0) {
      return Math.ceil(totalRepayNum / weeklyInstNum);
    }
    return 0;
  }, [totalRepayNum, weeklyInstNum]);

  const calculatedDay = useMemo(() => {
    if (!firstDueDate) return "Monday";
    const d = new Date(firstDueDate);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[d.getDay()] || "Monday";
  }, [firstDueDate]);

  // Fetch Weekly Data
  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/debts/weekly?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setWeeklyLoans(json.weeklyLoans || []);
        setThisWeekInstallments(json.thisWeekInstallments || []);
        setTotalDueThisWeek(json.totalDueThisWeek || 0);
        setTotalWeeklyRemaining(json.totalWeeklyRemaining || 0);
        setTotalWeeklyPaid(json.totalWeeklyPaid || 0);
        setActiveLendersCount(json.activeLendersCount || 0);
      }
    } catch (err) {
      console.error("Failed to load weekly loans:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Accounts for deposit / payment
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accs) => {
        if (Array.isArray(accs)) {
          setAccounts(accs);
          if (accs.length > 0) {
            setSelectedDepositAccountId(accs[0].id);
            setPayAccountId(accs[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    fetchWeeklyData();

    const handleDataChanged = () => fetchWeeklyData();
    window.addEventListener("finance_data_changed", handleDataChanged);
    return () => window.removeEventListener("finance_data_changed", handleDataChanged);
  }, [search, statusFilter]);

  // Create new Weekly Loan
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || totalRepayNum <= 0 || weeklyInstNum <= 0) {
      alert(isTe ? "దయచేసి అన్ని వివరాలను నమోదు చేయండి." : "Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/debts/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyName: personName.trim(),
          disbursedAmount: disbursedNum > 0 ? disbursedNum : null,
          originalAmount: totalRepayNum,
          installmentAmount: weeklyInstNum,
          totalInstallments: calculatedWeeks,
          firstDueDate,
          depositToAccountId: depositToAccount ? selectedDepositAccountId : null,
          paymentMethod,
          notes,
        }),
      });

      if (res.ok) {
        setPersonName("");
        setDisbursedAmount("");
        setOriginalAmount("");
        setInstallmentAmount("");
        setDepositToAccount(false);
        setNotes("");
        setShowAddModal(false);
        fetchWeeklyData();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create weekly loan");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Pay Installment Modal
  const handleOpenPay = (inst: any) => {
    setPayingInstallment(inst);
    setPayAmount(inst.amount.toString());
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayNotes("");
  };

  // Submit Mark as Paid
  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInstallment) return;

    setPayingLoading(true);
    try {
      const res = await fetch("/api/debts/installments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: payingInstallment.id,
          amountPaid: parseFloat(payAmount) || payingInstallment.amount,
          accountId: payAccountId,
          paymentDate: payDate,
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });

      if (res.ok) {
        setPayingInstallment(null);
        fetchWeeklyData();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record payment");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setPayingLoading(false);
    }
  };

  // Delete Loan
  const handleDeleteLoan = async (id: string, name: string) => {
    if (
      !confirm(
        isTe
          ? `${name} యొక్క వారపు ఫైనాన్స్ రికార్డ్‌ను పూర్తిగా తొలగించాలనుకుంటున్నారా?`
          : `Are you sure you want to delete the weekly loan for ${name}?`
      )
    )
      return;

    try {
      const res = await fetch(`/api/debts/weekly/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchWeeklyData();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export to Excel
  const exportWeeklyExcel = () => {
    const rows = weeklyLoans.map((l) => ({
      [isTe ? "ఫైనాన్షియర్ / వ్యక్తి" : "Financier / Person"]: l.party?.name || "",
      [isTe ? "స్వీకరించిన మొత్తం (₹)" : "Disbursed Amount (₹)"]: l.disbursedAmount || "N/A",
      [isTe ? "చెల్లించాల్సిన మొత్తం (₹)" : "Total Repayment (₹)"]: l.originalAmount,
      [isTe ? "వారపు వాయిదా (₹)" : "Weekly Installment (₹)"]: l.installmentAmount || "N/A",
      [isTe ? "వారపు రోజు" : "Installment Day"]: l.installmentDay || "Monday",
      [isTe ? "చెల్లించిన మొత్తం (₹)" : "Paid Amount (₹)"]: l.paidAmount,
      [isTe ? "మిగిలిన బకాయి (₹)" : "Remaining Amount (₹)"]: l.remainingAmount,
      [isTe ? "వాయిదాల సంఖ్య" : "Total Weeks"]: l.totalInstallments || "N/A",
      [isTe ? "స్థితి" : "Status"]: l.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly_Finance");
    XLSX.writeFile(wb, `Weekly_Finance_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white font-bold shadow-sm">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {isTe ? "వారపు చెల్లింపులు & ఫైనాన్స్ (Weekly Payments)" : "Weekly Finance & Payments"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isTe
                  ? "వారపు రుణాలు (ఉదా: ₹9,500 తీసుకొని ₹12,000 వారానికి ₹1,000 చొప్పున చెల్లించేవి) మరియు ప్రతి వ్యక్తి వారపు వాయిదాల ట్రాకింగ్."
                  : "Track weekly micro-finance loans (e.g. Received ₹9,500, pay ₹12,000 at ₹1,000/week) across multiple people with one-click Mark as Paid."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportWeeklyExcel} className="text-xs font-bold">
            <Download size={14} className="mr-1" />
            <span>{isTe ? "ఎగుమతి" : "Export Excel"}</span>
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
          >
            <PlusCircle size={15} className="mr-1.5" />
            <span>{isTe ? "+ కొత్త వారపు ఫైనాన్స్ / లోన్" : "+ Add Weekly Loan / Payment"}</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Due This Week */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/10 border-amber-200 dark:border-amber-900/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              {isTe ? "ఈ వారం చెల్లించాల్సిన మొత్తం" : "Due This Week"}
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <Clock size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 tracking-tight block">
              {formatCurrency(totalDueThisWeek)}
            </span>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-amber-800/80 dark:text-amber-400/80 font-medium">
              <span>
                {thisWeekInstallments.length} {isTe ? "వాయిదాలు బకాయి ఉన్నాయి" : "installments due / overdue"}
              </span>
              <button
                onClick={() => setActiveTab("this_week")}
                className="font-bold underline hover:text-amber-900 cursor-pointer"
              >
                {isTe ? "చూడండి" : "View"} &rarr;
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Weekly Remaining */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isTe ? "మొత్తం మిగిలిన బకాయి" : "Total Remaining Debt"}
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <TrendingDown size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight block">
              {formatCurrency(totalWeeklyRemaining)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {isTe ? "అన్ని వారపు లోన్లలో మిగిలిన మొత్తం" : "Across all active weekly agreements"}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Paid So Far */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isTe ? "ఇప్పటివరకు చెల్లించినది" : "Total Paid Amount"}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight block">
              {formatCurrency(totalWeeklyPaid)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {isTe ? "వాస్తవంగా చెల్లించిన వాయిదాలు" : "Completed weekly payments"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Active Lenders */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isTe ? "క్రియాశీల ఫైనాన్షియర్లు" : "Active Lenders / People"}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Users size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight block">
              {activeLendersCount}
            </span>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {weeklyLoans.length} {isTe ? "మొత్తం వారపు లోన్లు నమోదు" : "total weekly loan records"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Navigation Tabs: "This Week's Schedule" vs "All Lenders & Loans" */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("this_week")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "this_week"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <Calendar size={15} />
            <span>{isTe ? "ఈ వారం చెల్లింపుల షెడ్యూల్" : "This Week's Schedule"}</span>
            {thisWeekInstallments.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900">
                {thisWeekInstallments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("all_loans")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all_loans"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <Users size={15} />
            <span>{isTe ? "వ్యక్తుల వారీగా లోన్లు (All Lenders)" : "All Lenders & Loans"}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {weeklyLoans.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isTe ? "వ్యక్తి లేదా లోన్ ద్వారా వెతకండి..." : "Search lender or loan..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 4. TAB 1: THIS WEEK'S INSTALLMENTS (Organized by Day with 1-Click Mark as Paid) */}
      {activeTab === "this_week" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <span>
                {isTe
                  ? "ఈ వారం చెల్లించాల్సిన వాయిదాలు (వివిధ వ్యక్తులకు)"
                  : "Payments to Make This Week (Across Multiple People)"}
              </span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {isTe ? "ప్రతి వారం నిర్ణీత రోజున చెల్లించాల్సిన మొత్తం" : "Fixed day weekly installments"}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : thisWeekInstallments.length === 0 ? (
            <Card className="text-center py-12 border-dashed border-slate-200 dark:border-slate-800">
              <CardContent className="space-y-2">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isTe ? "ఈ వారం ఎలాంటి పెండింగ్ చెల్లింపులు లేవు! 🎉" : "All weekly payments for this week are cleared! 🎉"}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {isTe
                    ? "మీరు ఈ వారంలో చెల్లించాల్సిన అన్ని వాయిదాలు పూర్తయ్యాయి లేదా కొత్త వాయిదాలు షెడ్యూల్ కాలేదు."
                    : "You have no outstanding weekly payments due this week. Click '+ Add Weekly Loan' to register a new agreement."}
                </p>
                <div className="pt-2">
                  <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white text-xs">
                    <PlusCircle size={14} className="mr-1" />
                    {isTe ? "+ కొత్త వారపు లోన్ జోడించండి" : "+ Add Weekly Loan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {thisWeekInstallments.map((inst) => {
                const isOverdue = inst.isPastDue;
                const dueDateObj = new Date(inst.dueDate);
                const dayName = dueDateObj.toLocaleDateString(language === "te" ? "te-IN" : "en-US", {
                  weekday: "long",
                });

                return (
                  <Card
                    key={inst.id}
                    className={`overflow-hidden transition-all hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs ${
                      isOverdue
                        ? "border-l-4 border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10"
                        : "border-l-4 border-l-amber-500 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Day & Person info */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`p-3 rounded-2xl font-bold shrink-0 text-center min-w-[65px] ${
                            isOverdue
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          }`}
                        >
                          <span className="text-[10px] uppercase block font-black leading-none mb-1">
                            {dayName.slice(0, 3)}
                          </span>
                          <span className="text-base font-black leading-none block">
                            {dueDateObj.getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {inst.lenderName}
                            </h3>
                            <Badge variant={isOverdue ? "danger" : "warning"}>
                              {isOverdue
                                ? isTe ? "గడువు ముగిసింది" : "Overdue"
                                : isTe ? "ఈ వారం చెల్లించాలి" : "Due This Week"}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {isTe ? "వాయిదా సంఖ్య: " : "Week: "}
                              {inst.installmentNumber} / {inst.totalInstallments}
                            </span>
                            <span>•</span>
                            <span>
                              {isTe ? "గడువు తేదీ: " : "Due: "}
                              <strong>{formatDate(inst.dueDate)} ({dayName})</strong>
                            </span>
                            {inst.disbursedAmount && (
                              <>
                                <span>•</span>
                                <span>
                                  {isTe ? "తీసుకున్నది: " : "Disbursed: "}
                                  {formatCurrency(inst.disbursedAmount)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            {isTe ? "ఈ వారం చెల్లించాల్సినది" : "Amount to Pay"}
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {formatCurrency(inst.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {isTe ? "మొత్తం మిగిలిన అప్పు: " : "Remaining balance: "}
                            {formatCurrency(inst.debtRemainingAmount)}
                          </span>
                        </div>

                        {/* Direct Mark as Paid Button */}
                        <Button
                          onClick={() => handleOpenPay(inst)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={15} />
                          <span>{isTe ? "చెల్లించినట్లు గుర్తించండి" : "Mark as Paid"}</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: ALL LENDERS / LOANS (Card per Person with Complete 12-Week Schedule) */}
      {activeTab === "all_loans" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              <span>
                {isTe ? "వ్యక్తుల వారీగా పూర్తి వారపు లోన్ల వివరాలు" : "All Weekly Agreements by Person"}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : weeklyLoans.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <Calendar size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isTe ? "ఎలాంటి వారపు లోన్లు నమోదు కాలేదు" : "No weekly loans recorded"}
                </h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  {isTe
                    ? "మీరు తీసుకున్న ఫైనాన్స్ (ఉదా: ₹9,500 తీసుకొని ₹12,000 చెల్లించేవి) ఇక్కడ నమోదు చేయండి."
                    : "Add your weekly loans and financiers to automatically track all installments."}
                </p>
                <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white text-xs">
                  <PlusCircle size={14} className="mr-1" />
                  {isTe ? "+ కొత్త వారపు లోన్ జోడించండి" : "+ Add Weekly Loan"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {weeklyLoans.map((loan) => {
                const isExpanded = expandedLoanId === loan.id;
                const isSettled = loan.status === "SETTLED" || loan.remainingAmount <= 0;
                const installments = loan.installments || [];
                const paidCount = installments.filter((i: any) => i.status === "PAID" || i.status === "SETTLED").length;
                const totalCount = installments.length || loan.totalInstallments || 1;
                const pct = Math.round((paidCount / totalCount) * 100);

                // Find next unpaid installment
                const nextDueInst = installments.find(
                  (i: any) => i.status !== "PAID" && i.status !== "SETTLED"
                );

                return (
                  <Card key={loan.id} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                    {/* Top Loan Summary Header */}
                    <div className="p-5 bg-white dark:bg-slate-900">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                            <Users size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-900 dark:text-white">
                                {loan.party?.name}
                              </h3>
                              <Badge variant={isSettled ? "success" : "info"}>
                                {isSettled
                                  ? isTe ? "పూర్తయింది (Paid)" : "Completed"
                                  : isTe ? "నడుస్తోంది (Active)" : "Active Loan"}
                              </Badge>
                              {loan.installmentDay && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  {isTe ? `ప్రతి ${loan.installmentDay}` : `Every ${loan.installmentDay}`}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {loan.notes || loan.title}
                            </p>

                            {/* Terms Overview */}
                            <div className="flex flex-wrap items-center gap-4 text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              {loan.disbursedAmount && (
                                <span>
                                  {isTe ? "స్వీకరించినది: " : "Disbursed: "}
                                  <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                                    {formatCurrency(loan.disbursedAmount)}
                                  </strong>
                                </span>
                              )}
                              <span>
                                {isTe ? "మొత్తం తిరిగి చెల్లించాల్సినది: " : "Total to Repay: "}
                                <strong className="text-slate-900 dark:text-white font-black">
                                  {formatCurrency(loan.originalAmount)}
                                </strong>
                              </span>
                              <span>
                                {isTe ? "వారపు వాయిదా: " : "Weekly Installment: "}
                                <strong className="text-indigo-600 dark:text-indigo-400 font-black">
                                  {formatCurrency(loan.installmentAmount || 0)}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Progress & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:self-center">
                          <div className="text-left lg:text-right min-w-[140px]">
                            <div className="flex items-center justify-between lg:justify-end gap-2">
                              <span className="text-xs text-slate-400 font-semibold">
                                {paidCount} / {totalCount} {isTe ? "వారాలు చెల్లించారు" : "weeks paid"}
                              </span>
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                {pct}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between lg:justify-end gap-2 text-[11px] mt-1 text-slate-500">
                              <span>
                                {isTe ? "మిగిలినది: " : "Left: "}
                                <strong className="text-rose-600 dark:text-rose-400">
                                  {formatCurrency(loan.remainingAmount)}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {nextDueInst && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPay(nextDueInst)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                              >
                                <CheckCircle2 size={14} className="mr-1" />
                                {isTe
                                  ? `వారం ${nextDueInst.installmentNumber} చెల్లించండి`
                                  : `Pay Week ${nextDueInst.installmentNumber}`}
                              </Button>
                            )}

                            <button
                              onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isTe ? "వారాల షెడ్యూల్" : "Schedule"}</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            <button
                              onClick={() => handleDeleteLoan(loan.id, loan.party?.name || "")}
                              title="Delete Record"
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED VIEW: Complete Week-by-Week Installment Table */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            {isTe
                              ? `${loan.party?.name} యొక్క పూర్తి ${installments.length} వారాల వాయిదాల జాబితా`
                              : `Full ${installments.length}-Week Schedule for ${loan.party?.name}`}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {isTe ? "ప్రతి వారం వాయిదా చెల్లించినప్పుడు 'Mark as Paid' నొక్కండి" : "Click 'Mark as Paid' as you clear each week"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                          {installments.map((inst: any) => {
                            const isPaid = inst.status === "PAID" || inst.status === "SETTLED";
                            const d = new Date(inst.dueDate);
                            const isPast = !isPaid && d < new Date();

                            return (
                              <div
                                key={inst.id}
                                className={`p-3 rounded-xl border text-xs transition-all ${
                                  isPaid
                                    ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-100"
                                    : isPast
                                    ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-100"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-bold">
                                    {isTe ? `వారం ${inst.installmentNumber}` : `Week ${inst.installmentNumber}`}
                                  </span>
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded-full">
                                      <Check size={10} /> Paid
                                    </span>
                                  ) : isPast ? (
                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900 px-1.5 py-0.5 rounded-full">
                                      Overdue
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded-full">
                                      Pending
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-baseline justify-between mb-2">
                                  <span className="text-sm font-black">
                                    {formatCurrency(inst.amount)}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {formatDate(inst.dueDate)}
                                  </span>
                                </div>

                                {!isPaid ? (
                                  <button
                                    onClick={() => handleOpenPay(inst)}
                                    className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <CheckCircle2 size={11} />
                                    <span>{isTe ? "చెల్లించండి" : "Mark as Paid"}</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block text-center font-medium">
                                    {inst.paidDate ? formatDate(inst.paidDate) : "Completed"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: ADD WEEKLY LOAN / AGREEMENT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Calendar size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isTe ? "కొత్త వారపు ఫైనాన్స్ / లోన్ నమోదు" : "Add Weekly Loan Agreement"}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-4 text-xs">
              {/* Financier / Person Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "ఫైనాన్షియర్ / వ్యక్తి పేరు *" : "Lender / Financier Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mastan, Ramesh Finance, Suresh"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Disbursed Amount (Giving) vs Total Amount (Pay back) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "వారు ఇచ్చిన అసలు మొత్తం (₹)" : "Amount Given / Received (₹)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 9500"
                    value={disbursedAmount}
                    onChange={(e) => setDisbursedAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isTe ? "ఉదా: చేతికి ఇచ్చిన ₹9,500" : "Disbursed amount you received"}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "మొత్తం తిరిగి చెల్లించాల్సినది (₹) *" : "Total Amount to Repay (₹) *"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 12000"
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isTe ? "ఉదా: మొత్తం కట్టాల్సిన ₹12,000" : "Total agreement repayment amount"}
                  </span>
                </div>
              </div>

              {/* Weekly Installment & First Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "ప్రతి వారం చెల్లించాల్సిన వాయిదా (₹) *" : "Weekly Installment Amount (₹) *"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1000"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isTe ? "ఉదా: వారానికి ₹1,000" : "Per week fixed payment"}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "మొదటి వాయిదా తేదీ *" : "First Payment Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">
                    {isTe ? `ప్రతి ${calculatedDay}` : `Repeats every ${calculatedDay}`}
                  </span>
                </div>
              </div>

              {/* Dynamic Calculation Info Box */}
              {totalRepayNum > 0 && weeklyInstNum > 0 && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
                    <span>{isTe ? "స్వయంచాలక గణన:" : "Auto-Generated Schedule Preview:"}</span>
                    <Badge className="bg-indigo-600 text-white font-black text-[10px]">
                      {calculatedWeeks} {isTe ? "వారాలు" : "Weeks"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                    {isTe
                      ? `ప్రతి ${calculatedDay}న ₹${weeklyInstNum.toLocaleString("en-IN")} చొప్పున ${calculatedWeeks} వారాల పాటు చెల్లింపు షెడ్యూల్ సృష్టించబడుతుంది.`
                      : `A complete ${calculatedWeeks}-week schedule will be generated at ₹${weeklyInstNum.toLocaleString("en-IN")}/week, repeating every ${calculatedDay}.`}
                  </p>
                  {disbursedNum > 0 && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-indigo-200/50 dark:border-indigo-800/50 flex justify-between">
                      <span>{isTe ? "అదనపు వడ్డీ / ఛార్జీ:" : "Interest / Finance Charge:"}</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatCurrency(totalRepayNum - disbursedNum)}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Deposit to Account Option */}
              {disbursedNum > 0 && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={depositToAccount}
                      onChange={(e) => setDepositToAccount(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {isTe
                        ? `తీసుకున్న ₹${disbursedNum.toLocaleString("en-IN")} నా ఖాతాలో జత చేయండి`
                        : `Add disbursed ₹${disbursedNum.toLocaleString("en-IN")} into my Account balance`}
                    </span>
                  </label>

                  {depositToAccount && (
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {isTe ? "జమ చేయవలసిన ఖాతా:" : "Select Account to credit:"}
                      </span>
                      <select
                        value={selectedDepositAccountId}
                        onChange={(e) => setSelectedDepositAccountId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({formatCurrency(acc.currentBalance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "గమనికలు / ఇతర వివరాలు" : "Notes / Remarks"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Finance broker Ramesh, Weekly payment agreement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  {isTe ? "రద్దు" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {submitting ? (isTe ? "నమోదు అవుతోంది..." : "Saving...") : isTe ? "షెడ్యూల్ సృష్టించండి" : "Create Agreement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: MARK INSTALLMENT AS PAID */}
      {payingInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isTe ? "వాయిదా చెల్లించినట్లు నమోదు" : "Mark Installment as Paid"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {payingInstallment.lenderName || "Weekly Payment"} • Week {payingInstallment.installmentNumber} of {payingInstallment.totalInstallments}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayingInstallment(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-3.5 text-xs">
              {/* Amount to pay */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "చెల్లిస్తున్న మొత్తం (₹) *" : "Amount Paying Now (₹) *"}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm"
                />
              </div>

              {/* Deduct from Account */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "చెల్లించిన ఖాతా *" : "Pay from Account *"}
                </label>
                <select
                  required
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isTe
                    ? "ఈ మొత్తం ఎంచుకున్న ఖాతా నుండి స్వయంచాలకంగా తీసివేయబడుతుంది."
                    : "This amount will be deducted from this account balance."}
                </span>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "చెల్లింపు విధానం" : "Payment Method"}
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="UPI">UPI / PhonePe / GPay</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "చెల్లించిన తేదీ" : "Payment Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "గమనికలు" : "Notes (Optional)"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash to Mastan"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPayingInstallment(null)}
                >
                  {isTe ? "రద్దు" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={payingLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {payingLoading
                    ? isTe ? "చెల్లింపు నమోదు అవుతోంది..." : "Recording..."
                    : isTe ? "చెల్లించినట్లు నిర్ధారించండి" : "Confirm Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
