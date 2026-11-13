# Personal-Finance-Management

A modern, full-featured **Personal Finance Management Dashboard** built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM**.

Designed with complete **Bilingual Support (English & Telugu - తెలుగు)**, double-entry financial tracking, real-time analytics, budgeting, and export capabilities.

---

## 🌟 Key Features

### 1. Financial Ledgers & Cash Flow Management
- **Income Management (`/income`)**: Track recurring salaries, investments, freelance, and other income sources with automatic balance updates.
- **Expense Management (`/expenses`)**: Categorized expense tracking (Food, Rent, Bills, Travel, etc.) with payment method tagging (UPI, Cash, Debit/Credit Card, Bank Transfer).
- **Paid Money Management (`/paid-money`)**: Track loans given to others and debt repayments made.
- **Received Money Management (`/received-money`)**: Track borrowed funds and debt repayments collected.
- **Pending Payments & Receivables (`/pending-payments`, `/pending-receivables`)**: Track dues with due dates, overdue tagging, and partial settlement workflows.
- **Master Transaction Ledger (`/transactions`)**: Unified search, multi-filter ledger (period, category, account, type), detail inspection, and atomic edits/deletions with balance reconciliation.

### 2. Multi-Account Management (`/accounts`)
- Support for Bank Accounts, Cash in Hand, Digital Wallets, and Credit Cards.
- Inter-account balance transfers with balance verification.
- Soft-delete account archiving to preserve transaction history.

### 3. Budget Management (`/budgets`)
- Monthly spending limits (overall & category-wise).
- Real-time spending percentages and remaining budget calculations.
- 80% spending warning banner & 100%+ budget exceeded critical notifications.
- Daily spending pacing and projected end-of-month expenditure.

### 4. Reports & Analytics (`/reports`)
- 9 comprehensive report modes: **Daily, Weekly, Monthly, Yearly, Income, Expense, Pending Payments, Received Payments, and Savings**.
- Custom date range and category filters.
- Interactive visualizations: Income vs Expense trends, cash flow distributions, and account balances.
- **Export Formats**: Excel (`.xlsx`), CSV (with UTF-8 BOM for proper Telugu character rendering in Microsoft Excel), and Print-ready PDF.

### 5. Bilingual Support (English & Telugu)
- Full localization via `react-i18next`.
- Google Font `Noto Sans Telugu` with anti-clipping line-height styling.
- Localized date formatting, charts, and financial indicators.

### 6. Accounting Integrity & Security
- All multi-table updates wrapped in `prisma.$transaction`.
- Overpayment prevention on debt settlements.
- Automatic account balance reversals on transaction edits or deletions.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & ORM**: SQLite / PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Icons**: Lucide React
- **Internationalization**: i18next & react-i18next
- **Exports**: SheetJS (`xlsx`) & Print-to-PDF CSS

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20 LTS recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Suneel-rgb/Personal-Finance-Management.git
   cd Personal-Finance-Management
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the Database:**
   ```bash
   cp .env.example .env
   npx prisma generate
   npx prisma db push
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
