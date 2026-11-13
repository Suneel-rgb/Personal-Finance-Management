"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  HandCoins,
  PlusCircle,
  Search,
  Calendar,
  Filter,
  CreditCard,
  Building2,
  Trash2,
  Edit,
  Eye,
  ArrowDownRight,
  User,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RecordFormModal } from "@/components/modals/RecordFormModal";
import { TransactionDetailModal } from "@/components/modals/TransactionDetailModal";
import * as XLSX from "xlsx";

export default function PaidMoneyPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [detailTx, setDetailTx] = useState<any>(null);

  const fetchRecords = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (period !== "all") params.append("period", period);
    if (search.trim()) params.append("search", search.trim());

    fetch(`/api/transactions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Paid money includes: LEND (money lent to others) and SETTLEMENT (debt repayments paid)
          let list = data.filter(
            (t) => t.type === "LEND" || (t.type === "SETTLEMENT" && t.debt?.type === "BORROWED")
          );
          if (paymentMethod !== "all") {
            list = list.filter((i) => i.paymentMethod === paymentMethod);
          }
          setRecords(list);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
  }, [period, paymentMethod]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("transactions.deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (tx: any) => {
    setSelectedTx(tx);
    setFormMode("edit");
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedTx(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const totalPaid = records.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    const isTe = language === "te";
    const rows = records.map((r) => {
      const person = r.party?.name || r.debt?.party?.name || (isTe ? "వ్యక్తి" : "Contact");
      if (isTe) {
        return {
          "తేదీ (Date)": formatDate(r.transactionDate),
          "వ్యక్తి / సంస్థ (Contact)": person,
          "చెల్లించిన ఖాతా (Account)": r.account?.name || "",
          "చెల్లింపు విధానం (Payment Method)": r.paymentMethod || "UPI",
          "వివరణ (Notes)": r.notes || "",
          "చెల్లించిన మొత్తం (Amount ₹)": r.amount,
        };
      }
      return {
        Date: formatDate(r.transactionDate),
        Contact: person,
        Account: r.account?.name || "",
        PaymentMethod: r.paymentMethod || "UPI",
        Notes: r.notes || "",
        Amount: r.amount,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = isTe ? "చెల్లించిన_డబ్బు" : "Paid_Money";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(
      wb,
      `${isTe ? "చెల్లించిన_డబ్బు_నివేదిక" : "Paid_Money_Report"}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <HandCoins size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === "te" ? "చెల్లించిన డబ్బు నిర్వహణ (Paid Money)" : "Paid Money Management"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === "te"
              ? "ఇతరులకు ఇచ్చిన అప్పులు మరియు రుణాలు తీర్చడానికి చెల్లించిన మొత్తం వివరాలు."
              : "Track all money paid to others, including loans given and debt repayments settled."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download size={14} />
            <span>{t("transactions.exportExcel")}</span>
          </Button>

          <Button variant="emerald" size="sm" onClick={handleAddNew}>
            <PlusCircle size={15} />
            <span>{language === "te" ? "+ చెల్లింపు నమోదు" : "+ Record Money Paid"}</span>
          </Button>
        </div>
      </div>

      {/* KPI Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              {language === "te" ? "ఇతరులకు చెల్లించిన మొత్తం" : "Total Money Paid"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-700 dark:text-amber-400">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {records.length} {language === "te" ? "నమోదులు" : "records"}
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
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Payment Method Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <CreditCard size={13} />
                {language === "te" ? "పద్ధతి:" : "Method:"}
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
              </select>
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearch} className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === "te" ? "వ్యక్తి లేదా వివరణ ద్వారా వెతకండి..." : "Search by person or note..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">{t("transactions.colDate")}</th>
                  <th className="px-5 py-3.5">{language === "te" ? "వ్యక్తి / గ్రహీత" : "Recipient / Person"}</th>
                  <th className="px-5 py-3.5">{t("transactions.colAccount")}</th>
                  <th className="px-5 py-3.5">{language === "te" ? "చెల్లింపు పద్ధతి" : "Method"}</th>
                  <th className="px-5 py-3.5">{t("transactions.colNote")}</th>
                  <th className="px-5 py-3.5 text-right">{t("transactions.colAmount")}</th>
                  <th className="px-5 py-3.5 text-center">{t("transactions.colAction")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10">
                      <div className="inline-block h-6 w-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDate(item.transactionDate)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.party?.name || item.debt?.party?.name || "Person"}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {item.account?.name}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.paymentMethod || "UPI"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs truncate text-slate-500">
                        {item.notes || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-sm text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        -{formatCurrency(item.amount)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailTx(item)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
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
                      {language === "te" ? "చెల్లించిన వివరాలు ఏవీ లేవు." : "No paid money records found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <RecordFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchRecords}
        mode={formMode}
        initialData={selectedTx}
        defaultType="LEND"
        fixedType={false}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        isOpen={!!detailTx}
        onClose={() => setDetailTx(null)}
        transaction={detailTx}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

