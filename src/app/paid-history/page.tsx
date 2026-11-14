"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  History,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import * as XLSX from "xlsx";

export default function PaidHistoryPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  // Modals
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);

  // Edit State
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMethod, setEditMethod] = useState("UPI");
  const [editRef, setEditRef] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPaidHistory = () => {
    setLoading(true);
    fetch("/api/debts/settlements?type=BORROWED")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          let list = data;
          if (methodFilter !== "all") {
            list = list.filter((s: any) => (s.paymentMethod || "UPI") === methodFilter);
          }
          if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
              (s: any) =>
                s.debt?.title?.toLowerCase().includes(q) ||
                s.debt?.party?.name?.toLowerCase().includes(q) ||
                s.referenceNumber?.toLowerCase().includes(q) ||
                s.notes?.toLowerCase().includes(q)
            );
          }
          setSettlements(list);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPaidHistory();
    const handleDataChange = () => fetchPaidHistory();
    window.addEventListener("finance_data_changed", handleDataChange);
    return () => window.removeEventListener("finance_data_changed", handleDataChange);
  }, [methodFilter, search]);

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        language === "te"
          ? "ఈ చెల్లింపును తొలగించాలనుకుంటున్నారా? దీనితో లింక్ చేయబడిన పెండింగ్ బకాయి మరియు ఖాతా బ్యాలెన్స్ స్వయంచాలకంగా పునరుద్ధరించబడతాయి."
          : "Are you sure you want to delete this payment record? The linked pending payable balance and account will be automatically recalculated."
      )
    )
      return;

    try {
      const res = await fetch(`/api/debts/settlements/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPaidHistory();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete settlement");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/debts/settlements/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          paymentDate: editDate,
          paymentMethod: editMethod,
          referenceNumber: editRef,
          notes: editNotes,
        }),
      });

      if (res.ok) {
        setEditItem(null);
        fetchPaidHistory();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update payment");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPaidSum = settlements.reduce((sum, s) => sum + s.amountPaid, 0);

  const exportExcel = () => {
    const isTe = language === "te";
    const rows = settlements.map((s) => ({
      [isTe ? "చెల్లింపు పేరు" : "Payment Name"]: s.debt?.title || s.debt?.party?.name || "Settlement",
      [isTe ? "వ్యక్తి / సంస్థ" : "Person / Company"]: s.debt?.party?.name || "",
      [isTe ? "చెల్లించిన మొత్తం (₹)" : "Paid Amount"]: s.amountPaid,
      [isTe ? "చెల్లింపు తేదీ" : "Payment Date"]: formatDate(s.paymentDate),
      [isTe ? "చెల్లింపు విధానం" : "Payment Method"]: s.paymentMethod || "UPI",
      [isTe ? "రెఫరెన్స్ నంబర్" : "Reference Number"]: s.referenceNumber || "",
      [isTe ? "ఖాతా" : "Paid From Account"]: s.transaction?.account?.name || "",
      [isTe ? "వివరాలు" : "Notes"]: s.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Paid_History");
    XLSX.writeFile(wb, `Paid_History_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <History size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === "te" ? "చెల్లింపుల చరిత్ర (Paid History)" : "Paid History"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === "te"
              ? "పెండింగ్ లేదా పాక్షిక చెల్లింపులను చెల్లించిన ప్రతిసారీ ఇక్కడ స్వయంచాలకంగా నమోదు అవుతాయి."
              : "Complete ledger of all payments made towards pending payables with automatic balance reconciliation."}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download size={14} />
          <span>{language === "te" ? "ఎగుమతి (Excel)" : "Export Excel"}</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              {language === "te" ? "మొత్తం చెల్లించిన మొత్తం" : "Total Paid Amount"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
              {formatCurrency(totalPaidSum)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {settlements.length}{" "}
              {language === "te" ? "చెల్లింపు లావాదేవీలు" : "settlement transactions recorded"}
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
              {language === "te" ? "చెల్లింపు విధానం:" : "Method:"}
            </span>
            {[
              { id: "all", label: t("common.all") },
              { id: "UPI", label: "UPI" },
              { id: "CASH", label: "Cash" },
              { id: "BANK_TRANSFER", label: "Bank Transfer" },
              { id: "DEBIT_CARD", label: "Debit Card" },
              { id: "CREDIT_CARD", label: "Credit Card" },
              { id: "CHEQUE", label: "Cheque" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethodFilter(m.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  methodFilter === m.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === "te" ? "పేరు, వ్యక్తి లేదా రెఫరెన్స్ నంబర్ ద్వారా వెతకండి..." : "Search name, person, or UTR..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlements Table / List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : settlements.length > 0 ? (
          settlements.map((item) => {
            return (
              <Card key={item.id} className="overflow-hidden hover:shadow-xs transition-shadow">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-500 text-white font-bold shrink-0 mt-0.5">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {item.debt?.title || item.debt?.party?.name || "Payment"}
                        </h3>
                        <Badge variant="success">
                          {language === "te" ? "చెల్లించబడింది" : "Paid"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>
                          {language === "te" ? "వ్యక్తి / సంస్థ:" : "Person / Company:"}{" "}
                          <strong className="text-slate-700 dark:text-slate-200">{item.debt?.party?.name}</strong>
                        </span>
                        <span>• {formatDate(item.paymentDate)}</span>
                        {item.debt?.dueDate && (
                          <span className="text-[11px] text-slate-400">
                            ({language === "te" ? "గడువు:" : "Due:"} {formatDate(item.debt.dueDate)})
                          </span>
                        )}
                        <span>• {item.paymentMethod || "UPI"}</span>
                        {item.referenceNumber && (
                          <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-600 dark:text-slate-300">
                            Ref: {item.referenceNumber}
                          </span>
                        )}
                        {item.transaction?.account?.name && (
                          <span>({item.transaction.account.name})</span>
                        )}
                        {item.notes && <span className="italic">"{item.notes}"</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {language === "te" ? "చెల్లించిన మొత్తం" : "Paid Amount"}
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.amountPaid)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewItem(item)}
                        title="View Details"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => {
                          setEditItem(item);
                          setEditAmount(item.amountPaid.toString());
                          setEditDate(item.paymentDate ? item.paymentDate.split("T")[0] : "");
                          setEditMethod(item.paymentMethod || "UPI");
                          setEditRef(item.referenceNumber || "");
                          setEditNotes(item.notes || "");
                        }}
                        title="Edit Payment"
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete Payment (Recalculates Balance)"
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
                <History size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {language === "te" ? "ఎలాంటి చెల్లింపు చరిత్ర లేదు" : "No paid history recorded yet"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === "te"
                  ? "మీరు పెండింగ్ చెల్లింపులను 'Mark as Paid' చేసినప్పుడు, ఆ వివరాలు ఇక్కడ కనిపిస్తాయి."
                  : "When you mark pending payments as paid, the detailed transaction history will appear here."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Payment Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === "te" ? "చెల్లింపు వివరాల సవరణ" : "Edit Paid Record"}
              </h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "చెల్లించిన మొత్తం (₹) *" : "Paid Amount (₹) *"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "చెల్లింపు తేదీ *" : "Payment Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "విధానం *" : "Payment Method *"}
                  </label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "రెఫరెన్స్ నంబర్ / UTR" : "Reference Number / UTR"}
                </label>
                <input
                  type="text"
                  placeholder="UTR, Ref ID"
                  value={editRef}
                  onChange={(e) => setEditRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditItem(null)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="emerald" size="sm" disabled={submitting}>
                  {submitting ? t("common.loading") : language === "te" ? "సేవ్ చేయండి" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Item Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                {language === "te" ? "చెల్లింపు రసీదు వివరాలు" : "Payment Receipt Details"}
              </h3>
              <button onClick={() => setViewItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "చెల్లింపు పేరు:" : "Payment Name:"}</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewItem.debt?.title || viewItem.debt?.party?.name}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "వ్యక్తి / సంస్థ:" : "Recipient:"}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewItem.debt?.party?.name}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "చెల్లించిన మొత్తం:" : "Paid Amount:"}</span>
                <span className="font-extrabold text-emerald-600 text-sm">{formatCurrency(viewItem.amountPaid)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "చెల్లింపు తేదీ:" : "Payment Date:"}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(viewItem.paymentDate)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "విధానం:" : "Method:"}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{viewItem.paymentMethod || "UPI"}</span>
              </div>

              {viewItem.referenceNumber && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">{language === "te" ? "రెఫరెన్స్ నంబర్:" : "Reference / UTR:"}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{viewItem.referenceNumber}</span>
                </div>
              )}

              {viewItem.transaction?.account?.name && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">{language === "te" ? "చెల్లించిన ఖాతా:" : "Paid From:"}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{viewItem.transaction.account.name}</span>
                </div>
              )}

              {viewItem.notes && (
                <div className="py-1.5">
                  <span className="text-slate-400 block mb-0.5">{language === "te" ? "నోట్స్:" : "Notes:"}</span>
                  <p className="text-slate-700 dark:text-slate-300 italic">{viewItem.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewItem(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

