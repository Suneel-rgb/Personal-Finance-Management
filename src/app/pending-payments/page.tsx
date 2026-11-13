"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Clock,
  PlusCircle,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  History,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SettleDebtModal } from "@/components/modals/SettleDebtModal";
import * as XLSX from "xlsx";

export default function PendingPaymentsPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState("active"); // active, all, PENDING, PARTIALLY_PAID, OVERDUE, SETTLED
  const [freqFilter, setFreqFilter] = useState("all"); // all, WEEKLY, MONTHLY, ONE_TIME
  const [search, setSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedForSettle, setSelectedForSettle] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add Form State
  const [paymentName, setPaymentName] = useState("");
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("ONE_TIME");
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editParty, setEditParty] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editFrequency, setEditFrequency] = useState("ONE_TIME");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchPayables = () => {
    setLoading(true);
    fetch("/api/debts")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error && res.payables) {
          let list = res.payables;

          // Default "active" view hides settled payments
          if (statusFilter === "active") {
            list = list.filter((p: any) => p.status !== "SETTLED");
          } else if (statusFilter !== "all") {
            list = list.filter((p: any) => p.status === statusFilter);
          }

          if (freqFilter !== "all") {
            list = list.filter((p: any) => (p.frequency || "ONE_TIME") === freqFilter);
          }

          if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
              (p: any) =>
                p.title?.toLowerCase().includes(q) ||
                p.party?.name?.toLowerCase().includes(q) ||
                p.notes?.toLowerCase().includes(q)
            );
          }
          setPayables(list);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayables();
    const handleDataChange = () => fetchPayables();
    window.addEventListener("finance_data_changed", handleDataChange);
    return () => window.removeEventListener("finance_data_changed", handleDataChange);
  }, [statusFilter, freqFilter, search]);

  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || !partyName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paymentName.trim() || `Payment for ${partyName.trim()}`,
          partyName: partyName.trim(),
          type: "BORROWED",
          frequency,
          amount: num,
          dueDate: dueDate || undefined,
          paymentMethod,
          notes,
        }),
      });

      if (res.ok) {
        setPaymentName("");
        setPartyName("");
        setAmount("");
        setDueDate("");
        setNotes("");
        setShowAddModal(false);
        fetchPayables();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to create payable record");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/debts/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          partyName: editParty,
          originalAmount: editAmount ? parseFloat(editAmount) : undefined,
          frequency: editFrequency,
          dueDate: editDueDate || null,
          notes: editNotes,
        }),
      });

      if (res.ok) {
        setEditItem(null);
        fetchPayables();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update payable");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        language === "te"
          ? "ఈ బాకీ రికార్డును తొలగించాలనుకుంటున్నారా?"
          : "Are you sure you want to delete this pending payment?"
      )
    )
      return;
    try {
      const res = await fetch(`/api/debts/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPayables();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalOutstanding = payables
    .filter((p) => p.status !== "SETTLED")
    .reduce((sum, p) => sum + p.remainingAmount, 0);

  const exportExcel = () => {
    const isTe = language === "te";
    const rows = payables.map((p) => ({
      [isTe ? "చెల్లింపు పేరు" : "Payment Name"]: p.title || p.party?.name,
      [isTe ? "వ్యక్తి / సంస్థ" : "Person / Company"]: p.party?.name || "",
      [isTe ? "మొత్తం విలువ (₹)" : "Total Amount"]: p.originalAmount,
      [isTe ? "చెల్లించిన మొత్తం (₹)" : "Paid Amount"]: p.paidAmount || (p.originalAmount - p.remainingAmount),
      [isTe ? "మిగిలిన బకాయి (₹)" : "Remaining Due"]: p.remainingAmount,
      [isTe ? "చెల్లింపు రకం" : "Frequency"]: p.frequency || "ONE_TIME",
      [isTe ? "గడువు తేదీ" : "Due Date"]: p.dueDate ? formatDate(p.dueDate) : "",
      [isTe ? "స్థితి" : "Status"]: p.status,
      [isTe ? "వివరాలు" : "Notes"]: p.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending_Payments");
    XLSX.writeFile(wb, `Pending_Payments_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === "te" ? "చెల్లించాల్సిన బాకీలు (Pending Payments)" : "Pending Payments (Payables)"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === "te"
              ? "వారపు, నెలవారీ లేదా ఒక్కసారి చెల్లించాల్సిన బకాయిలను నమోదు చేయండి మరియు ట్రాక్ చేయండి."
              : "Manage upcoming weekly, monthly, and one-time payables with partial and full settlement tracking."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download size={14} />
            <span>{language === "te" ? "ఎగుమతి (Excel)" : "Export Excel"}</span>
          </Button>
          <Button variant="emerald" size="sm" onClick={() => setShowAddModal(true)}>
            <PlusCircle size={15} />
            <span>{language === "te" ? "+ కొత్త చెల్లింపు నమోదు" : "+ Add Pending Payment"}</span>
          </Button>
        </div>
      </div>

      {/* KPI Highlight Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              {language === "te" ? "మొత్తం పెండింగ్ చెల్లింపులు" : "Total Pending Payments"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-700 dark:text-amber-400">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {payables.filter((p) => p.status !== "SETTLED").length}{" "}
              {language === "te" ? "క్రియాశీల పెండింగ్ బాకీలు" : "active pending obligations"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={13} />
                {t("debts.status")}:
              </span>
              {[
                { id: "active", label: language === "te" ? "క్రియాశీల (Active)" : "Active Pending" },
                { id: "all", label: t("common.all") },
                { id: "PENDING", label: language === "te" ? "పెండింగ్" : "Pending" },
                { id: "PARTIALLY_PAID", label: language === "te" ? "కొంత చెల్లించినవి" : "Partially Paid" },
                { id: "OVERDUE", label: language === "te" ? "గడువు ముగిసినవి" : "Overdue" },
                { id: "SETTLED", label: language === "te" ? "పూర్తయినవి (Paid)" : "Paid" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Frequency Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold">{language === "te" ? "రకం:" : "Frequency:"}</span>
              <select
                value={freqFilter}
                onChange={(e) => setFreqFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">{language === "te" ? "అన్ని రకాలు" : "All Frequencies"}</option>
                <option value="WEEKLY">{language === "te" ? "వారపు చెల్లింపులు" : "Weekly Payments"}</option>
                <option value="MONTHLY">{language === "te" ? "నెలవారీ చెల్లింపులు" : "Monthly Payments"}</option>
                <option value="ONE_TIME">{language === "te" ? "ఒక్కసారి చెల్లింపులు" : "One-Time Payments"}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === "te" ? "పేరు లేదా వ్యక్తి ద్వారా వెతకండి..." : "Search by name or creditor..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payables Cards List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payables.length > 0 ? (
          payables.map((item) => {
            const isSettled = item.status === "SETTLED";
            const isOverdue = item.status === "OVERDUE";
            const isPartial = item.status === "PARTIALLY_PAID";
            const isExpanded = expandedId === item.id;
            const paid = item.paidAmount || (item.originalAmount - item.remainingAmount);

            const progressPct = Math.round(
              ((item.originalAmount - item.remainingAmount) / item.originalAmount) * 100
            );

            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 rounded-2xl bg-amber-500 text-white font-bold shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {item.title || item.party?.name}
                        </h3>

                        {/* Status Badges with strictly required colors */}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${
                            isSettled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                              : isOverdue
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                              : isPartial
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                          }`}
                        >
                          {isSettled
                            ? language === "te" ? "చెల్లించబడింది" : "Paid"
                            : isOverdue
                            ? language === "te" ? "గడువు ముగిసింది" : "Overdue"
                            : isPartial
                            ? language === "te" ? "కొంత చెల్లించారు" : "Partially Paid"
                            : language === "te" ? "పెండింగ్" : "Pending"}
                        </span>

                        {item.frequency && item.frequency !== "ONE_TIME" && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {item.frequency === "WEEKLY"
                              ? language === "te" ? "వారపు" : "Weekly"
                              : language === "te" ? "నెలవారీ" : "Monthly"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>
                          {language === "te" ? "ఎవరికి చెల్లించాలి:" : "Creditor:"}{" "}
                          <strong className="text-slate-700 dark:text-slate-200">{item.party?.name}</strong>
                        </span>
                        {item.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(item.dueDate)}
                          </span>
                        )}
                        {item.notes && <span className="italic">"{item.notes}"</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions & Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-right">
                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        {language === "te" ? "మిగిలిన బకాయి / అసలు" : "Remaining Due / Orig"}
                      </span>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(item.originalAmount)}
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          {formatCurrency(item.remainingAmount)}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                        {language === "te" ? "చెల్లించినది: " : "Paid: "}
                        {formatCurrency(paid)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {!isSettled && (
                        <button
                          onClick={() => setSelectedForSettle(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          <span>{language === "te" ? "చెల్లించండి" : "Mark as Paid"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setDetailItem(item)}
                        title="View Details"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => {
                          setEditItem(item);
                          setEditTitle(item.title || "");
                          setEditParty(item.party?.name || "");
                          setEditAmount(item.originalAmount.toString());
                          setEditFrequency(item.frequency || "ONE_TIME");
                          setEditDueDate(item.dueDate ? item.dueDate.split("T")[0] : "");
                          setEditNotes(item.notes || "");
                        }}
                        title="Edit Record"
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete Record"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 pb-3">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{language === "te" ? "చెల్లింపు పురోగతి" : "Repayment Progress"}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {progressPct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Partial Settlement Logs Accordion */}
                {item.settlements && item.settlements.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 px-5 py-2.5">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <History size={13} />
                      <span>
                        {language === "te"
                          ? `పాక్షిక చెల్లింపుల చరిత్ర (${item.settlements.length})`
                          : `Settlement Payment History (${item.settlements.length})`}
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        {item.settlements.map((s: any) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between text-xs py-1"
                          >
                            <span className="text-slate-500">
                              {formatDate(s.paymentDate)} •{" "}
                              {s.transaction?.account?.name || "Account"} • {s.paymentMethod || "UPI"}
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(s.amountPaid)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400 text-xs">
            {language === "te" ? "చెల్లించాల్సిన బాకీలు ఏవీ లేవు." : "No pending payables recorded."}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                {language === "te" ? "కొత్త చెల్లింపు బాకీ నమోదు" : "Add Pending Payable"}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreatePayable} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "చెల్లింపు పేరు *" : "Payment Name (e.g. Office Rent, Supplier Mastan) *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mastan Supplier, Office Rent"
                  value={paymentName}
                  onChange={(e) => setPaymentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "ఎవరికి చెల్లించాలి? (వ్యక్తి/సంస్థ పేరు) *" : "Person / Company Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mastan, HDFC Bank, Landlord"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "మొత్తం విలువ (₹) *" : "Total Amount (₹) *"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "చెల్లింపు రకం *" : "Payment Frequency *"}
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="ONE_TIME">{language === "te" ? "ఒక్కసారి (One-Time)" : "One-Time Payment"}</option>
                    <option value="WEEKLY">{language === "te" ? "వారపు చెల్లింపు (Weekly)" : "Weekly Payment"}</option>
                    <option value="MONTHLY">{language === "te" ? "నెలవారీ చెల్లింపు (Monthly)" : "Monthly Payment"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "గడువు తేదీ" : "Due Date"}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "చెల్లింపు విధానం" : "Preferred Method"}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "వివరణ / నోట్స్" : "Payment Description / Notes"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly 1000, Material purchase"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  {t("common.cancel")}
                </Button>
                <Button variant="emerald" size="sm" type="submit" disabled={submitting}>
                  {submitting ? t("common.loading") : language === "te" ? "సేవ్ చేయండి" : "Save Pending Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === "te" ? "చెల్లింపు బాకీ సవరణ" : "Edit Pending Payment"}
              </h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdatePayable} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "చెల్లింపు పేరు *" : "Payment Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "వ్యక్తి లేదా సంస్థ *" : "Person / Company *"}
                </label>
                <input
                  type="text"
                  required
                  value={editParty}
                  onChange={(e) => setEditParty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "మొత్తం విలువ (₹)" : "Total Amount (₹)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "చెల్లింపు రకం" : "Frequency"}
                  </label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="ONE_TIME">One-Time</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "గడువు తేదీ" : "Due Date"}
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "వివరాలు" : "Notes"}
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setEditItem(null)}>
                  {t("common.cancel")}
                </Button>
                <Button variant="emerald" size="sm" type="submit" disabled={submitting}>
                  {submitting ? t("common.loading") : language === "te" ? "నవీకరించండి" : "Update"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye size={16} className="text-amber-600" />
                {detailItem.title || detailItem.party?.name}
              </h3>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <span className="text-slate-400 block">{language === "te" ? "అసలు మొత్తం:" : "Original:"}</span>
                <span className="font-extrabold text-slate-800 dark:text-white">{formatCurrency(detailItem.originalAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === "te" ? "చెల్లించినది:" : "Paid:"}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(detailItem.paidAmount || (detailItem.originalAmount - detailItem.remainingAmount))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === "te" ? "మిగిలినది:" : "Remaining:"}</span>
                <span className="font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(detailItem.remainingAmount)}</span>
              </div>
            </div>

            <div className="space-y-2 py-2">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "వ్యక్తి / సంస్థ:" : "Recipient:"}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{detailItem.party?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "చెల్లింపు రకం:" : "Frequency:"}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{detailItem.frequency || "ONE_TIME"}</span>
              </div>
              {detailItem.dueDate && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">{language === "te" ? "గడువు తేదీ:" : "Due Date:"}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(detailItem.dueDate)}</span>
                </div>
              )}
              {detailItem.notes && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-0.5">{language === "te" ? "వివరణ:" : "Notes:"}</span>
                  <p className="text-slate-700 dark:text-slate-300 italic">{detailItem.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setDetailItem(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {selectedForSettle && (
        <SettleDebtModal
          isOpen={!!selectedForSettle}
          debt={selectedForSettle}
          onClose={() => setSelectedForSettle(null)}
          onSuccess={() => {
            fetchPayables();
            setSelectedForSettle(null);
          }}
        />
      )}
    </div>
  );
}
