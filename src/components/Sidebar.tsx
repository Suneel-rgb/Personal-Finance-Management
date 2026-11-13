"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  HandCoins,
  PieChart,
  Target,
  BarChart3,
  Settings,
  Languages,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Send,
  Download,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { sampleUserProfile } from "@/lib/sampleData";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const navSections: NavSection[] = [
    {
      title: language === "te" ? "ప్రధాన మెనూ" : "Overview",
      items: [
        { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
        { href: "/accounts", label: t("nav.accounts"), icon: Wallet },
        { href: "/transactions", label: t("nav.transactions"), icon: ArrowLeftRight },
      ],
    },
    {
      title: language === "te" ? "రాబడి & ఖర్చుల నిర్వహణ" : "Cash Flow Ledgers",
      items: [
        { href: "/income", label: t("nav.income"), icon: TrendingUp },
        { href: "/expenses", label: t("nav.expenses"), icon: TrendingDown },
        { href: "/paid-money", label: t("nav.paidMoney"), icon: Send },
        { href: "/received-money", label: t("nav.receivedMoney"), icon: Download },
      ],
    },
    {
      title: language === "te" ? "బకాయిలు & అప్పులు" : "Dues & Debts",
      items: [
        { href: "/pending-payments", label: t("nav.pendingPayments"), icon: Clock },
        { href: "/pending-receivables", label: t("nav.pendingReceivables"), icon: CheckCircle2 },
        { href: "/debts", label: t("nav.debts"), icon: HandCoins },
      ],
    },
    {
      title: language === "te" ? "ప్రణాళిక & విశ్లేషణ" : "Planning & Reports",
      items: [
        { href: "/budgets", label: t("nav.budgets"), icon: PieChart },
        { href: "/savings", label: t("nav.savings"), icon: Target },
        { href: "/reports", label: t("nav.reports"), icon: BarChart3 },
        { href: "/settings", label: t("nav.settings"), icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Hamburger Toggle Button */}
      <div className="lg:hidden fixed top-3.5 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
          aria-label="Toggle Navigation"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Branding Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800/80 gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-black text-lg">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                  {language === "te" ? "ఫైనాన్స్ ఫ్లో" : "FinanceFlow"}
                </span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                  PRO
                </span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">
                {language === "te" ? "వ్యక్తిగత ఆర్థిక వేదిక" : "Wealth Operating System"}
              </span>
            </div>
          </div>

          {/* Navigation Items Grouped by Sections */}
          <nav className="p-4 space-y-5">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.title}
                </span>

                <div className="space-y-0.5 pt-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            size={17}
                            className={
                              isActive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
                            }
                          />
                          <span>{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 text-[10px] font-bold rounded-md ${
                              isActive
                                ? "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer with Controls and User Profile */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/50">
          {/* Theme & Language Quick Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
              title="Toggle Language / భాష మార్చండి"
            >
              <Languages size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>{language === "te" ? "English" : "తెలుగు"}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
              title="Toggle Theme / థీమ్ మార్చండి"
            >
              {theme === "light" ? (
                <>
                  <Moon size={13} className="text-indigo-600" />
                  <span>{language === "te" ? "డార్క్" : "Dark"}</span>
                </>
              ) : (
                <>
                  <Sun size={13} className="text-amber-400" />
                  <span>{language === "te" ? "లైట్" : "Light"}</span>
                </>
              )}
            </button>
          </div>

          {/* User Profile Mini Bar */}
          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-emerald-500">
                <img
                  src={sampleUserProfile.avatarUrl}
                  alt={sampleUserProfile.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                  {language === "te" ? sampleUserProfile.nameTe : sampleUserProfile.name}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                  {language === "te" ? sampleUserProfile.roleTe : sampleUserProfile.role}
                </span>
              </div>
            </div>

            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
}
