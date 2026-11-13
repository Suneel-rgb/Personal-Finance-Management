"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, HandCoins } from "lucide-react";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: "INCOME" | "EXPENSE" | "TRANSFER" | "LEND" | "BORROW";
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = "EXPENSE",
}: AddTransactionModalProps) {
  const { t, language } = useLanguage();

  const [type, setType] = useState<"INCOME" | "EXPENSE" | "TRANSFER" | "LEND" | "BORROW">(defaultType);
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [newPartyName, setNewPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (defaultType) setType(defaultType);
  }, [defaultType]);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setLoading(true);

    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/parties").then((r) => r.json()),
    ])
      .then(([accs, cats, pts]) => {
        setAccounts(Array.isArray(accs) ? accs : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setParties(Array.isArray(pts) ? pts : []);

        if (Array.isArray(accs) && accs.length > 0 && !accountId) {
          setAccountId(accs[0].id);
          if (accs.length > 1) setToAccountId(accs[1].id);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(language === "te" ? "దయచేసి సరైన మొత్తాన్ని నమోదు చేయండి" : "Please enter a valid amount");
      return;
    }

    if (!accountId) {
      setError(language === "te" ? "ఖాతా ఎంచుకోండి" : "Please select an account");
      return;
    }

    if (type === "TRANSFER" && (!toAccountId || accountId === toAccountId)) {
      setError(
        language === "te"
          ? "బదిలీ చేయడానికి వేరే ఖాతాను ఎంచుకోండి"
          : "Please select a different destination account"
      );
      return;
    }

    setSubmitting(true);
    try {
      let finalPartyId = partyId;

      // If user typed a new party name for lend/borrow
      if ((type === "LEND" || type === "BORROW") && !finalPartyId && newPartyName.trim()) {
        const partyRes = await fetch("/api/parties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newPartyName.trim() }),
        });
        const createdParty = await partyRes.json();
        if (createdParty?.id) {
          finalPartyId = createdParty.id;
        }
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          toAccountId: type === "TRANSFER" ? toAccountId : undefined,
          categoryId: type === "INCOME" || type === "EXPENSE" ? categoryId || undefined : undefined,
          partyId: (type === "LEND" || type === "BORROW") ? finalPartyId || undefined : undefined,
          type,
          amount: numAmount,
          transactionDate,
          dueDate: (type === "LEND" || type === "BORROW") && dueDate ? dueDate : undefined,
          notes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to record transaction");
      }

      // Reset form
      setAmount("");
      setNotes("");
      setNewPartyName("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    type === "INCOME" ? c.type === "INCOME" : c.type === "EXPENSE"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-base font-bold text-slate-800">
            {language === "te" ? "కొత్త లావాదేవీ నమోదు" : "Record Transaction"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Type Switcher Tabs */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-100/80 m-4 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setType("EXPENSE")}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              type === "EXPENSE"
                ? "bg-white text-rose-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowDownRight size={14} />
            <span>{language === "te" ? "ఖర్చు" : "Expense"}</span>
          </button>

          <button
            type="button"
            onClick={() => setType("INCOME")}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              type === "INCOME"
                ? "bg-white text-emerald-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowUpRight size={14} />
            <span>{language === "te" ? "రాబడి" : "Income"}</span>
          </button>

          <button
            type="button"
            onClick={() => setType("TRANSFER")}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              type === "TRANSFER"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowLeftRight size={14} />
            <span>{language === "te" ? "బదిలీ" : "Transfer"}</span>
          </button>

          <button
            type="button"
            onClick={() => setType("LEND")}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              type === "LEND" || type === "BORROW"
                ? "bg-white text-amber-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <HandCoins size={14} />
            <span>{language === "te" ? "అప్పు" : "Debt"}</span>
          </button>
        </div>

        {/* Sub-toggle if Debt is selected */}
        {(type === "LEND" || type === "BORROW") && (
          <div className="flex gap-2 px-6 mb-2">
            <button
              type="button"
              onClick={() => setType("LEND")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                type === "LEND"
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              {language === "te" ? "నేను ఇచ్చిన అప్పు (రావాల్సినది)" : "Money Lent (To Receive)"}
            </button>
            <button
              type="button"
              onClick={() => setType("BORROW")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                type === "BORROW"
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              {language === "te" ? "నేను తీసుకున్న అప్పు (ఇవ్వాల్సినది)" : "Money Borrowed (To Pay)"}
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t("transactions.colAmount")} (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900 text-lg"
              />
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {type === "TRANSFER"
                  ? language === "te"
                    ? "పంపే ఖాతా *"
                    : "From Account *"
                  : language === "te"
                  ? "ఖాతా *"
                  : "Account *"}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (₹{acc.currentBalance.toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Account for Transfers */}
            {type === "TRANSFER" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === "te" ? "చేరే ఖాతా *" : "To Account *"}
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                >
                  {accounts
                    .filter((acc) => acc.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (₹{acc.currentBalance.toLocaleString("en-IN")})
                      </option>
                    ))}
                </select>
              </div>
            ) : type === "INCOME" || type === "EXPENSE" ? (
              /* Category Selection */
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("transactions.colCategory")}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                >
                  <option value="">{t("common.select")}</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {language === "te" ? cat.nameTe : cat.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* Party and Due Date for Debts */}
          {(type === "LEND" || type === "BORROW") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === "te" ? "వ్యక్తి / స్నేహితుడు *" : "Contact / Person *"}
                </label>
                {parties.length > 0 ? (
                  <select
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 mb-1.5"
                  >
                    <option value="">
                      {language === "te" ? "-- జాబితా నుండి ఎంచుకోండి --" : "-- Choose from contacts --"}
                    </option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  type="text"
                  placeholder={
                    language === "te"
                      ? "లేదా కొత్త పేరు టైప్ చేయండి"
                      : "Or enter new person's name"
                  }
                  value={newPartyName}
                  onChange={(e) => {
                    setNewPartyName(e.target.value);
                    if (e.target.value) setPartyId("");
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("debts.dueDate")} ({t("common.optional")})
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("transactions.colDate")} *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("transactions.colNote")}
              </label>
              <input
                type="text"
                placeholder={language === "te" ? "వివరణ (ఉదా. పెట్రోల్, బియ్యం)" : "e.g. Groceries, Dinner, Fuel"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800"
              />
            </div>
          </div>

          {/* Action Buttons */}
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
              {submitting ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

