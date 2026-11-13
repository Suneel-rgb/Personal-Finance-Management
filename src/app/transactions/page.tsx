"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  HandCoins,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  Calendar,
  Layers,
  FileSpreadsheet,
  PlusCircle,
  CreditCard,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RecordFormModal } from "@/components/modals/RecordFormModal";
import { TransactionDetailModal } from "@/components/modals/TransactionDetailModal";
import * as XLSX from "xlsx";

export default function TransactionsPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState("all");
  const [type, setType] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [detailTx, setDetailTx] = useState<any>(null);

  const fetchTransactions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (period !== "all") params.append("period", period);
    if (type !== "all") params.append("type", type);
    if (search.trim()) params.append("search", search.trim());

    fetch(`/api/transactions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          let list = data;
          if (paymentMethod !== "all") {
            list = list.filter((tx) => tx.paymentMethod === paymentMethod);
          }
          setTransactions(list);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, [period, type, paymentMethod]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("transactions.deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) fetchTransactions();
    } catch (err) {
      console.error("Failed to delete", err);
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

  // Language-aware Export to Excel
  const exportToExcel = () => {
    const isTe = language === "te";
    const rows = transactions.map((tx) => {
      const typeLabel = t(`transactions.types.${tx.type}`, tx.type);
      const catLabel = isTe
        ? (tx.category?.nameTe || tx.category?.nameEn || tx.party?.name || "సాధారణం")
        : (tx.category?.nameEn || tx.party?.name || "General");

      if (isTe) {
        return {
          "తేదీ (Date)": formatDate(tx.transactionDate),
          "లావాదేవీ రకం (Type)": typeLabel,
          "వర్గం (Category)": catLabel,
          "ఖాతా (Account)": tx.account?.name || "",
          "చేరే ఖాతా (To Account)": tx.toAccount?.name || "-",
          "చెల్లింపు విధానం (Payment Method)": tx.paymentMethod || "UPI",
          "వివరణ / నోట్స్ (Notes)": tx.notes || "",
          "మొత్తం (Amount ₹)": tx.amount,
        };
      }

      return {
        Date: formatDate(tx.transactionDate),
        Type: typeLabel,
        Category: catLabel,
        Account: tx.account?.name || "",
        ToAccount: tx.toAccount?.name || "-",
        PaymentMethod: tx.paymentMethod || "UPI",
        Notes: tx.notes || "",
        Amount: tx.amount,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    const sheetName = isTe ? "లావాదేవీలు" : "Transactions";
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(
      workbook,
      `${isTe ? "లావాదేవీల_నివేదిక" : "Transactions_Report"}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate totals
  const filteredIncome = transactions
    .filter((t) => t.type === "INCOME" || t.type === "BORROW" || (t.type === "SETTLEMENT" && t.debt?.type === "LENT"))
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpense = transactions
    .filter((t) => t.type === "EXPENSE" || t.type === "LEND" || (t.type === "SETTLEMENT" && t.debt?.type === "BORROWED"))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("transactions.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("transactions.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={14} />
            <span>{language === "te" ? "ప్రింట్ / PDF" : "Print / PDF"}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet size={14} />
            <span>{t("transactions.exportExcel")}</span>
          </Button>

          <Button variant="emerald" size="sm" onClick={handleAddNew}>
            <PlusCircle size={15} />
            <span>{t("transactions.newTransaction")}</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Row 1: Periods */}
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
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Row 2: Type Filters, Payment Method & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={13} />
                {language === "te" ? "రకం:" : "Type:"}
              </span>
              {[
                { id: "all", label: t("transactions.filterAll") },
                { id: "INCOME", label: t("transactions.filterIncome") },
                { id: "EXPENSE", label: t("transactions.filterExpense") },
                { id: "TRANSFER", label: t("transactions.filterTransfer") },
                { id: "LEND", label: language === "te" ? "ఇచ్చిన అప్పు" : "Lent" },
                { id: "BORROW", label: language === "te" ? "తీసుకున్న అప్పు" : "Borrowed" },
              ].map((tp) => (
                <button
                  key={tp.id}
                  onClick={() => setType(tp.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    type === tp.id
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {tp.label}
                </button>
              ))}

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-medium ml-1"
              >
                <option value="all">{language === "te" ? "అన్ని చెల్లింపు పద్ధతులు" : "All Payment Methods"}</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </select>
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("transactions.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-3">
          <span className="text-[11px] text-slate-400 font-medium block">
            {language === "te" ? "రాబడి మొత్తం (ఫిల్టర్ చేసినవి)" : "Total Inflow (Filtered)"}
          </span>
          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
            +{formatCurrency(filteredIncome)}
          </span>
        </Card>

        <Card className="p-3">
          <span className="text-[11px] text-slate-400 font-medium block">
            {language === "te" ? "ఖర్చుల మొత్తం (ఫిల్టర్ చేసినవి)" : "Total Outflow (Filtered)"}
          </span>
          <span className="text-base font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
            -{formatCurrency(filteredExpense)}
          </span>
        </Card>

        <Card className="p-3 col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-400 font-medium block">
            {language === "te" ? "రికార్డుల సంఖ్య" : "Transaction Count"}
          </span>
          <span className="text-base font-bold text-slate-900 dark:text-white block mt-0.5">
            {transactions.length} {language === "te" ? "లావాదేవీలు" : "records"}
          </span>
        </Card>
      </div>

      {/* Master Data Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">{t("transactions.colDate")}</th>
                  <th className="px-5 py-3.5">{t("transactions.colType")}</th>
                  <th className="px-5 py-3.5">{t("transactions.colCategory")}</th>
                  <th className="px-5 py-3.5">{t("transactions.colAccount")}</th>
                  <th className="px-5 py-3.5">{language === "te" ? "పద్ధతి" : "Method"}</th>
                  <th className="px-5 py-3.5">{t("transactions.colNote")}</th>
                  <th className="px-5 py-3.5 text-right">{t("transactions.colAmount")}</th>
                  <th className="px-5 py-3.5 text-center">{t("transactions.colAction")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10">
                      <div className="inline-block h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : transactions.length > 0 ? (
                  transactions.map((tx: any) => {
                    const isInc = tx.type === "INCOME" || tx.type === "BORROW";
                    const isExp = tx.type === "EXPENSE" || tx.type === "LEND";
                    const isTransfer = tx.type === "TRANSFER";

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              isInc
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : isExp
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {isInc ? (
                              <ArrowUpRight size={11} />
                            ) : isExp ? (
                              <ArrowDownRight size={11} />
                            ) : (
                              <ArrowLeftRight size={11} />
                            )}
                            {t(`transactions.types.${tx.type}`, tx.type)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                          {tx.category
                            ? language === "te"
                              ? tx.category.nameTe
                              : tx.category.nameEn
                            : tx.party
                            ? tx.party.name
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                          {tx.account?.name}
                          {isTransfer && tx.toAccount && ` → ${tx.toAccount.name}`}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {tx.paymentMethod || "UPI"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">
                          {tx.notes || "—"}
                        </td>
                        <td
                          className={`px-5 py-3.5 whitespace-nowrap text-right font-black text-sm ${
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
                        <td className="px-5 py-3.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setDetailTx(tx)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleEdit(tx)}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      {t("dashboard.emptyTransactions")}
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
        onSuccess={fetchTransactions}
        mode={formMode}
        initialData={selectedTx}
        defaultType="EXPENSE"
      />

      {/* Detail Modal */}
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
