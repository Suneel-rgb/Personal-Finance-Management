"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  PieChart,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  X,
  Target,
  Edit2,
  Trash2,
  ShieldAlert,
  Bell,
  ArrowRight,
} from "lucide-react";

export default function BudgetsPage() {
  const { t, language, formatCurrency } = useLanguage();
  const { theme } = useTheme();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Budget Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amountLimit, setAmountLimit] = useState("");
  const [alertThresholdPct, setAlertThresholdPct] = useState("80");
  const [submitting, setSubmitting] = useState(false);

  // Edit Budget Modal state
  const [editingBudget, setEditingBudget] = useState<any | null>(null);
  const [editLimit, setEditLimit] = useState("");
  const [editThreshold, setEditThreshold] = useState("80");

  // Delete Budget Modal state
  const [deletingBudget, setDeletingBudget] = useState<any | null>(null);

  const fetchBudgets = () => {
    setLoading(true);
    fetch("/api/budgets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBudgets(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBudgets();

    fetch("/api/categories")
      .then((r) => r.json())
      .then((cats) => {
        if (Array.isArray(cats)) {
          const expenseCats = cats.filter((c) => c.type === "EXPENSE");
          setCategories(expenseCats);
          if (expenseCats.length > 0) setCategoryId(expenseCats[0].id);
        }
      })
      .catch((err) => console.error(err));

    const handleDataChange = () => fetchBudgets();
    window.addEventListener("finance_data_changed", handleDataChange);
    return () => window.removeEventListener("finance_data_changed", handleDataChange);
  }, []);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(amountLimit);
    if (isNaN(limit) || limit <= 0) return;
    if (!categoryId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          amountLimit: limit,
          alertThresholdPct: parseInt(alertThresholdPct) || 80,
        }),
      });

      if (res.ok) {
        setAmountLimit("");
        setShowAddModal(false);
        fetchBudgets();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (b: any) => {
    setEditingBudget(b);
    setEditLimit(b.amountLimit.toString());
    setEditThreshold((b.alertThresholdPct || 80).toString());
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    const limit = parseFloat(editLimit);
    if (isNaN(limit) || limit <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/budgets/${editingBudget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountLimit: limit,
          alertThresholdPct: parseInt(editThreshold) || 80,
        }),
      });

      if (res.ok) {
        setEditingBudget(null);
        fetchBudgets();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!deletingBudget) return;
    try {
      const res = await fetch(`/api/budgets/${deletingBudget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeletingBudget(null);
        fetchBudgets();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Overall Monthly Metrics
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.amountLimit, 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const totalRemaining = Math.max(0, totalBudgetLimit - totalBudgetSpent);
  const overallPercentage =
    totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;

  // Active Warnings & Exceeded Notifications
  const exceededBudgets = budgets.filter((b) => b.isOverBudget);
  const warningBudgets = budgets.filter((b) => b.isWarning && !b.isOverBudget);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <PieChart size={24} className="text-emerald-600 dark:text-emerald-400" />
            <span>{t("budgets.title")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("budgets.subtitle")}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
        >
          <PlusCircle size={15} />
          <span>{t("budgets.addBudget")}</span>
        </button>
      </div>

      {/* 2. Critical Notifications & 80% Warnings Banners */}
      {/* Budget Exceeded Critical Alert */}
      {exceededBudgets.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-800 dark:text-rose-200 shadow-xs">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2">
              <strong className="text-sm font-extrabold text-rose-900 dark:text-rose-100">
                {language === "te"
                  ? "హెచ్చరిక: బడ్జెట్ పరిమితి దాటింది!"
                  : "Critical Alert: Budget Exceeded!"}
              </strong>
              <span className="px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100 font-bold text-[10px]">
                {exceededBudgets.length} {language === "te" ? "వర్గాలు" : "categories"}
              </span>
            </div>
            <p className="mt-1 text-rose-700 dark:text-rose-300">
              {language === "te"
                ? "క్రింది వర్గాలు వాటి కేటాయించిన నెలవారీ బడ్జెట్ పరిమితిని దాటిపోయాయి:"
                : "The following categories have spent beyond 100% of their allocated monthly cap:"}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {exceededBudgets.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 font-bold text-rose-700 dark:text-rose-300"
                >
                  <span>{language === "te" ? b.category.nameTe : b.category.nameEn}</span>
                  <span className="text-slate-400">({b.percentage}%)</span>
                  <span className="text-rose-600 font-black">
                    +{formatCurrency(b.spentAmount - b.amountLimit)} {language === "te" ? "అదనం" : "over"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 80% Spending Warning Banner */}
      {warningBudgets.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-amber-800 dark:text-amber-200 shadow-xs">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2">
              <strong className="text-sm font-extrabold text-amber-900 dark:text-amber-100">
                {language === "te"
                  ? "జాగ్రత్త: 80% బడ్జెట్ పరిమితి దగ్గరలో ఉంది!"
                  : "Caution: 80% Spending Threshold Reached"}
              </strong>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold text-[10px]">
                {warningBudgets.length} {language === "te" ? "హెచ్చరికలు" : "near limit"}
              </span>
            </div>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              {language === "te"
                ? "ఈ క్రింది వర్గాల ఖర్చులు వాటి 80% పరిమితిని దాటాయి. ఖర్చులను అదుపులో ఉంచుకోండి:"
                : "You have consumed 80%+ of the monthly budget on these categories:"}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {warningBudgets.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 font-bold text-amber-800 dark:text-amber-300"
                >
                  <span>{language === "te" ? b.category.nameTe : b.category.nameEn}</span>
                  <span className="text-amber-600 font-black">({b.percentage}%)</span>
                  <span className="text-slate-400">
                    {formatCurrency(b.remainingAmount)} {language === "te" ? "మిగిలింది" : "left"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Overall Monthly Budget Summary Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {language === "te"
                ? "ఈ నెల మొత్తం బడ్జెట్ వినియోగం (Overall Monthly Budget)"
                : "Overall Monthly Budget Utilization"}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {formatCurrency(totalBudgetSpent)}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {formatCurrency(totalBudgetLimit)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:text-right">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">
                {language === "te" ? "మొత్తం మిగిలిన బడ్జెట్" : "Remaining Monthly Budget"}
              </span>
              <span
                className={`text-lg font-black ${
                  totalRemaining > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                }`}
              >
                {formatCurrency(totalRemaining)}
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                overallPercentage > 100
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  : overallPercentage >= 80
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {overallPercentage > 100 ? (
                <AlertCircle size={14} />
              ) : overallPercentage >= 80 ? (
                <AlertTriangle size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {overallPercentage}% {language === "te" ? "పూర్తయింది" : "Consumed"}
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              overallPercentage > 100
                ? "bg-rose-500"
                : overallPercentage >= 80
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{budgets.length} {language === "te" ? "వర్గాలకు బడ్జెట్ ఉంది" : "budget categories set"}</span>
          <span>
            {overallPercentage >= 100
              ? `${language === "te" ? "బడ్జెట్ పరిమితి దాటింది" : "Budget Limit Exceeded"}`
              : `${formatCurrency(totalRemaining)} ${language === "te" ? "ఖర్చు చేయగలరు" : "available to spend"}`}
          </span>
        </div>
      </div>

      {/* 4. Category-Wise Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map((b) => {
          const isOver = b.isOverBudget;
          const isWarning = b.isWarning;

          return (
            <div
              key={b.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: b.category?.color || "#3B82F6" }}
                    />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {language === "te" ? b.category.nameTe : b.category.nameEn}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isOver
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : isWarning
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {isOver
                      ? t("budgets.paceDanger")
                      : isWarning
                      ? t("budgets.paceWarning")
                      : t("budgets.paceSafe")}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {t("budgets.spent")}
                    </span>
                    <span
                      className={`text-xl font-extrabold block ${
                        isOver ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {formatCurrency(b.spentAmount)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {t("budgets.limit")}
                    </span>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 block">
                      {formatCurrency(b.amountLimit)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver
                          ? "bg-rose-500"
                          : isWarning
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {b.percentage}% {language === "te" ? "వాడారు" : "spent"}
                    </span>
                    <span className={isOver ? "text-rose-600 dark:text-rose-400 font-bold" : ""}>
                      {isOver
                        ? `${t("budgets.overBudget")} ${formatCurrency(b.spentAmount - b.amountLimit)}`
                        : `${formatCurrency(b.remainingAmount)} ${t("budgets.remaining")}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Pacing projection & Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <TrendingUp size={12} />
                  <span>
                    {language === "te" ? "నెల చివరికి అంచనా:" : "Month-end Est:"}{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatCurrency(b.projectedSpend)}
                    </strong>
                  </span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title={language === "te" ? "సవరించండి" : "Edit Budget"}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => setDeletingBudget(b)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title={language === "te" ? "తొలగించండి" : "Delete Budget"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Add Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("budgets.addBudget")}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBudget} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("transactions.colCategory")} *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {language === "te" ? c.nameTe : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("budgets.monthlyBudget")} (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 10000"
                  value={amountLimit}
                  onChange={(e) => setAmountLimit(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "హెచ్చరిక పరిమితి శాతం (%)" : "Alert Warning Threshold (%)"}
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={alertThresholdPct}
                  onChange={(e) => setAlertThresholdPct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  {language === "te"
                    ? "ఖర్చు ఈ శాతాన్ని (ఉదా. 80%) చేరుకున్నప్పుడు పసుపు హెచ్చరిక బ్యానర్ కనిపిస్తుంది"
                    : "Triggers warning alert when spending reaches this % (default 80%)"}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  {submitting ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Budget Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === "te" ? "బడ్జెట్ పరిమితిని సవరించండి" : "Edit Budget Limit"}
              </h2>
              <button
                onClick={() => setEditingBudget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateBudget} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("transactions.colCategory")}
                </label>
                <input
                  type="text"
                  disabled
                  value={language === "te" ? editingBudget.category?.nameTe : editingBudget.category?.nameEn}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("budgets.monthlyBudget")} (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editLimit}
                  onChange={(e) => setEditLimit(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "హెచ్చరిక పరిమితి శాతం (%)" : "Alert Warning Threshold (%)"}
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  {submitting ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Budget Confirmation Modal */}
      {deletingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {language === "te" ? "బడ్జెట్‌ను తొలగించండి" : "Delete Budget"}
                </h3>
                <span className="text-xs text-slate-400">
                  {language === "te" ? deletingBudget.category?.nameTe : deletingBudget.category?.nameEn}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {language === "te"
                ? "మీరు ఖచ్చితంగా ఈ వర్గానికి సంబంధించిన బడ్జెట్ పరిమితిని తొలగించాలనుకుంటున్నారా?"
                : "Are you sure you want to delete this monthly budget limit?"}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBudget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteBudget}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
