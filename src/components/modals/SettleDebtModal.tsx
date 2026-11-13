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
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !debt) return;
    setError("");
    setAmount(debt.remainingAmount?.toString() || "");
    setPaymentMethod(debt.paymentMethod || "UPI");
    setReferenceNumber("");
    setNotes(
      debt.type === "LENT"
        ? `Payment received from ${debt.party?.name || "Contact"}`
        : `Payment made to ${debt.party?.name || "Contact"}`
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
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process settlement");
      }

      onSuccess();
      window.dispatchEvent(new Event("finance_data_changed"));
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to settle");
    } finally {
      setSubmitting(false);
    }
  };

  const isLent = debt.type === "LENT";
  const alreadyPaid = Math.max(0, (debt.originalAmount || 0) - (debt.remainingAmount || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {language === "te" ? "చెల్లింపును ధృవీకరించండి (Mark as Paid)" : "Mark as Paid"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Debt Financial Summary Breakdown */}
        <div className="p-4 mx-6 mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                {language === "te" ? "చెల్లింపు పేరు / వివరాలు" : "Payment Name / Person"}
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {debt.title || debt.party?.name}
              </span>
              {debt.title && debt.party?.name && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  ({debt.party.name})
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                {language === "te" ? "మొత్తం విలువ (Total Amount)" : "Total Amount"}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(debt.originalAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">
                {language === "te" ? "ఇప్పటికే చెల్లించినది:" : "Already Paid:"}
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(alreadyPaid)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400 block">
                {language === "te" ? "మిగిలిన బాకీ (Remaining):" : "Remaining Amount:"}
              </span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                {formatCurrency(debt.remainingAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Amount Paying Now */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === "te" ? "ఇప్పుడు చెల్లిస్తున్న మొత్తం (Amount Paying Now) *" : "Amount Paying Now (₹) *"}
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
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setAmount(debt.remainingAmount.toString())}
                className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 px-2 py-0.5 rounded-md font-semibold transition-colors"
              >
                {language === "te" ? "పూర్తిగా చెల్లించండి" : "Pay Full Remaining"} ({formatCurrency(debt.remainingAmount)})
              </button>
            </div>
          </div>

          {/* Impact Account */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(acc.currentBalance)})
                </option>
              ))}
            </select>
          </div>

          {/* Date, Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === "te" ? "చెల్లింపు తేదీ *" : "Payment Date *"}
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === "te" ? "చెల్లింపు విధానం *" : "Payment Method *"}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CASH">Cash in Hand</option>
                <option value="BANK_TRANSFER">Net Banking / NEFT / IMPS</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === "te" ? "రెఫరెన్స్ నంబర్ (ఐచ్ఛికం)" : "Reference / UTR (Optional)"}
              </label>
              <input
                type="text"
                placeholder="UTR, Ref #, Check #"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === "te" ? "వివరాలు / నోట్స్" : "Description / Notes"}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-60 transition-colors"
            >
              {submitting
                ? t("common.loading")
                : language === "te"
                ? "చెల్లింపును నమోదు చేయండి"
                : "Confirm & Mark as Paid"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

