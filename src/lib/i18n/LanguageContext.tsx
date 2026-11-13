"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import i18n from "./i18n";
import { I18nextProvider, useTranslation as useI18nextTranslation } from "react-i18next";
import { translations } from "./translations";

export type Language = "en" | "te";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, fallback?: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pf_language") as Language | null;
    if (saved === "en" || saved === "te") {
      setLanguageState(saved);
      i18n.changeLanguage(saved);
      document.documentElement.lang = saved;
      document.documentElement.setAttribute("data-lang", saved);
    } else {
      i18n.changeLanguage("en");
      document.documentElement.lang = "en";
      document.documentElement.setAttribute("data-lang", "en");
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("pf_language", lang);
      document.documentElement.lang = lang;
      document.documentElement.setAttribute("data-lang", lang);
    }
  };

  const toggleLanguage = () => {
    const next = language === "en" ? "te" : "en";
    setLanguage(next);
  };

  const t = (path: string, fallback?: string): string => {
    // 1. Try i18next first
    const translated = i18n.t(path, { defaultValue: "" });
    if (translated && translated !== path) {
      return translated;
    }

    // 2. Fallback to dictionary tree traversal
    const dict = translations[language] || translations.en;
    const parts = path.split(".");
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        // Fallback to English
        let fallbackVal: any = translations.en;
        for (const fbPart of parts) {
          if (fallbackVal && typeof fallbackVal === "object" && fbPart in fallbackVal) {
            fallbackVal = fallbackVal[fbPart];
          } else {
            return fallback || path;
          }
        }
        return typeof fallbackVal === "string" ? fallbackVal : fallback || path;
      }
    }

    return typeof current === "string" ? current : fallback || path;
  };

  const formatCurrency = (amount: number): string => {
    const isNegative = amount < 0;
    const absVal = Math.abs(amount);
    const formatted = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);

    return `${isNegative ? "-" : ""}₹${formatted}`;
  };

  const formatDate = (date: string | Date): string => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    return new Intl.DateTimeFormat(language === "te" ? "te-IN" : "en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  };

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider
        value={{
          language,
          setLanguage,
          toggleLanguage,
          t,
          formatCurrency,
          formatDate,
        }}
      >
        {children}
      </LanguageContext.Provider>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Re-export react-i18next useTranslation hook for full compatibility
export { useI18nextTranslation as useTranslation };
