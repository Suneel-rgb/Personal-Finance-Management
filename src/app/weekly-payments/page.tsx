"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Calendar,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Clock,
  History,
  AlertCircle,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SettleDebtModal } from "@/components/modals/SettleDebtModal";
import * as XLSX from "xlsx";

export default function WeeklyPaymentsPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, PENDING, PARTIALLY_PAID, SETTLED, OVERDUE

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedForSettle, setSelectedForSettle] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);

  // Add Form
  const [paymentName, setPaymentName] = useState("");
  const [personCompany, setPersonCompany] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Form
  const [editName, setEditName] = useState("");
  const [editPerson, setEditPerson] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchWeeklyPayments = () => {
    setLoading(true);
    fetch("/api/debts?frequency=WEEKLY")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error && res.payables) {
          // Payables with Weekly frequency
          let list = res.payables.filter(
            (p: any) => p.frequency === "WEEKLY" || p.notes?.toLowerCase().includes("weekly")
          );
          if (statusFilter !== "all") {
            list = list.filter((p: any) => p.status === statusFilter);
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
          setPayments(list);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWeeklyPayments();
    const handleDataChange = () => fetchWeeklyPayments();
    window.addEventListener("finance_data_changed", handleDataChange);
    return () => window.removeEventListener("finance_data_changed", handleDataChange);
  }, [statusFilter, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || !personCompany.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paymentName.trim() || `Weekly Payment for ${personCompany.trim()}`,
          partyName: personCompany.trim(),
          type: "BORROWED",
          frequency: "WEEKLY",
          amount: num,
          dueDate: dueDate || undefined,
          paymentMethod,
          notes,
        }),
      });

      if (res.ok) {
        setPaymentName("");
        setPersonCompany("");
        setAmount("");
        setDueDate("");
        setNotes("");
        setShowAddModal(false);
        fetchWeeklyPayments();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add weekly payment");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/debts/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editName,
          partyName: editPerson,
          originalAmount: editAmount ? parseFloat(editAmount) : undefined,
          dueDate: editDueDate || null,
          notes: editNotes,
        }),
      });

      if (res.ok) {
        setEditItem(null);
        fetchWeeklyPayments();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update record");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === "te" ? "ఈ వారపు చెల్లింపును తొలగించాలనుకుంటున్నారా?" : "Are you sure you want to delete this weekly payment?")) return;
    try {
      const res = await fetch(`/api/debts/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchWeeklyPayments();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateNextWeek = async (item: any) => {
    try {
      const res = await fetch("/api/debts/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debtId: item.id }),
      });
      if (res.ok) {
        alert(language === "te" ? "వచ్చే వారం చెల్లింపు రికార్డ్ విజయవంతంగా సృష్టించబడింది!" : "Next week's payment scheduled successfully!");
        fetchWeeklyPayments();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to generate next week's payment");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalWeeklyRemaining = payments
    .filter((p) => p.status !== "SETTLED")
    .reduce((sum, p) => sum + p.remainingAmount, 0);

  const totalWeeklyPaid = payments.reduce((sum, p) => sum + (p.paidAmount || (p.originalAmount - p.remainingAmount)), 0);

  const exportExcel = () => {
    const isTe = language === "te";
    const rows = payments.map((p) => ({
      [isTe ? "చెల్లింపు పేరు" : "Payment Name"]: p.title || p.party?.name,
      [isTe ? "వ్యక్తి / కంపెనీ" : "Person / Company"]: p.party?.name || "",
      [isTe ? "మొత్తం విలువ (₹)" : "Total Amount"]: p.originalAmount,
      [isTe ? "చెల్లించినది (₹)" : "Paid Amount"]: p.paidAmount || (p.originalAmount - p.remainingAmount),
      [isTe ? "మిగిలినది (₹)" : "Remaining Amount"]: p.remainingAmount,
      [isTe ? "గడువు తేదీ" : "Due Date"]: p.dueDate ? formatDate(p.dueDate) : "",
      [isTe ? "స్థితి" : "Status"]: p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly_Payments");
    XLSX.writeFile(wb, `Weekly_Payments_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Calendar size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === "te" ? "వారపు చెల్లింపులు (Weekly Payments)" : "Weekly Payments"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === "te"
              ? "ఉద్యోగుల వారపు జీతాలు, రెగ్యులర్ సప్లయర్లు మరియు వారపు ఖర్చుల చెల్లింపుల ట్రాకింగ్."
              : "Manage recurring weekly employee salaries, supplier payments, and weekly obligations."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download size={14} />
            <span>{language === "te" ? "ఎగుమతి (Excel)" : "Export Excel"}</span>
          </Button>
          <Button variant="emerald" size="sm" onClick={() => setShowAddModal(true)}>
            <PlusCircle size={15} />
            <span>{language === "te" ? "+ కొత్త వారపు చెల్లింపు" : "+ Add Weekly Payment"}</span>
          </Button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-900/60">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400">
              {language === "te" ? "వారపు మిగిలిన బకాయి" : "Total Pending This Week"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-indigo-700 dark:text-indigo-400">
              {formatCurrency(totalWeeklyRemaining)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {payments.filter((p) => p.status !== "SETTLED").length}{" "}
              {language === "te" ? "క్రియాశీల చెల్లింపులు" : "active weekly dues"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              {language === "te" ? "ఇప్పటికే చెల్లించిన మొత్తం" : "Total Paid Amount"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
              {formatCurrency(totalWeeklyPaid)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {payments.filter((p) => p.status === "SETTLED").length}{" "}
              {language === "te" ? "పూర్తయిన చెల్లింపులు" : "fully completed"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={13} />
              {t("debts.status")}:
            </span>
            {[
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === "te" ? "చెల్లింపు పేరు లేదా వ్యక్తి ద్వారా వెతకండి..." : "Search payment or recipient..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length > 0 ? (
          payments.map((item) => {
            const isSettled = item.status === "SETTLED";
            const isOverdue = item.status === "OVERDUE";
            const isPartial = item.status === "PARTIALLY_PAID";
            const paid = item.paidAmount || (item.originalAmount - item.remainingAmount);

            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 rounded-2xl bg-indigo-600 text-white font-bold shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {item.title || item.party?.name}
                        </h3>
                        <Badge
                          variant={
                            isSettled
                              ? "success"
                              : isOverdue
                              ? "danger"
                              : isPartial
                              ? "info"
                              : "warning"
                          }
                        >
                          {isSettled
                            ? language === "te" ? "చెల్లించబడింది" : "Paid"
                            : isOverdue
                            ? language === "te" ? "గడువు ముగిసింది" : "Overdue"
                            : isPartial
                            ? language === "te" ? "కొంత చెల్లించారు" : "Partially Paid"
                            : language === "te" ? "పెండింగ్" : "Pending"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>
                          {language === "te" ? "వ్యక్తి / కంపెనీ:" : "Recipient:"}{" "}
                          <strong className="text-slate-700 dark:text-slate-200">{item.party?.name}</strong>
                        </span>
                        {item.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(item.dueDate)}
                          </span>
                        )}
                        {item.notes && <span className="italic">"{item.notes}"</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right Financial Amounts & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-right">
                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        {language === "te" ? "మొత్తం / మిగిలినది" : "Total / Remaining"}
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

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {!isSettled ? (
                        <button
                          onClick={() => setSelectedForSettle(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <CheckCircle2 size={13} />
                          <span>{language === "te" ? "చెల్లించండి" : "Mark as Paid"}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGenerateNextWeek(item)}
                          title="Generate Next Week's Payment"
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <RefreshCw size={13} />
                          <span>{language === "te" ? "+ వచ్చే వారం" : "+ Next Week"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setDetailItem(item)}
                        title="View Details & History"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => {
                          setEditItem(item);
                          setEditName(item.title || "");
                          setEditPerson(item.party?.name || "");
                          setEditAmount(item.originalAmount.toString());
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
              </Card>
            );
          })
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Calendar size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {language === "te" ? "ఎలాంటి వారపు చెల్లింపులు లేవు" : "No weekly payments recorded"}
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {language === "te"
                  ? "మీ ఉద్యోగుల జీతాలు లేదా వారపు ఖర్చులను ట్రాక్ చేయడానికి ఇప్పుడే నమోదు చేయండి."
                  : "Add recurring weekly expenses, wages, or vendor payments to stay on track."}
              </p>
              <Button variant="emerald" size="sm" onClick={() => setShowAddModal(true)}>
                <PlusCircle size={14} />
                <span>{language === "te" ? "+ కొత్త వారపు చెల్లింపు" : "+ Add Weekly Payment"}</span>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Weekly Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
                {language === "te" ? "వారపు చెల్లింపు నమోదు" : "Add Weekly Payment"}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "చెల్లింపు పేరు *" : "Payment Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Worker Ramesh Wages, Supplier A"
                  value={paymentName}
                  onChange={(e) => setPaymentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "వ్యక్తి లేదా కంపెనీ పేరు *" : "Person / Company Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh, Mastan, Supplier"
                  value={personCompany}
                  onChange={(e) => setPersonCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "వారపు మొత్తం (₹) *" : "Total Amount (₹) *"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "గడువు తేదీ *" : "Due Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "చెల్లింపు విధానం" : "Preferred Payment Method"}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "వివరాలు / నోట్స్" : "Description / Notes"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Saturday settlement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="emerald" size="sm" disabled={submitting}>
                  {submitting ? t("common.loading") : language === "te" ? "సేవ్ చేయండి" : "Save Weekly Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === "te" ? "వారపు చెల్లింపు సవరణ" : "Edit Weekly Payment"}
              </h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "చెల్లింపు పేరు *" : "Payment Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "వ్యక్తి లేదా కంపెనీ *" : "Person / Company *"}
                </label>
                <input
                  type="text"
                  required
                  value={editPerson}
                  onChange={(e) => setEditPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "గడువు తేదీ" : "Due Date"}
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "వివరాలు" : "Notes"}
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditItem(null)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="emerald" size="sm" disabled={submitting}>
                  {submitting ? t("common.loading") : language === "te" ? "నవీకరించండి" : "Update Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Settlements History Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History size={16} className="text-indigo-600" />
                {detailItem.title || detailItem.party?.name}
              </h3>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block">{language === "te" ? "మొత్తం:" : "Total:"}</span>
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

            {/* Settlements List */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {language === "te" ? "చెల్లింపుల చరిత్ర (Settlement Payments):" : "Payment History:"}
              </h4>
              {detailItem.settlements && detailItem.settlements.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {detailItem.settlements.map((s: any) => (
                    <div key={s.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{formatCurrency(s.amountPaid)}</span>
                        <span className="text-[11px] text-slate-400">{formatDate(s.paymentDate)} • {s.paymentMethod || "UPI"}</span>
                      </div>
                      {s.notes && <span className="text-[11px] text-slate-500 italic max-w-xs truncate">{s.notes}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-3 text-center">
                  {language === "te" ? "ఇంతవరకు ఎలాంటి చెల్లింపులు చేయలేదు." : "No payment transactions recorded yet."}
                </p>
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

      {/* Settle Debt Confirmation Modal */}
      {selectedForSettle && (
        <SettleDebtModal
          isOpen={!!selectedForSettle}
          debt={selectedForSettle}
          onClose={() => setSelectedForSettle(null)}
          onSuccess={() => {
            fetchWeeklyPayments();
            setSelectedForSettle(null);
          }}
        />
      )}
    </div>
  );
}

