export type Language = "en" | "te";

export type AccountType =
  | "CASH"
  | "BANK"
  | "CREDIT_CARD"
  | "DIGITAL_WALLET"
  | "INVESTMENT";

export type TransactionType =
  | "INCOME"
  | "EXPENSE"
  | "TRANSFER"
  | "LEND"
  | "BORROW"
  | "SETTLEMENT";

export type DebtType = "LENT" | "BORROWED";

export type DebtStatus = "PENDING" | "PARTIALLY_PAID" | "SETTLED" | "OVERDUE";

export type BudgetPeriod = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface AccountData {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  accountNumber?: string | null;
  color?: string | null;
  isActive: boolean;
}

export interface CategoryData {
  id: string;
  nameEn: string;
  nameTe: string;
  type: "INCOME" | "EXPENSE";
  icon?: string | null;
  color?: string | null;
  isDefault: boolean;
}

export interface PartyData {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface DebtData {
  id: string;
  partyId: string;
  party: PartyData;
  type: DebtType;
  originalAmount: number;
  remainingAmount: number;
  dueDate?: string | null;
  status: DebtStatus;
  notes?: string | null;
  settlements?: DebtSettlementData[];
}

export interface DebtSettlementData {
  id: string;
  debtId: string;
  transactionId: string;
  amountPaid: number;
  paymentDate: string;
  notes?: string | null;
}

export interface TransactionData {
  id: string;
  accountId: string;
  account: { id: string; name: string; color?: string | null };
  toAccountId?: string | null;
  toAccount?: { id: string; name: string } | null;
  categoryId?: string | null;
  category?: { id: string; nameEn: string; nameTe: string; color?: string | null; icon?: string | null } | null;
  partyId?: string | null;
  party?: { id: string; name: string } | null;
  debtId?: string | null;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  notes?: string | null;
}

export interface BudgetData {
  id: string;
  categoryId: string;
  category: { id: string; nameEn: string; nameTe: string; color?: string | null };
  period: BudgetPeriod;
  amountLimit: number;
  alertThresholdPct: number;
  spentAmount: number;
  startDate: string;
  endDate: string;
}

export interface SavingsGoalData {
  id: string;
  nameEn: string;
  nameTe: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  color?: string | null;
  isCompleted: boolean;
}

