"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Wallet,
  Building2,
  Banknote,
  CreditCard,
  PlusCircle,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  X,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard as DigitalWalletIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { TransactionDetailModal } from "@/components/modals/TransactionDetailModal";
import { RecordFormModal } from "@/components/modals/RecordFormModal";

export default function AccountsPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // New Account Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("BANK");
  const [initialBalance, setInitialBalance] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [submitting, setSubmitting] = useState(false);

  // Edit Account Modal state
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("BANK");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editColor, setEditColor] = useState("#3B82F6");
  const [editBalance, setEditBalance] = useState("");

  // Delete Account Modal state
  const [deletingAccount, setDeletingAccount] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");

  // View Account Details Modal state
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<any[]>([]);
  const [loadingAccountTx, setLoadingAccountTx] = useState(false);
  const [accountTxSearch, setAccountTxSearch] = useState("");
  const [accountTxType, setAccountTxType] = useState("ALL");

  // Transaction Inspection & Editing modals from inside Account View
  const [viewingTransaction, setViewingTransaction] = useState<any | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [showAddTxForAccount, setShowAddTxForAccount] = useState(false);

  const fetchAccounts = () => {
    setLoading(true);
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccounts(data);
          if (data.length >= 2 && !fromAccountId) {
            setFromAccountId(data[0].id);
            setToAccountId(data[1].id);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAccounts();

    const handleDataChange = () => fetchAccounts();
    window.addEventListener("finance_data_changed", handleDataChange);
    return () => window.removeEventListener("finance_data_changed", handleDataChange);
  }, []);

  // Fetch single account detailed transactions when selected
  const fetchAccountDetails = async (accId: string) => {
    setLoadingAccountTx(true);
    try {
      const res = await fetch(`/api/accounts/${accId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAccount(data);
        // Combine fromTransactions and toTransactions
        const combined = [
          ...(data.fromTransactions || []).map((t: any) => ({ ...t, direction: "OUT" })),
          ...(data.toTransactions || []).map((t: any) => ({ ...t, direction: "IN" })),
        ].sort(
          (a, b) =>
            new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
        setAccountTransactions(combined);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAccountTx(false);
    }
  };

  const handleOpenAccountDetails = (acc: any) => {
    fetchAccountDetails(acc.id);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          initialBalance: initialBalance || "0",
          accountNumber: accountNumber ? `•••${accountNumber.slice(-4)}` : undefined,
          color,
        }),
      });

      if (res.ok) {
        setName("");
        setInitialBalance("");
        setAccountNumber("");
        setShowAddModal(false);
        fetchAccounts();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (acc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditType(acc.type);
    setEditAccountNumber(acc.accountNumber ? acc.accountNumber.replace(/[^0-9]/g, "") : "");
    setEditColor(acc.color || "#3B82F6");
    setEditBalance(acc.currentBalance.toString());
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          type: editType,
          accountNumber: editAccountNumber ? `•••${editAccountNumber.slice(-4)}` : null,
          color: editColor,
          currentBalance: editBalance ? parseFloat(editBalance) : undefined,
        }),
      });

      if (res.ok) {
        setEditingAccount(null);
        fetchAccounts();
        if (selectedAccount && selectedAccount.id === editingAccount.id) {
          fetchAccountDetails(editingAccount.id);
        }
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (acc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingAccount(acc);
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${deletingAccount.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeletingAccount(null);
        if (selectedAccount && selectedAccount.id === deletingAccount.id) {
          setSelectedAccount(null);
        }
        fetchAccounts();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(transferAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (fromAccountId === toAccountId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: numAmount,
          notes: transferNote || "Account transfer",
        }),
      });

      if (res.ok) {
        setTransferAmount("");
        setTransferNote("");
        setShowTransferModal(false);
        fetchAccounts();
        if (selectedAccount) fetchAccountDetails(selectedAccount.id);
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Type filter
      if (typeFilter !== "ALL" && acc.type !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = acc.name.toLowerCase().includes(query);
        const matchesNumber = acc.accountNumber
          ? acc.accountNumber.toLowerCase().includes(query)
          : false;
        const matchesType = acc.type.toLowerCase().includes(query);
        return matchesName || matchesNumber || matchesType;
      }

      return true;
    });
  }, [accounts, typeFilter, searchQuery]);

  // Aggregate metrics
  const totalLiquid = accounts
    .filter((a) => a.type !== "CREDIT_CARD" && a.isActive !== false)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalBank = accounts
    .filter((a) => a.type === "BANK" && a.isActive !== false)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalCash = accounts
    .filter((a) => a.type === "CASH" && a.isActive !== false)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalCredit = accounts
    .filter((a) => a.type === "CREDIT_CARD" && a.isActive !== false)
    .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

  // Filtered transactions inside account modal
  const filteredAccountTx = useMemo(() => {
    return accountTransactions.filter((tx) => {
      if (accountTxType === "INCOME") {
        if (tx.type !== "INCOME" && tx.type !== "BORROW" && tx.direction !== "IN") return false;
      } else if (accountTxType === "EXPENSE") {
        if (tx.type !== "EXPENSE" && tx.type !== "LEND" && tx.direction !== "OUT") return false;
      } else if (accountTxType === "TRANSFER") {
        if (tx.type !== "TRANSFER") return false;
      }

      if (accountTxSearch.trim()) {
        const q = accountTxSearch.toLowerCase();
        const matchesNote = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
        const matchesParty = tx.party?.name ? tx.party.name.toLowerCase().includes(q) : false;
        const matchesCat = tx.category?.name ? tx.category.name.toLowerCase().includes(q) : false;
        const matchesMethod = tx.paymentMethod ? tx.paymentMethod.toLowerCase().includes(q) : false;
        return matchesNote || matchesParty || matchesCat || matchesMethod;
      }

      return true;
    });
  }, [accountTransactions, accountTxType, accountTxSearch]);

  const colorPalette = [
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#8B5CF6", // Purple
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#06B6D4", // Cyan
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#6366F1", // Indigo
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("accounts.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("accounts.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
          >
            <ArrowLeftRight size={15} className="text-slate-500 dark:text-slate-400" />
            <span>{t("accounts.transferFunds")}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <PlusCircle size={15} />
            <span>{t("accounts.addAccount")}</span>
          </button>
        </div>
      </div>

      {/* Account Balances Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">
            {t("accounts.totalLiquid")}
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white block mt-1">
            {formatCurrency(totalLiquid)}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
            {language === "te" ? "తక్షణమే ఖర్చు చేయగల నిల్వ" : "Ready to spend cash & bank"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">
            {t("accounts.bankSavings")}
          </span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block mt-1">
            {formatCurrency(totalBank)}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">
            {accounts.filter((a) => a.type === "BANK").length}{" "}
            {language === "te" ? "బ్యాంక్ ఖాతాలు" : "bank accounts"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">
            {t("accounts.cashInHand")}
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
            {formatCurrency(totalCash)}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">
            {language === "te" ? "చేతిలో భౌతిక నగదు" : "Physical cash"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">
            {t("accounts.creditCards")}
          </span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block mt-1">
            {formatCurrency(totalCredit)}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">
            {language === "te" ? "చెల్లించాల్సిన బకాయి" : "Outstanding balance"}
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder={
              language === "te"
                ? "ఖాతా పేరు లేదా నంబర్ ద్వారా వెతకండి..."
                : "Search accounts by name or number..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: language === "te" ? "అన్నీ" : "All" },
            { id: "BANK", label: language === "te" ? "బ్యాంక్" : "Bank" },
            { id: "CASH", label: language === "te" ? "నగదు" : "Cash" },
            { id: "CREDIT_CARD", label: language === "te" ? "క్రెడిట్ కార్డ్" : "Credit Card" },
            { id: "DIGITAL_WALLET", label: language === "te" ? "వాలెట్" : "Wallet" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                typeFilter === tab.id
                  ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of All Accounts */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 font-medium text-xs">
          {t("common.loading")}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Wallet size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {language === "te"
              ? "ఎలాంటి ఖాతాలు కనుగొనబడలేదు"
              : "No accounts found"}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            {language === "te"
              ? "మీ శోధన ప్రమాణాలను మార్చండి లేదా కొత్త ఖాతాను జోడించండి."
              : "Try adjusting your search filter or create a new account."}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
          >
            + {t("accounts.addAccount")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => {
            const isCash = acc.type === "CASH";
            const isCC = acc.type === "CREDIT_CARD";
            const isWallet = acc.type === "DIGITAL_WALLET";

            return (
              <div
                key={acc.id}
                onClick={() => handleOpenAccountDetails(acc)}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Top Bar with Icon, Name, and Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2.5 rounded-xl text-white shadow-xs"
                        style={{ backgroundColor: acc.color || "#3B82F6" }}
                      >
                        {isCash ? (
                          <Banknote size={20} />
                        ) : isCC ? (
                          <CreditCard size={20} />
                        ) : isWallet ? (
                          <DigitalWalletIcon size={20} />
                        ) : (
                          <Building2 size={20} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {acc.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {acc.accountNumber || (isCash ? "Physical Cash" : "Active")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                        {acc.type.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">
                      {t("accounts.currentBalance")}
                    </span>
                    <span
                      className={`text-2xl font-black block mt-0.5 ${
                        isCC
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {formatCurrency(acc.currentBalance)}
                    </span>
                  </div>
                </div>

                {/* Footer with Transactions count & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] flex items-center gap-1">
                    <Clock size={12} />
                    <span>
                      {(acc._count?.fromTransactions || 0) +
                        (acc._count?.toTransactions || 0)}{" "}
                      {language === "te" ? "లావాదేవీలు" : "transactions"}
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFromAccountId(acc.id);
                        setShowTransferModal(true);
                      }}
                      title={t("accounts.transferFunds")}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                    >
                      <ArrowLeftRight size={14} />
                    </button>

                    <button
                      onClick={(e) => handleOpenEdit(acc, e)}
                      title={language === "te" ? "సవరించండి" : "Edit Account"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={(e) => handleOpenDelete(acc, e)}
                      title={language === "te" ? "తొలగించండి" : "Delete Account"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>

                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-0.5 ml-1">
                      <Eye size={13} />
                      <span>{language === "te" ? "చూడండి" : "View"}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account Details & Transaction History Modal / Drawer */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl text-white shadow-xs"
                  style={{ backgroundColor: selectedAccount.color || "#3B82F6" }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedAccount.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedAccount.type}
                    </span>
                  </h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {selectedAccount.accountNumber || "Primary Account"} •{" "}
                    {language === "te"
                      ? "ప్రస్తుత నిల్వ:"
                      : "Balance:"}{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatCurrency(selectedAccount.currentBalance)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(selectedAccount)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit Account"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Account Quick Stats Banner */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
                  {t("accounts.currentBalance")}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white block mt-0.5">
                  {formatCurrency(selectedAccount.currentBalance)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
                  {language === "te" ? "ప్రారంభ నిల్వ" : "Initial Balance"}
                </span>
                <span className="text-xl font-black text-slate-700 dark:text-slate-300 block mt-0.5">
                  {formatCurrency(selectedAccount.initialBalance || 0)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
                    {language === "te" ? "మొత్తం లావాదేవీలు" : "Total Activity"}
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {accountTransactions.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowAddTxForAccount(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  + {language === "te" ? "లావాదేవీ" : "Record"}
                </button>
              </div>
            </div>

            {/* Modal Body: Transaction Ledger */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {/* Internal Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder={
                      language === "te"
                        ? "ఈ ఖాతా లావాదేవీలలో వెతకండి..."
                        : "Search this account's transactions..."
                    }
                    value={accountTxSearch}
                    onChange={(e) => setAccountTxSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { id: "ALL", label: language === "te" ? "అన్నీ" : "All" },
                    { id: "INCOME", label: language === "te" ? "రాబడి (+)" : "Inflow (+)" },
                    { id: "EXPENSE", label: language === "te" ? "ఖర్చు (-)" : "Outflow (-)" },
                    { id: "TRANSFER", label: language === "te" ? "బదిలీ" : "Transfer" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAccountTxType(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        accountTxType === tab.id
                          ? "bg-slate-800 text-white dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions List */}
              {loadingAccountTx ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {t("common.loading")}
                </div>
              ) : filteredAccountTx.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {language === "te"
                    ? "ఈ ఖాతాలో ఎలాంటి లావాదేవీలు లేవు."
                    : "No transactions recorded for this account."}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  {filteredAccountTx.map((tx) => {
                    const isIncome =
                      tx.type === "INCOME" ||
                      tx.type === "BORROW" ||
                      tx.direction === "IN";
                    const isExpense =
                      tx.type === "EXPENSE" ||
                      tx.type === "LEND" ||
                      tx.direction === "OUT";

                    return (
                      <div
                        key={tx.id}
                        onClick={() => setViewingTransaction(tx)}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl text-white ${
                              isIncome
                                ? "bg-emerald-500"
                                : isExpense
                                ? "bg-rose-500"
                                : "bg-blue-500"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft size={16} />
                            ) : isExpense ? (
                              <ArrowUpRight size={16} />
                            ) : (
                              <ArrowLeftRight size={16} />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {tx.notes || tx.category?.name || tx.type}
                              </span>
                              {tx.paymentMethod && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                                  {tx.paymentMethod}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                              {formatDate(tx.transactionDate)} •{" "}
                              {tx.party?.name ? `${tx.party.name} • ` : ""}
                              {tx.category?.name || "General"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <span
                            className={`text-sm font-black ${
                              isIncome
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isExpense
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {isIncome ? "+" : isExpense ? "-" : ""}
                            {formatCurrency(tx.amount)}
                          </span>

                          <span className="text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                            <Eye size={14} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {language === "te"
                  ? "లావాదేవీ వివరాలు లేదా సవరణల కోసం ఏదైనా లావాదేవీని క్లిక్ చేయండి."
                  : "Click any transaction to inspect, edit, or delete."}
              </span>
              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                {t("accounts.addAccount")}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("accounts.accountName")} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    language === "te"
                      ? "ఉదా. SBI శాలరీ ఖాతా, నగదు"
                      : "e.g. ICICI Savings, Cash Wallet"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("accounts.accountType")} *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  >
                    <option value="BANK">Bank Account (బ్యాంక్)</option>
                    <option value="CASH">Cash in Hand (చేతిలో నగదు)</option>
                    <option value="CREDIT_CARD">Credit Card (క్రెడిట్ కార్డు)</option>
                    <option value="DIGITAL_WALLET">Wallet (డిజిటల్ వాలెట్)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("accounts.initialBalance")} (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te"
                    ? "ఖాతా చివరి 4 అంకెలు (ఐచ్ఛికం)"
                    : "Account Last 4 Digits (Optional)"}
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 4582"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "కార్డు రంగు" : "Card Theme Color"}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-all cursor-pointer ${
                        color === c
                          ? "border-slate-900 dark:border-white scale-110 shadow-xs"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                {t("accounts.editAccount")}
              </h2>
              <button
                onClick={() => setEditingAccount(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("accounts.accountName")} *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("accounts.accountType")} *
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  >
                    <option value="BANK">Bank Account (బ్యాంక్)</option>
                    <option value="CASH">Cash in Hand (చేతిలో నగదు)</option>
                    <option value="CREDIT_CARD">Credit Card (క్రెడిట్ కార్డు)</option>
                    <option value="DIGITAL_WALLET">Wallet (డిజిటల్ వాలెట్)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("accounts.currentBalance")} (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te"
                    ? "ఖాతా చివరి 4 అంకెలు"
                    : "Account Last 4 Digits"}
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 4582"
                  value={editAccountNumber}
                  onChange={(e) => setEditAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "te" ? "కార్డు రంగు" : "Card Theme Color"}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-all cursor-pointer ${
                        editColor === c
                          ? "border-slate-900 dark:border-white scale-110 shadow-xs"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
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

      {/* Delete / Archive Account Confirmation Modal */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {t("accounts.deleteAccount")}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {deletingAccount.name}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t("accounts.deleteConfirm")}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAccount(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                {deleting ? t("common.loading") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Funds Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                {t("accounts.transferFunds")}
              </h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("accounts.transferAmount")} (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("accounts.sourceAccount")} *
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
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
                  {t("accounts.destinationAccount")} *
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                >
                  {accounts
                    .filter((a) => a.id !== fromAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("accounts.transferNote")}
                </label>
                <input
                  type="text"
                  placeholder={
                    language === "te"
                      ? "ఉదా. ATM నగదు విత్‌డ్రా"
                      : "e.g. ATM Cash Withdrawal"
                  }
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  {submitting ? t("common.loading") : t("accounts.confirmTransfer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        isOpen={!!viewingTransaction}
        transaction={viewingTransaction}
        onClose={() => setViewingTransaction(null)}
        onEdit={(tx) => {
          setViewingTransaction(null);
          setEditingTransaction(tx);
        }}
        onDelete={async (id) => {
          try {
            const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
            if (res.ok) {
              setViewingTransaction(null);
              fetchAccounts();
              if (selectedAccount) fetchAccountDetails(selectedAccount.id);
              window.dispatchEvent(new Event("finance_data_changed"));
            }
          } catch (err) {
            console.error(err);
          }
        }}
      />

      {/* Edit Transaction Modal */}
      <RecordFormModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSuccess={() => {
          setEditingTransaction(null);
          fetchAccounts();
          if (selectedAccount) fetchAccountDetails(selectedAccount.id);
          window.dispatchEvent(new Event("finance_data_changed"));
        }}
        mode="edit"
        initialData={editingTransaction}
      />

      {/* Add New Transaction for this specific account Modal */}
      <RecordFormModal
        isOpen={showAddTxForAccount}
        onClose={() => setShowAddTxForAccount(false)}
        onSuccess={() => {
          setShowAddTxForAccount(false);
          fetchAccounts();
          if (selectedAccount) fetchAccountDetails(selectedAccount.id);
          window.dispatchEvent(new Event("finance_data_changed"));
        }}
        mode="create"
        defaultType="EXPENSE"
        initialData={selectedAccount ? { accountId: selectedAccount.id } : undefined}
      />
    </div>
  );
}
