"use client";

import React, { useState } from "react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"INCOME" | "EXPENSE" | "TRANSFER" | "LEND" | "BORROW">("EXPENSE");

  const handleOpenAddModal = (type: "INCOME" | "EXPENSE" | "TRANSFER" | "LEND" | "BORROW" = "EXPENSE") => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleRefresh = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("finance_data_changed"));
    }
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
          {/* Fixed Left Sidebar */}
          <Sidebar />

          {/* Main Layout Area */}
          <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
            <Topbar onOpenAddModal={handleOpenAddModal} />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>

          {/* Global Add Transaction Modal */}
          <AddTransactionModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={handleRefresh}
            defaultType={modalType}
          />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}
