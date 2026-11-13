"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "create" | "edit";
  initialData?: any;
  defaultType?: "INCOME" | "EXPENSE" | "TRANSFER" | "LEND" | "BORROW" | "SETTLEMENT";
  fixedType?: boolean;
}

export function RecordFormModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "create",
  initialData = null,
  defaultType = "EXPENSE",
  fixedType = false,
}: RecordFormModalProps) {
  const { t, language, formatCurrency } = useLanguage();

  const [type, setType] = useState<string>(defaultType);
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [newPartyName, setNewPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");

    // Load dependencies from database
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/parties").then((r) => r.json()),
    ])
      .then(([accs, cats, pts]) => {
        if (Array.isArray(accs)) {
          setAccounts(accs);
          if (accs.length > 0 && !accountId) setAccountId(accs[0].id);
        }
        if (Array.isArray(cats)) setCategories(cats);
        if (Array.isArray(pts)) setParties(pts);
      })
      .catch((err) => console.error(err));

    if (mode === "edit" && initialData) {
      setType(initialData.type || defaultType);
      setAmount(initialData.amount ? initialData.amount.toString() : "");
      setAccountId(initialData.accountId || "");
      setToAccountId(initialData.toAccountId || "");
      setCategoryId(initialData.categoryId || "");
      setPartyId(initialData.partyId || "");
      setPaymentMethod(initialData.paymentMethod || "UPI");
      setTransactionDate(
        initialData.transactionDate
          ? new Date(initialData.transactionDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setNotes(initialData.notes || "");
    } else {
      setType(defaultType);
      setAmount("");
      setNotes("");
      setPaymentMethod("UPI");
      setTransactionDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
      setNewPartyName("");
    }
  }, [isOpen, mode, initialData, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(language === "te" ? "దయచేసి సరైన మొత్తాన్ని ఇవ్వండి" : "Please enter a valid amount greater than 0");
      return;
    }

    if (!accountId) {
      setError(language === "te" ? "ఖాతా ఎంచుకోండి" : "Please select an account");
      return;
    }

    setSubmitting(true);
    try {
      let finalPartyId = partyId;
      if (!finalPartyId && newPartyName.trim()) {
        const partyRes = await fetch("/api/parties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newPartyName.trim() }),
        });
        const pData = await partyRes.json();
        if (pData?.id) finalPartyId = pData.id;
      }

      if (mode === "edit" && initialData?.id) {
        // Edit existing transaction
        const res = await fetch(`/api/transactions/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            categoryId: categoryId || null,
            amount: numAmount,
            paymentMethod,
            transactionDate,
            notes,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update record");
        }
      } else {
        // Create new record
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            toAccountId: type === "TRANSFER" ? toAccountId : undefined,
            categoryId: categoryId || undefined,
            partyId: finalPartyId || undefined,
            type,
            amount: numAmount,
            paymentMethod,
            transactionDate,
            dueDate: dueDate || undefined,
            notes,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save record");
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    type === "INCOME" ? c.type === "INCOME" : c.type === "EXPENSE"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {mode === "edit"
              ? language === "te"
                ? "లావాదేవీని సవరించండి"
                : "Edit Transaction Record"
              : language === "te"
              ? `${type === "INCOME" ? "రాబడి" : type === "EXPENSE" ? "ఖర్చు" : "లావాదేవీ"} నమోదు`
              : `Record ${type.replace(/_/g, " ")}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t("transactions.colAmount")} (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-slate-900 dark:text-white text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Account & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("transactions.colAccount")} *
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === "te" ? "చెల్లింపు పద్ధతి" : "Payment Method"} *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CASH">Cash (నగదు)</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS)</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          {/* Category selection if applicable */}
          {(type === "INCOME" || type === "EXPENSE") && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("transactions.colCategory")}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">{t("common.select")}</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {language === "te" ? cat.nameTe : cat.nameEn}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Party selection if applicable (LEND, BORROW, SETTLEMENT) */}
          {(type === "LEND" || type === "BORROW" || type === "SETTLEMENT") && (
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === "te" ? "వ్యక్తి / కాంటాక్ట్" : "Person / Contact"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                >
                  <option value="">{language === "te" ? "-- జాబితా నుండి --" : "-- Select Contact --"}</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={language === "te" ? "లేదా కొత్త పేరు టైప్ చేయండి" : "Or enter new name"}
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("transactions.colDate")} *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("transactions.colNote")}
              </label>
              <input
                type="text"
                placeholder={language === "te" ? "వివరణ (ఉదా. సరుకులు, జీతం)" : "e.g. Salary, Client payment, Fuel"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button variant="emerald" size="sm" type="submit" disabled={submitting}>
              <Check size={14} />
              <span>{submitting ? t("common.loading") : t("common.save")}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

