"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  HandCoins,
  Clock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Phone,
  ChevronDown,
  ChevronUp,
  History,
  X,
} from "lucide-react";
import { SettleDebtModal } from "@/components/modals/SettleDebtModal";

export default function DebtsPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [activeTab, setActiveTab] = useState<"RECEIVABLE" | "PAYABLE">("RECEIVABLE");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Settlement Modal state
  const [selectedDebtForSettle, setSelectedDebtForSettle] = useState<any>(null);

  // Add Debt Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [debtType, setDebtType] = useState<"LENT" | "BORROWED">("LENT");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Expanded settlement logs
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDebts = () => {
    setLoading(true);
    fetch("/api/debts")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) {
          setData(res);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDebts();

    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accs) => {
        if (Array.isArray(accs)) setAccounts(accs);
      })
      .catch((err) => console.error(err));

    const handleDataChange = () => fetchDebts();
    window.addEventListener("finance_data_changed", handleDataChange);
    return () => window.removeEventListener("finance_data_changed", handleDataChange);
  }, []);

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (!partyName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyName: partyName.trim(),
          type: debtType,
          amount: numAmount,
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
        fetchDebts();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block h-8 w-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { receivables, payables, summary } = data;
  const activeList = activeTab === "RECEIVABLE" ? receivables : payables;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t("debts.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t("debts.subtitle")}
          </p>
        </div>

        <button
          onClick={() => {
            setDebtType(activeTab === "RECEIVABLE" ? "LENT" : "BORROWED");
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
        >
          <PlusCircle size={15} />
          <span>{t("debts.addNewDebt")}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Receivables Card */}
        <div
          onClick={() => setActiveTab("RECEIVABLE")}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === "RECEIVABLE"
              ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              {t("debts.totalReceivable")} (నాకు రావాల్సినవి)
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <HandCoins size={18} />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 block mt-2">
            {formatCurrency(summary.totalReceivable)}
          </span>
          <span className="text-xs text-slate-500 block mt-1">
            {summary.receivableCount} {language === "te" ? "పెండింగ్ బకాయిదారులు" : "pending receivables"}
          </span>
        </div>

        {/* Payables Card */}
        <div
          onClick={() => setActiveTab("PAYABLE")}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === "PAYABLE"
              ? "bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {t("debts.totalPayable")} (నేను ఇవ్వాల్సినవి)
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Clock size={18} />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 block mt-2">
            {formatCurrency(summary.totalPayable)}
          </span>
          <span className="text-xs text-slate-500 block mt-1">
            {summary.payableCount} {language === "te" ? "పెండింగ్ రుణాలు" : "pending payables"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("RECEIVABLE")}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all ${
            activeTab === "RECEIVABLE"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {t("debts.tabReceivable")} ({receivables.length})
        </button>
        <button
          onClick={() => setActiveTab("PAYABLE")}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all ${
            activeTab === "PAYABLE"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {t("debts.tabPayable")} ({payables.length})
        </button>
      </div>

      {/* Debt Records Cards */}
      <div className="space-y-3.5">
        {activeList.length > 0 ? (
          activeList.map((item: any) => {
            const isSettled = item.status === "SETTLED";
            const isOverdue = item.status === "OVERDUE";
            const isPartial = item.status === "PARTIALLY_PAID";

            const progressPct = Math.round(
              ((item.originalAmount - item.remainingAmount) / item.originalAmount) * 100
            );

            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Contact Info */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-3 rounded-2xl text-white font-bold text-sm shrink-0 ${
                        activeTab === "RECEIVABLE" ? "bg-emerald-600" : "bg-amber-600"
                      }`}
                    >
                      <User size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {item.party?.name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSettled
                              ? "bg-slate-100 text-slate-600"
                              : isOverdue
                              ? "bg-rose-100 text-rose-800 animate-pulse"
                              : isPartial
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {t(`debts.statuses.${item.status}`)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        {item.party?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {item.party.phone}
                          </span>
                        )}
                        {item.dueDate && (
                          <span
                            className={`flex items-center gap-1 font-semibold ${
                              isOverdue ? "text-rose-600" : "text-slate-500"
                            }`}
                          >
                            <Calendar size={12} />
                            {t("debts.dueDate")}: {formatDate(item.dueDate)}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Amounts & Settlement Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="sm:text-right">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {t("debts.remainingAmount")}
                      </span>
                      <span className="text-xl font-black text-slate-900 block">
                        {formatCurrency(item.remainingAmount)}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {language === "te" ? "అసలు:" : "Original:"}{" "}
                        {formatCurrency(item.originalAmount)}
                      </span>
                    </div>

                    {!isSettled && (
                      <button
                        onClick={() => setSelectedDebtForSettle(item)}
                        className="mt-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        {t("debts.recordPayment")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-5 pb-3">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>
                      {language === "te" ? "పరిష్కార పురోగతి" : "Settlement progress"}
                    </span>
                    <span className="font-semibold text-slate-700">{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isSettled
                          ? "bg-emerald-500"
                          : activeTab === "RECEIVABLE"
                          ? "bg-teal-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Settlement Logs toggle */}
                {item.settlements && item.settlements.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      <History size={13} />
                      <span>
                        {language === "te"
                          ? `చెల్లింపు చరిత్ర (${item.settlements.length})`
                          : `Settlement History (${item.settlements.length})`}
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-200/70">
                        {item.settlements.map((s: any) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between text-xs py-1"
                          >
                            <span className="text-slate-500">
                              {formatDate(s.paymentDate)} •{" "}
                              {s.transaction?.account?.name || "Account"}
                            </span>
                            <span className="font-bold text-emerald-700">
                              +{formatCurrency(s.amountPaid)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            {language === "te"
              ? "ఎలాంటి బకాయిలు లేదా అప్పులు నమోదు కాలేదు."
              : "No debt records found in this category."}
          </div>
        )}
      </div>

      {/* Settle Debt Modal */}
      {selectedDebtForSettle && (
        <SettleDebtModal
          isOpen={!!selectedDebtForSettle}
          debt={selectedDebtForSettle}
          onClose={() => setSelectedDebtForSettle(null)}
          onSuccess={() => {
            fetchDebts();
            setSelectedDebtForSettle(null);
            window.dispatchEvent(new Event("finance_data_changed"));
          }}
        />
      )}

      {/* Add New Debt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-sm font-bold text-slate-800">
                {t("debts.addNewDebt")}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="p-6 space-y-4">
              {/* Debt Type Selector */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDebtType("LENT")}
                  className={`py-2 rounded-lg transition-all ${
                    debtType === "LENT"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  {language === "te" ? "నేను ఇచ్చిన అప్పు (Recv)" : "Money Lent (To Receive)"}
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType("BORROWED")}
                  className={`py-2 rounded-lg transition-all ${
                    debtType === "BORROWED"
                      ? "bg-white text-amber-700 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  {language === "te" ? "నేను తీసుకున్న అప్పు (Pay)" : "Money Borrowed (To Pay)"}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("debts.debtorName")} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "te" ? "వ్యక్తి లేదా స్నేహితుని పేరు" : "Person or Contact Name"}
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("debts.originalAmount")} (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === "te"
                    ? "డబ్బు ఏ ఖాతా నుండి తీయబడింది / చేర్చబడింది?"
                    : "Impact Account (Optional)"}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                >
                  <option value="">
                    {language === "te" ? "-- ఖాతా మార్పు అవసరం లేదు --" : "-- No account impact --"}
                  </option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("debts.dueDate")} ({t("common.optional")})
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("transactions.colNote")}
                </label>
                <input
                  type="text"
                  placeholder={language === "te" ? "వివరాలు (ఉదా. ఆసుపత్రి ఖర్చు కోసం)" : "e.g. Travel tickets, Emergency loan"}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {submitting ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

