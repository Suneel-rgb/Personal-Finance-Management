"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  X,
  Calendar,
  CreditCard,
  Building2,
  Tag,
  FileText,
  User,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Trash2,
  Edit,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  onEdit?: (tx: any) => void;
  onDelete?: (id: string) => void;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
}: TransactionDetailModalProps) {
  const { t, language, formatCurrency, formatDate } = useLanguage();

  if (!isOpen || !transaction) return null;

  const isIncome =
    transaction.type === "INCOME" ||
    transaction.type === "BORROW" ||
    transaction.type === "RECEIVABLE_COLLECTED";
  const isExpense =
    transaction.type === "EXPENSE" ||
    transaction.type === "LEND" ||
    transaction.type === "PAYABLE_PAID";
  const isTransfer = transaction.type === "TRANSFER";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {language === "te" ? "లావాదేవీ వివరాలు" : "Transaction Details"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-slate-900/50">
          <Badge
            variant={isIncome ? "success" : isExpense ? "danger" : "info"}
            size="md"
            className="mb-2"
          >
            {isIncome ? (
              <ArrowUpRight size={13} />
            ) : isExpense ? (
              <ArrowDownRight size={13} />
            ) : (
              <ArrowLeftRight size={13} />
            )}
            <span>{t(`transactions.types.${transaction.type}`, transaction.type)}</span>
          </Badge>

          <div
            className={`text-3xl font-black tracking-tight ${
              isIncome
                ? "text-emerald-600 dark:text-emerald-400"
                : isExpense
                ? "text-rose-600 dark:text-rose-400"
                : "text-blue-600 dark:text-blue-400"
            }`}
          >
            {isIncome ? "+" : isExpense ? "-" : ""}
            {formatCurrency(transaction.amount)}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {formatDate(transaction.transactionDate)}
          </p>
        </div>

        {/* Detailed Attribute Rows */}
        <div className="p-6 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          {/* Account */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Building2 size={14} />
              {t("transactions.colAccount")}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {transaction.account?.name || "Account"}
              {isTransfer && transaction.toAccount && ` → ${transaction.toAccount.name}`}
            </span>
          </div>

          {/* Payment Method */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <CreditCard size={14} />
              {language === "te" ? "చెల్లింపు పద్ధతి" : "Payment Method"}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {transaction.paymentMethod || "UPI"}
            </span>
          </div>

          {/* Category */}
          {transaction.category && (
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Tag size={14} />
                {t("transactions.colCategory")}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {language === "te" ? transaction.category.nameTe : transaction.category.nameEn}
              </span>
            </div>
          )}

          {/* Person / Contact */}
          {(transaction.party || transaction.debt?.party) && (
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <User size={14} />
                {language === "te" ? "వ్యక్తి" : "Person / Contact"}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {transaction.party?.name || transaction.debt?.party?.name}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="flex items-start justify-between py-1">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <FileText size={14} />
              {t("transactions.colNote")}
            </span>
            <span className="font-medium text-slate-900 dark:text-white text-right max-w-xs">
              {transaction.notes || "—"}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {onDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onDelete(transaction.id);
                onClose();
              }}
            >
              <Trash2 size={13} />
              <span>{t("common.delete")}</span>
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(transaction);
                  onClose();
                }}
              >
                <Edit size={13} />
                <span>{t("common.edit")}</span>
              </Button>
            )}

            <Button variant="secondary" size="sm" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

