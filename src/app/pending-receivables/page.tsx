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
  CheckCircle2,
  AlertCircle,
  History,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SettleDebtModal } from "@/components/modals/SettleDebtModal";

export default function PendingReceivablesPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [receivables, setReceivables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedForSettle, setSelectedForSettle] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add Form State
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Form State
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchReceivables = () => {
    setLoading(true);
    fetch("/api/debts")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error && res.receivables) {
          let list = res.receivables;
          if (statusFilter !== "all") {
            list = list.filter((p: any) => p.status === statusFilter);
          }
          if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
              (p: any) =>
                p.party?.name?.toLowerCase().includes(q) ||
                p.notes?.toLowerCase().includes(q)
            );
          }
          setReceivables(list);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReceivables();

    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accs) => {
        if (Array.isArray(accs)) setAccounts(accs);
      })
      .catch((err) => console.error(err));
  }, [statusFilter, search]);

  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || !partyName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyName: partyName.trim(),
          type: "LENT",
          amount: num,
          dueDate: dueDate || undefined,
          notes,
          accountId: accountId || undefined,
        }),
      });

      if (res.ok) {
        setPartyName("");
        setAmount("");
        setDueDate("");
        setNotes("");
        setShowAddModal(false);
        fetchReceivables();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/debts/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: editDueDate || null,
          notes: editNotes,
        }),
      });

      if (res.ok) {
        setEditItem(null);
        fetchReceivables();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === "te" ? "ఈ బకాయి రికార్డును తొలగించాలనుకుంటున్నారా?" : "Are you sure you want to delete this receivable record?")) return;
    try {
      const res = await fetch(`/api/debts/${id}`, { method: "DELETE" });
      if (res.ok) fetchReceivables();
    } catch (err) {
      console.error(err);
    }
  };

  const totalOutstanding = receivables
    .filter((p) => p.status !== "SETTLED")
    .reduce((sum, p) => sum + p.remainingAmount, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <HandCoins size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === "te" ? "రావాల్సిన బాకీలు (Pending Receivables)" : "Pending Receivables"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === "te"
              ? "ఇతరులకు ఇచ్చిన అప్పులు, గడువులు మరియు వసూళ్ల నిర్వహణ."
              : "Track all money owed to you by others, upcoming due dates, and partial installment collections."}
          </p>
        </div>

        <Button variant="emerald" size="sm" onClick={() => setShowAddModal(true)}>
          <PlusCircle size={15} />
          <span>{language === "te" ? "+ కొత్త బకాయి నమోదు" : "+ Add Receivable"}</span>
        </Button>
      </div>

      {/* KPI Highlight Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60">
          <CardHeader className="pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              {language === "te" ? "మొత్తం రావాల్సిన బాకీ" : "Total Pending to Receive"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(totalOutstanding)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {receivables.filter((p) => p.status !== "SETTLED").length}{" "}
              {language === "te" ? "పెండింగ్ బకాయిదారులు" : "active borrowers"}
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
              { id: "PENDING", label: t("debts.statuses.PENDING") },
              { id: "PARTIALLY_PAID", label: t("debts.statuses.PARTIALLY_PAID") },
              { id: "OVERDUE", label: t("debts.statuses.OVERDUE") },
              { id: "SETTLED", label: t("debts.statuses.SETTLED") },
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
                placeholder={language === "te" ? "వ్యక్తి లేదా వివరాల ద్వారా వెతకండి..." : "Search by borrower or notes..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receivables Cards List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : receivables.length > 0 ? (
          receivables.map((item) => {
            const isSettled = item.status === "SETTLED";
            const isOverdue = item.status === "OVERDUE";
            const isPartial = item.status === "PARTIALLY_PAID";
            const isExpanded = expandedId === item.id;

            const progressPct = Math.round(
              ((item.originalAmount - item.remainingAmount) / item.originalAmount) * 100
            );

            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 rounded-2xl bg-emerald-600 text-white font-bold shrink-0">
                      <HandCoins size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {item.party?.name}
                        </h3>
                        <Badge
                          variant={
                            isSettled
                              ? "neutral"
                              : isOverdue
                              ? "danger"
                              : isPartial
                              ? "info"
                              : "success"
                          }
                          size="sm"
                        >
                          {t(`debts.statuses.${item.status}`)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {item.party?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {item.party.phone}
                          </span>
                        )}
                        {item.dueDate && (
                          <span
                            className={`flex items-center gap-1 font-semibold ${
                              isOverdue ? "text-rose-600 dark:text-rose-400" : ""
                            }`}
                          >
                            <Calendar size={12} />
                            {t("debts.dueDate")}: {formatDate(item.dueDate)}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions & Amount */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="sm:text-right">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {t("debts.remainingAmount")}
                      </span>
                      <span className="text-xl font-black text-slate-900 dark:text-white block">
                        {formatCurrency(item.remainingAmount)}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {language === "te" ? "అసలు:" : "Orig:"} {formatCurrency(item.originalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      {!isSettled && (
                        <Button
                          variant="emerald"
                          size="xs"
                          onClick={() => setSelectedForSettle(item)}
                        >
                          <span>{language === "te" ? "వసూలు నమోదు" : "Record Collection"}</span>
                        </Button>
                      )}

                      <button
                        onClick={() => {
                          setEditItem(item);
                          setEditDueDate(
                            item.dueDate
                              ? new Date(item.dueDate).toISOString().split("T")[0]
                              : ""
                          );
                          setEditNotes(item.notes || "");
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        title="Edit"
                      >
                        <Edit size={13} />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (Automatic calculation) */}
                <div className="px-5 pb-3">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{language === "te" ? "వసూలైన పురోగతి" : "Collected progress"}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {progressPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Partial Settlement Logs */}
                {item.settlements && item.settlements.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 px-5 py-2.5">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <History size={13} />
                      <span>
                        {language === "te"
                          ? `వసూలైన వాయిదాల చరిత్ర (${item.settlements.length})`
                          : `Collection Installment History (${item.settlements.length})`}
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
                              {s.transaction?.account?.name || "Account"}
                            </span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              +{formatCurrency(s.amountPaid)}
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
            {language === "te" ? "రావాల్సిన బాకీలు ఏవీ లేవు." : "No pending receivables recorded."}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === "te" ? "కొత్త రావలసిన బాకీ నమోదు" : "Add Pending Receivable"}
              </h2>
              <button onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateReceivable} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "ఎవరి నుండి రావాలి? (వ్యక్తి పేరు) *" : "Borrower / Person Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh, Suresh"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("debts.originalAmount")} (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("debts.dueDate")}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("transactions.colNote")}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency help, Short-term loan"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  {t("common.cancel")}
                </Button>
                <Button variant="emerald" size="sm" type="submit" disabled={submitting}>
                  {submitting ? t("common.loading") : t("common.save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === "te" ? "బాకీ వివరాలు సవరించండి" : "Edit Receivable Details"}
              </h2>
              <button onClick={() => setEditItem(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateReceivable} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("debts.dueDate")}
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("transactions.colNote")}
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setEditItem(null)}>
                  {t("common.cancel")}
                </Button>
                <Button variant="emerald" size="sm" type="submit" disabled={submitting}>
                  {submitting ? t("common.loading") : t("common.save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal (supports partial payments & auto balance calculation) */}
      <SettleDebtModal
        isOpen={!!selectedForSettle}
        onClose={() => setSelectedForSettle(null)}
        debt={selectedForSettle}
        onSuccess={() => {
          fetchReceivables();
          setSelectedForSettle(null);
        }}
      />
    </div>
  );
}

