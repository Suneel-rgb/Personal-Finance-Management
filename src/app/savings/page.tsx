"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Target,
  PlusCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
} from "lucide-react";

export default function SavingsPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [goals, setGoals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Goal Modal state
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [nameEn, setNameEn] = useState("");
  const [nameTe, setNameTe] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState("#10B981");

  // Contribute Modal state
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [accountId, setAccountId] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchGoals = () => {
    setLoading(true);
    fetch("/api/savings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGoals(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGoals();

    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accs) => {
        if (Array.isArray(accs)) {
          const liquid = accs.filter((a) => a.type !== "CREDIT_CARD");
          setAccounts(liquid);
          if (liquid.length > 0) setAccountId(liquid[0].id);
        }
      })
      .catch((err) => console.error(err));

    const handleDataChange = () => fetchGoals();
    window.addEventListener("finance_data_changed", handleDataChange);
    return () => window.removeEventListener("finance_data_changed", handleDataChange);
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) return;
    if (!nameEn.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameEn: nameEn.trim(),
          nameTe: nameTe.trim() || nameEn.trim(),
          targetAmount: target,
          targetDate: targetDate || undefined,
          color,
        }),
      });

      if (res.ok) {
        setNameEn("");
        setNameTe("");
        setTargetAmount("");
        setTargetDate("");
        setShowAddGoalModal(false);
        fetchGoals();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (!selectedGoal || !accountId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/savings/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: selectedGoal.id,
          accountId,
          amount,
          notes,
        }),
      });

      if (res.ok) {
        setContributionAmount("");
        setNotes("");
        setShowContributeModal(false);
        fetchGoals();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalAccumulated = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalPercentage = totalTarget > 0 ? Math.round((totalAccumulated / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t("savings.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t("savings.subtitle")}
          </p>
        </div>

        <button
          onClick={() => setShowAddGoalModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
        >
          <PlusCircle size={15} />
          <span>{t("savings.addGoal")}</span>
        </button>
      </div>

      {/* Aggregate Overview Card */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-800 text-white p-6 rounded-3xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              {language === "te" ? "మొత్తం పొదుపు పురోగతి" : "Total Accumulated Savings"}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black">{formatCurrency(totalAccumulated)}</span>
              <span className="text-sm font-semibold text-emerald-200">
                / {formatCurrency(totalTarget)}
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15">
            <span className="text-xl font-black">{totalPercentage}%</span>
            <span className="text-[11px] text-emerald-200 block">
              {goals.filter((g) => g.isCompleted).length} / {goals.length}{" "}
              {language === "te" ? "లక్ష్యాలు పూర్తయ్యాయి" : "goals completed"}
            </span>
          </div>
        </div>

        <div className="mt-4 h-3 w-full bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, totalPercentage)}%` }}
          />
        </div>
      </div>

      {/* Savings Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((g) => {
          const isDone = g.isCompleted;

          return (
            <div
              key={g.id}
              className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-all ${
                isDone
                  ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-2 rounded-xl text-white font-bold"
                      style={{ backgroundColor: g.color || "#10B981" }}
                    >
                      <Target size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {language === "te" ? g.nameTe : g.nameEn}
                      </h3>
                      {g.targetDate && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(g.targetDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {isDone && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      <Sparkles size={11} />
                      {t("savings.completed")}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {t("savings.current")}
                    </span>
                    <span className="text-xl font-black text-slate-900 block">
                      {formatCurrency(g.currentAmount)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {t("savings.target")}
                    </span>
                    <span className="text-sm font-bold text-slate-500 block">
                      {formatCurrency(g.targetAmount)}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-3">
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: g.color || "#10B981",
                        width: `${Math.min(100, g.percentage)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>{g.percentage}% {language === "te" ? "సాధించారు" : "achieved"}</span>
                    <span>
                      {isDone
                        ? "100%"
                        : `${formatCurrency(g.targetAmount - g.currentAmount)} ${
                            language === "te" ? "మిగిలి ఉంది" : "left"
                          }`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {g.contributions?.length || 0}{" "}
                  {language === "te" ? "జమలు" : "contributions"}
                </span>

                <button
                  onClick={() => {
                    setSelectedGoal(g);
                    setShowContributeModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {t("savings.contribute")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-sm font-bold text-slate-800">
                {t("savings.addGoal")}
              </h2>
              <button
                onClick={() => setShowAddGoalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Goal Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, New Car"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  లక్ష్యం పేరు (తెలుగు)
                </label>
                <input
                  type="text"
                  placeholder="ఉదా. అత్యవసర నిధి, కొత్త కారు"
                  value={nameTe}
                  onChange={(e) => setNameTe(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("savings.target")} (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 100000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("savings.timeLeft")} ({t("common.optional")})
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        color === c ? "border-slate-800 scale-110 shadow-xs" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
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

      {/* Contribute Funds Modal */}
      {showContributeModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-sm font-bold text-slate-800">
                {t("savings.contribute")} →{" "}
                {language === "te" ? selectedGoal.nameTe : selectedGoal.nameEn}
              </h2>
              <button
                onClick={() => setShowContributeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleContribute} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === "te" ? "జమ చేయాల్సిన మొత్తం" : "Contribution Amount"} (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === "te" ? "ఏ ఖాతా నుండి నిధులు తీయాలి? *" : "Deduct From Account *"}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("transactions.colNote")}
                </label>
                <input
                  type="text"
                  placeholder={language === "te" ? "ఉదా. నెలవారీ పొదుపు జమ" : "e.g. Monthly allocation"}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowContributeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {submitting ? t("common.loading") : t("savings.contribute")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

