"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Settings,
  Languages,
  Tag,
  PlusCircle,
  Database,
  Download,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category state
  const [nameEn, setNameEn] = useState("");
  const [nameTe, setNameTe] = useState("");
  const [catType, setCatType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [color, setColor] = useState("#3B82F6");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchCategories = () => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;

    setSubmitting(true);
    setSuccessMsg("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameEn: nameEn.trim(),
          nameTe: nameTe.trim() || nameEn.trim(),
          type: catType,
          color,
        }),
      });

      if (res.ok) {
        setNameEn("");
        setNameTe("");
        setSuccessMsg(language === "te" ? "కొత్త వర్గం విజయవంతంగా జోడించబడింది!" : "Category created successfully!");
        fetchCategories();
        setTimeout(() => setSuccessMsg(""), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const [txs, accs, debts, budgets, goals] = await Promise.all([
        fetch("/api/transactions").then((r) => r.json()),
        fetch("/api/accounts").then((r) => r.json()),
        fetch("/api/debts").then((r) => r.json()),
        fetch("/api/budgets").then((r) => r.json()),
        fetch("/api/savings").then((r) => r.json()),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        transactions: txs,
        accounts: accs,
        debts,
        budgets,
        savingsGoals: goals,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `FinanceFlow_Backup_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Backup export failed", err);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {t("nav.settings")}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          {language === "te"
            ? "భాష, కరెన్సీ, వర్గాలు మరియు డేటా బ్యాకప్ ప్రాధాన్యతలు"
            : "Manage your language, currency, custom categories, and data backups"}
        </p>
      </div>

      {/* Language & Regional Settings */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-800">
          <Languages size={18} className="text-emerald-600" />
          <h2 className="text-sm font-bold">
            {language === "te" ? "భాషా ఎంపిక (Language Selection)" : "Language & Region"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* English Option */}
          <div
            onClick={() => setLanguage("en")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              language === "en"
                ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20"
                : "bg-slate-50 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div>
              <span className="text-sm font-bold text-slate-900 block">English</span>
              <span className="text-xs text-slate-500 block">Default language</span>
            </div>
            {language === "en" && <CheckCircle2 size={18} className="text-emerald-600" />}
          </div>

          {/* Telugu Option */}
          <div
            onClick={() => setLanguage("te")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              language === "te"
                ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20"
                : "bg-slate-50 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div>
              <span className="text-sm font-bold text-slate-900 block">తెలుగు (Telugu)</span>
              <span className="text-xs text-slate-500 block">పూర్తి తెలుగు అనువాదం</span>
            </div>
            {language === "te" && <CheckCircle2 size={18} className="text-emerald-600" />}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{language === "te" ? "ప్రామాణిక కరెన్సీ:" : "Base Currency:"}</span>
          <span className="font-bold text-slate-800">🇮🇳 Indian Rupee (INR - ₹)</span>
        </div>
      </div>

      {/* Category Manager */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2 text-slate-800">
          <Tag size={18} className="text-blue-600" />
          <h2 className="text-sm font-bold">
            {language === "te" ? "వర్గాల నిర్వహణ (Categories)" : "Manage Categories"}
          </h2>
        </div>

        {/* Create Category Form */}
        <form onSubmit={handleCreateCategory} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <span className="text-xs font-bold text-slate-700 block">
            {language === "te" ? "+ కొత్త వర్గాన్ని జోడించండి" : "+ Add Custom Category"}
          </span>

          {successMsg && (
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold">
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Category Name (English) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Gym & Fitness"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                వర్గం పేరు (తెలుగు)
              </label>
              <input
                type="text"
                placeholder="ఉదా. వ్యాయామం & ఫిట్‌నెస్"
                value={nameTe}
                onChange={(e) => setNameTe(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                {t("transactions.colType")} *
              </label>
              <select
                value={catType}
                onChange={(e) => setCatType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
              >
                <option value="EXPENSE">{language === "te" ? "ఖర్చు (Expense)" : "Expense"}</option>
                <option value="INCOME">{language === "te" ? "రాబడి (Income)" : "Income"}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Color
              </label>
              <div className="flex items-center gap-1.5">
                {["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-6 w-6 rounded-full border-2 transition-all ${
                        color === c ? "border-slate-800 scale-110 shadow-xs" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  )
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
            >
              {submitting ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>

        {/* Existing Categories Badges */}
        <div className="pt-2">
          <span className="text-xs font-bold text-slate-500 block mb-2">
            {language === "te" ? "ప్రస్తుత వర్గాలు" : "Active Categories"} ({categories.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color || "#3B82F6" }}
                />
                {language === "te" ? c.nameTe : c.nameEn}
                <span className="text-[10px] text-slate-400">
                  ({c.type === "INCOME" ? "In" : "Ex"})
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Data Backup & Export */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-800">
          <Database size={18} className="text-teal-600" />
          <h2 className="text-sm font-bold">
            {language === "te" ? "డేటా బ్యాకప్ & నిల్వ" : "Data Backup & Local Persistence"}
          </h2>
        </div>

        <p className="text-xs text-slate-500">
          {language === "te"
            ? "మీ లావాదేవీలు, ఖాతా వివరాలు మరియు బడ్జెట్‌ల పూర్తి బ్యాకప్‌ను JSON ఫైల్ రూపంలో మీ కంప్యూటర్‌లో భద్రపరుచుకోండి."
            : "Download an instant JSON backup archive of all your accounts, transactions, debts, and budgets."}
        </p>

        <button
          onClick={handleExportBackup}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-colors"
        >
          <Download size={15} />
          <span>{language === "te" ? "పూర్తి డేటా బ్యాకప్ డౌన్‌లోడ్ (JSON)" : "Export Full Backup (JSON)"}</span>
        </button>
      </div>
    </div>
  );
}

