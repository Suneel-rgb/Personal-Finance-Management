"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { X, CheckCircle2 } from "lucide-react";

interface SettleDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: any | null;
}

export function SettleDebtModal({
  isOpen,
  onClose,
  onSuccess,
  debt,
}: SettleDebtModalProps) {
  const { t, language, formatCurrency } = useLanguage();

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !debt) return;
    setError("");
    setAmount(debt.remainingAmount?.toString() || "");
    setNotes(
      debt.type === "LENT"
        ? `${debt.party?.name || "Contact"} repaid money`
        : `Repayment made to ${debt.party?.name || "Contact"}`
    );

    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accs) => {
        if (Array.isArray(accs)) {
          setAccounts(accs);
          if (accs.length > 0 && !accountId) {
            setAccountId(accs[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, [isOpen, debt]);

  if (!isOpen || !debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(language === "te" ? "సరైన చెల్లింపు మొత్తాన్ని ఇవ్వండి" : "Please enter a valid amount");
      return;
    }

    if (numAmount > debt.remainingAmount) {
      setError(
        language === "te"
          ? "చెల్లింపు మొత్తం మిగిలిన బకాయి కంటే ఎక్కువ ఉండకూడదు"
          : "Payment cannot exceed remaining due amount"
      );
      return;
    }

    if (!accountId) {
      setError(language === "te" ? "దయచేసి ఖాతాను ఎంచుకోండి" : "Please select an account");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/debts/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId: debt.id,
          accountId,
          amount: numAmount,
          paymentDate,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process settlement");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to settle");
    } finally {
      setSubmitting(false);
    }
  };

  const isLent = debt.type === "LENT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">
              {t("debts.recordPayment")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Debt Summary Banner */}
        <div className="p-4 mx-6 mt-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500 font-medium block">
              {t("debts.debtorName")}
            </span>
            <span className="font-bold text-slate-800 text-sm">
              {debt.party?.name}
            </span>
            <span className="text-[11px] text-slate-500 block">
              {isLent
                ? language === "te"
                  ? "మీకు రావాల్సిన డబ్బు (Recv)"
                  : "Receivable (You Lent)"
                : language === "te"
                ? "మీరు చెల్లించాల్సిన అప్పు (Pay)"
                : "Payable (You Borrowed)"}
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 font-medium block">
              {t("debts.remainingAmount")}
            </span>
            <span className="font-extrabold text-slate-900 text-base">
              {formatCurrency(debt.remainingAmount)}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t("debts.paymentAmount")} (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={debt.remainingAmount}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setAmount(debt.remainingAmount.toString())}
                className="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md font-semibold"
              >
                {t("debts.settleFull")} ({formatCurrency(debt.remainingAmount)})
              </button>
            </div>
          </div>

          {/* Impact Account */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isLent
                ? language === "te"
                  ? "డబ్బు ఏ ఖాతాలో జమ అవుతుంది? *"
                  : "Deposit Money Into Account *"
                : language === "te"
                ? "డబ్బు ఏ ఖాతా నుండి చెల్లిస్తున్నారు? *"
                : "Pay From Account *"}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(acc.currentBalance)})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("transactions.colDate")} *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("transactions.colNote")}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-60"
            >
              {submitting ? t("common.loading") : t("debts.recordPayment")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

