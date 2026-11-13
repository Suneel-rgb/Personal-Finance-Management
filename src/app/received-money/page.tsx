"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Download,
  PlusCircle,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  CreditCard,
  Building2,
  HandCoins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import * as XLSX from "xlsx";

export default function ReceivedMoneyPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [period, setPeriod] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewTx, setViewTx] = useState<any>(null);
  const [editTx, setEditTx] = useState<any>(null);

  // Add Form State
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [method, setMethod] = useState("UPI");
  const [refNumber, setRefNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Form State
  const [editCustomer, setEditCustomer] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMethod, setEditMethod] = useState("UPI");
  const [editRef, setEditRef] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accs) => {
        if (Array.isArray(accs)) {
          setAccounts(accs);
          if (accs.length > 0 && !accountId) setAccountId(accs[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchRecords = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (period !== "all") params.append("period", period);
    if (search.trim()) params.append("search", search.trim());

    fetch(`/api/transactions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Received money includes business income, receivable collections, and incoming funds
          let list = data.filter(
            (t) =>
              t.type === "INCOME" ||
              t.type === "RECEIVABLE_COLLECTED" ||
              t.type === "BORROW" ||
              (t.type === "SETTLEMENT" && t.debt?.type === "LENT")
          );
          if (paymentMethod !== "all") {
            list = list.filter((i) => i.paymentMethod === paymentMethod);
          }
          if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
              (r) =>
                r.party?.name?.toLowerCase().includes(q) ||
                r.notes?.toLowerCase().includes(q) ||
                r.referenceNumber?.toLowerCase().includes(q)
            );
          }
          setRecords(list);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
    const handleDataChange = () => fetchRecords();
    window.addEventListener("finance_data_changed", handleDataChange);
    return () => window.removeEventListener("finance_data_changed", handleDataChange);
  }, [period, paymentMethod, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || !customerName.trim() || !accountId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INCOME",
          amount: num,
          partyName: customerName.trim(),
          accountId,
          transactionDate: receivedDate,
          paymentMethod: method,
          referenceNumber: refNumber.trim() || undefined,
          notes: notes.trim() || `Business money received from ${customerName.trim()}`,
        }),
      });

      if (res.ok) {
        setCustomerName("");
        setAmount("");
        setRefNumber("");
        setNotes("");
        setShowAddModal(false);
        fetchRecords();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record received money");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTx) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${editTx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          transactionDate: editDate,
          paymentMethod: editMethod,
          notes: editNotes,
        }),
      });

      if (res.ok) {
        setEditTx(null);
        fetchRecords();
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
    if (
      !window.confirm(
        language === "te"
          ? "ఈ రికార్డును తొలగించాలనుకుంటున్నారా? మీ ఖాతా బ్యాలెన్స్ స్వయంచాలకంగా సర్దుబాటు చేయబడుతుంది."
          : "Are you sure you want to delete this received record? Your account balance will be updated automatically."
      )
    )
      return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchRecords();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;
  const startOfWeek = new Date(now).setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const todayReceivedTotal = records
    .filter((r) => {
      const t = new Date(r.transactionDate).getTime();
      return t >= startOfToday && t < endOfToday;
    })
    .reduce((sum, item) => sum + item.amount, 0);

  const weekReceivedTotal = records
    .filter((r) => new Date(r.transactionDate).getTime() >= startOfWeek)
    .reduce((sum, item) => sum + item.amount, 0);

  const monthReceivedTotal = records
    .filter((r) => new Date(r.transactionDate).getTime() >= startOfMonth)
    .reduce((sum, item) => sum + item.amount, 0);

  const totalReceived = records.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    const isTe = language === "te";
    const rows = records.map((r) => ({
      [isTe ? "తేదీ" : "Date"]: formatDate(r.transactionDate),
      [isTe ? "కస్టమర్ / వ్యాపార పేరు" : "Customer / Business"]: r.party?.name || "Customer",
      [isTe ? "స్వీకరించిన మొత్తం (₹)" : "Amount Received"]: r.amount,
      [isTe ? "చెల్లింపు విధానం" : "Payment Method"]: r.paymentMethod || "UPI",
      [isTe ? "రెఫరెన్స్ నంబర్" : "Reference Number"]: r.referenceNumber || "",
      [isTe ? "జమ అయిన ఖాతా" : "Deposit Account"]: r.account?.name || "",
      [isTe ? "వివరణ" : "Notes"]: r.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Received_Money");
    XLSX.writeFile(wb, `Received_Money_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Download size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === "te" ? "స్వీకరించిన వ్యాపార నగదు (Received Business Money)" : "Received Business Money"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === "te"
              ? "కస్టమర్ల నుండి వచ్చిన చెల్లింపులు మరియు వ్యాపార రాబడుల పూర్తి రికార్డు."
              : "Record and track all revenue and payments received from business activities and customers."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download size={14} />
            <span>{language === "te" ? "ఎగుమతి (Excel)" : "Export Excel"}</span>
          </Button>

          <Button variant="emerald" size="sm" onClick={() => setShowAddModal(true)}>
            <PlusCircle size={15} />
            <span>{language === "te" ? "+ నగదు నమోదు" : "+ Add Received Money"}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-teal-50/40 dark:bg-teal-950/20 border-teal-200/80 dark:border-teal-900/60">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
              {language === "te" ? "నేడు స్వీకరించినది" : "Today's Received"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400">
              {formatCurrency(todayReceivedTotal)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === "te" ? "ఈ రోజు వచ్చిన రాబడి" : "today's total inflow"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              {language === "te" ? "ఈ వారం స్వీకరించినది" : "This Week's Received"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(weekReceivedTotal)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === "te" ? "ప్రస్తుత వారం మొత్తం" : "weekly customer receipts"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/60">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
              {language === "te" ? "ఈ నెల స్వీకరించినది" : "This Month's Received"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {formatCurrency(monthReceivedTotal)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === "te" ? "నెల మొత్తం వ్యాపార ఆదాయం" : "monthly business revenue"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {language === "te" ? "మొత్తం స్వీకరించిన మొత్తం" : "Total Received Amount"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {formatCurrency(totalReceived)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {records.length} {language === "te" ? "లావాదేవీలు" : "records"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar size={13} />
              {language === "te" ? "కాలపరిమితి:" : "Period:"}
            </span>
            {[
              { id: "all", label: t("transactions.periodAll") },
              { id: "today", label: t("transactions.periodToday") },
              { id: "week", label: t("transactions.periodWeek") },
              { id: "month", label: t("transactions.periodMonth") },
              { id: "year", label: t("transactions.periodYear") },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === p.id
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Method Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <CreditCard size={13} />
                {language === "te" ? "విధానం:" : "Method:"}
              </span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-semibold"
              >
                <option value="all">{t("common.all")}</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </select>
            </div>

            {/* Keyword Search */}
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === "te" ? "కస్టమర్ లేదా వివరాల ద్వారా వెతకండి..." : "Search customer or notes..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">{language === "te" ? "తేదీ" : "Date"}</th>
                  <th className="px-5 py-3.5">{language === "te" ? "కస్టమర్ / వ్యాపారం" : "Customer / Business"}</th>
                  <th className="px-5 py-3.5">{language === "te" ? "జమ అయిన ఖాతా" : "Account"}</th>
                  <th className="px-5 py-3.5">{language === "te" ? "చెల్లింపు విధానం" : "Method"}</th>
                  <th className="px-5 py-3.5">{language === "te" ? "వివరాలు" : "Notes"}</th>
                  <th className="px-5 py-3.5 text-right">{language === "te" ? "మొత్తం" : "Amount Received"}</th>
                  <th className="px-5 py-3.5 text-center">{language === "te" ? "చర్యలు" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10">
                      <div className="inline-block h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors">
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDate(item.transactionDate)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.party?.name || item.debt?.party?.name || (language === "te" ? "కస్టమర్" : "Customer")}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {item.account?.name}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.paymentMethod || "UPI"}
                        </span>
                        {item.referenceNumber && (
                          <span className="ml-1 text-[10px] text-slate-400">#{item.referenceNumber}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs truncate text-slate-500">
                        {item.notes || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-sm text-teal-600 dark:text-teal-400 whitespace-nowrap">
                        +{formatCurrency(item.amount)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewTx(item)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditTx(item);
                              setEditCustomer(item.party?.name || "");
                              setEditAmount(item.amount.toString());
                              setEditDate(item.transactionDate ? item.transactionDate.split("T")[0] : "");
                              setEditMethod(item.paymentMethod || "UPI");
                              setEditNotes(item.notes || "");
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      {language === "te" ? "స్వీకరించిన డబ్బు రికార్డులు ఏవీ లేవు." : "No received money records found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Received Money Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download size={16} className="text-teal-600" />
                {language === "te" ? "వ్యాపార రాబడి / స్వీకరించిన నగదు నమోదు" : "Add Received Business Money"}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "కస్టమర్ లేదా వ్యాపార పేరు *" : "Customer / Business Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Client, ABC Corp, Counter Sale"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "స్వీకరించిన మొత్తం (₹) *" : "Amount Received (₹) *"}
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
                    {language === "te" ? "తేదీ *" : "Received Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "జమ అయిన ఖాతా *" : "Deposit Into Account *"}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "te" ? "చెల్లింపు విధానం *" : "Payment Method *"}
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
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
                    {language === "te" ? "రెఫరెన్స్ నంబర్" : "Reference # (Optional)"}
                  </label>
                  <input
                    type="text"
                    placeholder="UTR / Check #"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "వివరణ / నోట్స్" : "Payment Description / Notes"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Website project advance, Goods sale"
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
                  {submitting ? t("common.loading") : language === "te" ? "సేవ్ చేయండి" : "Save Received Money"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === "te" ? "రాబడి వివరాల సవరణ" : "Edit Received Money"}
              </h3>
              <button onClick={() => setEditTx(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "మొత్తం (₹) *" : "Amount (₹) *"}
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
                    {language === "te" ? "తేదీ *" : "Date *"}
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
                    {language === "te" ? "విధానం *" : "Method *"}
                  </label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                <Button type="button" variant="outline" size="sm" onClick={() => setEditTx(null)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="emerald" size="sm" disabled={submitting}>
                  {submitting ? t("common.loading") : language === "te" ? "నవీకరించండి" : "Update"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-teal-600" />
                {language === "te" ? "రాబడి వివరాలు" : "Received Money Details"}
              </h3>
              <button onClick={() => setViewTx(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "కస్టమర్ / వ్యాపారం:" : "Customer:"}</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewTx.party?.name || "Customer"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "స్వీకరించిన మొత్తం:" : "Amount Received:"}</span>
                <span className="font-extrabold text-teal-600 text-sm">+{formatCurrency(viewTx.amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "తేదీ:" : "Date:"}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(viewTx.transactionDate)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === "te" ? "విధానం:" : "Method:"}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{viewTx.paymentMethod || "UPI"}</span>
              </div>
              {viewTx.referenceNumber && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">{language === "te" ? "రెఫరెన్స్ నంబర్:" : "Reference #:"}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{viewTx.referenceNumber}</span>
                </div>
              )}
              {viewTx.account?.name && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">{language === "te" ? "జమ అయిన ఖాతా:" : "Account:"}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{viewTx.account.name}</span>
                </div>
              )}
              {viewTx.notes && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-0.5">{language === "te" ? "వివరణ:" : "Notes:"}</span>
                  <p className="text-slate-700 dark:text-slate-300 italic">{viewTx.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewTx(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
