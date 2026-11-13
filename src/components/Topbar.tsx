"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  Search,
  PlusCircle,
  Bell,
  Sun,
  Moon,
  Languages,
  ChevronDown,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react";
import { sampleUserProfile } from "@/lib/sampleData";
import { Button } from "@/components/ui/Button";

interface TopbarProps {
  onOpenAddModal: (type?: "INCOME" | "EXPENSE" | "TRANSFER" | "LEND" | "BORROW") => void;
}

export function Topbar({ onOpenAddModal }: TopbarProps) {
  const { t, language, setLanguage, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [dateString, setDateString] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  useEffect(() => {
    setDateString(
      new Date().toLocaleDateString(language === "te" ? "te-IN" : "en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, [language]);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors">
      {/* Left spacer for mobile hamburger */}
      <div className="w-10 lg:w-0" />

      {/* Center / Left Search Bar */}
      <div className="flex-1 max-w-md hidden md:flex items-center">
        <div className="relative w-full">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            placeholder={t("header.searchPlaceholder")}
            className="w-full pl-9 pr-12 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-400/40 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-sm border border-slate-200 dark:border-slate-700">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right Controls and Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date & Currency Tag */}
        <div className="hidden xl:flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
            🇮🇳 INR (₹)
          </span>
          {dateString && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {dateString}
            </span>
          )}
        </div>

        {/* Language Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-xl shadow-2xs">
          <button
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              language === "en"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-black"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            title="English"
          >
            <span>English</span>
          </button>
          <button
            onClick={() => setLanguage("te")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              language === "te"
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            title="తెలుగు (Telugu)"
          >
            <span>తెలుగు</span>
          </button>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          aria-label="Toggle Theme"
        >
          {theme === "light" ? (
            <Moon size={16} className="text-indigo-600" />
          ) : (
            <Sun size={16} className="text-amber-400" />
          )}
        </button>

        {/* Notifications Dropdown Preview */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              setShowProfileMenu(false);
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {t("header.notifications")}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  2 New
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/40">
                  <span className="font-bold text-amber-900 dark:text-amber-300 block text-[11px]">
                    {language === "te" ? "రావాల్సిన బకాయి రిమైండర్" : "Receivable Reminder"}
                  </span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">
                    {language === "te"
                      ? "రమేష్ శర్మ నుండి ₹12,000 బకాయి గడువు మరో 4 రోజుల్లో ఉంది."
                      : "Ramesh Sharma loan repayment due in 4 days (₹12,000)."}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 block text-[11px]">
                    {language === "te" ? "బడ్జెట్ అప్‌డేట్" : "Budget Health"}
                  </span>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                    {language === "te"
                      ? "మీరు ఈ నెల పొదుపు రేటు 64% చేరుకున్నారు. అద్భుతం!"
                      : "Savings rate reached 64% this month. Great progress!"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <Button
          variant="emerald"
          size="sm"
          onClick={() => onOpenAddModal("EXPENSE")}
          className="hidden sm:inline-flex"
        >
          <PlusCircle size={15} />
          <span>{t("header.newTransaction")}</span>
        </Button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotificationMenu(false);
            }}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition-all cursor-pointer"
          >
            <div className="h-7 w-7 rounded-full overflow-hidden bg-emerald-600 ring-1 ring-emerald-500">
              <img
                src={sampleUserProfile.avatarUrl}
                alt={sampleUserProfile.name}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden md:inline-block max-w-[90px] truncate">
              {language === "te" ? sampleUserProfile.nameTe : sampleUserProfile.name}
            </span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {/* Profile Popover */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white text-xs block">
                  {language === "te" ? sampleUserProfile.nameTe : sampleUserProfile.name}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                  {sampleUserProfile.email}
                </span>
              </div>

              <div className="py-1 space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                <a
                  href="/accounts"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  <User size={14} className="text-slate-400" />
                  <span>{t("header.myAccount")}</span>
                </a>
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  <Settings size={14} className="text-slate-400" />
                  <span>{t("nav.settings")}</span>
                </a>
                <a
                  href="/reports"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  <HelpCircle size={14} className="text-slate-400" />
                  <span>{t("header.support")}</span>
                </a>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>{t("header.logout")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
