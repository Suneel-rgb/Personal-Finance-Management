export interface SampleTransaction {
  id: string;
  title: string;
  titleTe: string;
  category: string;
  categoryTe: string;
  categoryIcon: string;
  account: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "RECEIVABLE_COLLECTED" | "PAYABLE_PAID";
  amount: number;
  date: string;
  status: "COMPLETED" | "PENDING";
  paymentMethod: string;
}

export interface SamplePendingPayment {
  id: string;
  personName: string;
  phone: string;
  type: "RECEIVABLE" | "PAYABLE"; // RECEIVABLE: someone owes you; PAYABLE: you owe someone
  originalAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: "PENDING" | "PARTIALLY_PAID" | "OVERDUE";
  notes: string;
  notesTe: string;
}

export interface SampleBudget {
  id: string;
  category: string;
  categoryTe: string;
  color: string;
  limit: number;
  spent: number;
  threshold: number;
}

export interface SampleAccount {
  id: string;
  name: string;
  nameTe: string;
  type: "CASH" | "BANK" | "CREDIT_CARD" | "INVESTMENT";
  accountNumber?: string;
  balance: number;
  color: string;
}

export const sampleUserProfile = {
  name: "Suneel Garnepudi",
  nameTe: "సునీల్ గార్నెపూడి",
  email: "garnepudisuneel@gmail.com",
  role: "Finance Admin",
  roleTe: "ఫైనాన్స్ అడ్మిన్",
  currency: "INR",
  currencySymbol: "₹",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
};

export const sampleMetrics = {
  netWorth: {
    amount: 148250,
    changePct: 8.4,
    isPositive: true,
  },
  monthlyIncome: {
    amount: 95000,
    changePct: 12.0,
    isPositive: true,
  },
  monthlyExpense: {
    amount: 34200,
    changePct: -3.8, // negative expense change is positive financial health
    isPositive: true,
  },
  savingsRate: {
    ratePct: 64,
    changePct: 4.2,
    isPositive: true,
  },
  availableLiquidity: {
    amount: 128450,
    accountsCount: 4,
  },
  totalReceivables: {
    amount: 28000,
    count: 3,
  },
  totalPayables: {
    amount: 8200,
    count: 1,
  },
};

export const sampleCashFlowData = {
  monthly: [
    { label: "Jun", labelTe: "జూన్", income: 78000, expense: 38000, net: 40000 },
    { label: "Jul", labelTe: "జూలై", income: 82000, expense: 41000, net: 41000 },
    { label: "Aug", labelTe: "ఆగస్టు", income: 80000, expense: 35000, net: 45000 },
    { label: "Sep", labelTe: "సెప్టెంబరు", income: 85000, expense: 39000, net: 46000 },
    { label: "Oct", labelTe: "అక్టోబరు", income: 90000, expense: 36500, net: 53500 },
    { label: "Nov", labelTe: "నవంబరు", income: 95000, expense: 34200, net: 60800 },
  ],
  weekly: [
    { label: "Week 1", labelTe: "వారం 1", income: 85000, expense: 16500, net: 68500 },
    { label: "Week 2", labelTe: "వారం 2", income: 2000, expense: 6800, net: -4800 },
    { label: "Week 3", labelTe: "వారం 3", income: 8000, expense: 5900, net: 2100 },
    { label: "Week 4", labelTe: "వారం 4", income: 0, expense: 5000, net: -5000 },
  ],
  daily: [
    { label: "01 Nov", labelTe: "01 నవం", income: 85000, expense: 14000, net: 71000 },
    { label: "03 Nov", labelTe: "03 నవం", income: 0, expense: 1200, net: -1200 },
    { label: "05 Nov", labelTe: "05 నవం", income: 0, expense: 2450, net: -2450 },
    { label: "07 Nov", labelTe: "07 నవం", income: 10000, expense: 850, net: 9150 },
    { label: "09 Nov", labelTe: "09 నవం", income: 0, expense: 680, net: -680 },
    { label: "11 Nov", labelTe: "11 నవం", income: 0, expense: 1420, net: -1420 },
    { label: "13 Nov", labelTe: "13 నవం", income: 0, expense: 1850, net: -1850 },
  ],
};

export const sampleCategoryExpenses = [
  { name: "Rent & Housing", nameTe: "ఇంటి అద్దె & వసతి", amount: 14000, color: "#3B82F6", share: 40.9 },
  { name: "Groceries & Food", nameTe: "కిరాణా & భోజనం", amount: 8500, color: "#10B981", share: 24.8 },
  { name: "Transport & Fuel", nameTe: "రవాణా & పెట్రోల్", amount: 3200, color: "#F59E0B", share: 9.4 },
  { name: "Dining & Outings", nameTe: "రెస్టారెంట్లు & డైనింగ్", amount: 2800, color: "#8B5CF6", share: 8.2 },
  { name: "Utilities & Bills", nameTe: "కరెంట్ & నీటి బిల్లులు", amount: 2400, color: "#EC4899", share: 7.0 },
  { name: "Healthcare", nameTe: "వైద్యం & ఆరోగ్యం", amount: 2100, color: "#EF4444", share: 6.1 },
  { name: "Shopping", nameTe: "షాపింగ్ & ఇతరం", amount: 1200, color: "#64748B", share: 3.5 },
];

export const samplePendingPayments: SamplePendingPayment[] = [
  {
    id: "p1",
    personName: "Ramesh Sharma",
    phone: "+91 98765 43210",
    type: "RECEIVABLE",
    originalAmount: 20000,
    remainingAmount: 12000,
    dueDate: "2026-11-17",
    status: "PARTIALLY_PAID",
    notes: "Medical emergency loan (Part 1 received ₹8,000)",
    notesTe: "వైద్య సహాయం కోసం ఇచ్చిన అప్పు (మొదటి భాగం ₹8,000 అందింది)",
  },
  {
    id: "p2",
    personName: "Suresh Reddy",
    phone: "+91 91234 56789",
    type: "RECEIVABLE",
    originalAmount: 10000,
    remainingAmount: 10000,
    dueDate: "2026-11-22",
    status: "PENDING",
    notes: "Short-term project advance",
    notesTe: "ప్రాజెక్ట్ ఖర్చుల కోసం ఇచ్చిన అడ్వాన్స్",
  },
  {
    id: "p3",
    personName: "Anil Kumar",
    phone: "+91 99887 66554",
    type: "RECEIVABLE",
    originalAmount: 6000,
    remainingAmount: 6000,
    dueDate: "2026-11-10",
    status: "OVERDUE",
    notes: "Laptop repair assistance",
    notesTe: "ల్యాప్‌టాప్ మరమ్మతుల కోసం ఇచ్చిన అప్పు",
  },
  {
    id: "p4",
    personName: "Rajesh V.",
    phone: "+91 94401 22334",
    type: "PAYABLE",
    originalAmount: 8200,
    remainingAmount: 8200,
    dueDate: "2026-11-27",
    status: "PENDING",
    notes: "Two-wheeler insurance & accessories advance",
    notesTe: "ద్విచక్ర వాహన బీమా & ఉపకరణాల కోసం తీసుకున్న మొత్తం",
  },
];

export const sampleRecentTransactions: SampleTransaction[] = [
  {
    id: "tx-1",
    title: "Monthly Salary Credit",
    titleTe: "నెలవారీ జీతం జమ",
    category: "Salary",
    categoryTe: "జీతం",
    categoryIcon: "briefcase",
    account: "HDFC Salary Account",
    type: "INCOME",
    amount: 85000,
    date: "2026-11-01",
    status: "COMPLETED",
    paymentMethod: "Direct Bank Deposit",
  },
  {
    id: "tx-2",
    title: "Apartment Monthly Rent",
    titleTe: "ఇంటి నెలవారీ అద్దె",
    category: "Rent & Housing",
    categoryTe: "ఇంటి అద్దె",
    categoryIcon: "home",
    account: "SBI Savings Bank",
    type: "EXPENSE",
    amount: 14000,
    date: "2026-11-05",
    status: "COMPLETED",
    paymentMethod: "UPI Transfer",
  },
  {
    id: "tx-3",
    title: "Ramesh Sharma - Loan Repayment",
    titleTe: "రమేష్ శర్మ - అప్పు చెల్లింపు",
    category: "Debt Collection",
    categoryTe: "అప్పు వసూలు",
    categoryIcon: "hand-coins",
    account: "Cash in Hand",
    type: "RECEIVABLE_COLLECTED",
    amount: 8000,
    date: "2026-11-10",
    status: "COMPLETED",
    paymentMethod: "Cash Settlement",
  },
  {
    id: "tx-4",
    title: "Freelance UI Consulting",
    titleTe: "ఫ్రీలాన్స్ యూఐ కన్సల్టింగ్",
    category: "Freelance",
    categoryTe: "ఫ్రీలాన్సింగ్",
    categoryIcon: "trending-up",
    account: "HDFC Salary Account",
    type: "INCOME",
    amount: 10000,
    date: "2026-11-07",
    status: "COMPLETED",
    paymentMethod: "NEFT Bank Transfer",
  },
  {
    id: "tx-5",
    title: "Ratnadeep Supermarket Groceries",
    titleTe: "రత్నదీప్ సూపర్ మార్కెట్ కిరాణా",
    category: "Groceries & Food",
    categoryTe: "కిరాణా & భోజనం",
    categoryIcon: "shopping-cart",
    account: "Cash in Hand",
    type: "EXPENSE",
    amount: 2450,
    date: "2026-11-12",
    status: "COMPLETED",
    paymentMethod: "Cash",
  },
  {
    id: "tx-6",
    title: "HPCL Petrol Bunk Fuel",
    titleTe: "పెట్రోల్ బంక్ ఇంధనం",
    category: "Transport & Fuel",
    categoryTe: "రవాణా & పెట్రోల్",
    categoryIcon: "car",
    account: "SBI Savings Bank",
    type: "EXPENSE",
    amount: 1200,
    date: "2026-11-11",
    status: "COMPLETED",
    paymentMethod: "Debit Card",
  },
  {
    id: "tx-7",
    title: "TSSPDCL Electricity Bill",
    titleTe: "విద్యుత్ బిల్లు చెల్లింపు",
    category: "Utilities & Bills",
    categoryTe: "కరెంట్ బిల్లు",
    categoryIcon: "zap",
    account: "HDFC Salary Account",
    type: "EXPENSE",
    amount: 1420,
    date: "2026-11-08",
    status: "COMPLETED",
    paymentMethod: "NetBanking",
  },
  {
    id: "tx-8",
    title: "Family Restaurant Dinner",
    titleTe: "కుటుంబ రెస్టారెంట్ భోజనం",
    category: "Dining & Outings",
    categoryTe: "రెస్టారెంట్లు & డైనింగ్",
    categoryIcon: "film",
    account: "ICICI Coral Credit Card",
    type: "EXPENSE",
    amount: 1850,
    date: "2026-11-13",
    status: "COMPLETED",
    paymentMethod: "Credit Card",
  },
  {
    id: "tx-9",
    title: "Apollo Pharmacy Medical Supplies",
    titleTe: "అపోలో ఫార్మసీ మందులు",
    category: "Healthcare",
    categoryTe: "వైద్యం",
    categoryIcon: "heart-pulse",
    account: "Cash in Hand",
    type: "EXPENSE",
    amount: 850,
    date: "2026-11-04",
    status: "COMPLETED",
    paymentMethod: "Cash",
  },
  {
    id: "tx-10",
    title: "ATM Cash Withdrawal",
    titleTe: "ఏటీఎం నగదు విత్‌డ్రా",
    category: "Account Transfer",
    categoryTe: "ఖాతా బదిలీ",
    categoryIcon: "arrow-left-right",
    account: "SBI Savings → Cash",
    type: "TRANSFER",
    amount: 5000,
    date: "2026-11-06",
    status: "COMPLETED",
    paymentMethod: "ATM Cash",
  },
];

export const sampleBudgets: SampleBudget[] = [
  {
    id: "b-1",
    category: "Rent & Housing",
    categoryTe: "ఇంటి అద్దె & వసతి",
    color: "#3B82F6",
    limit: 14000,
    spent: 14000,
    threshold: 100,
  },
  {
    id: "b-2",
    category: "Groceries & Food",
    categoryTe: "కిరాణా & భోజనం",
    color: "#10B981",
    limit: 10000,
    spent: 8500,
    threshold: 80,
  },
  {
    id: "b-3",
    category: "Transport & Fuel",
    categoryTe: "రవాణా & పెట్రోల్",
    color: "#F59E0B",
    limit: 4000,
    spent: 3200,
    threshold: 80,
  },
  {
    id: "b-4",
    category: "Dining & Entertainment",
    categoryTe: "రెస్టారెంట్లు & వినోదం",
    color: "#8B5CF6",
    limit: 5000,
    spent: 2800,
    threshold: 75,
  },
  {
    id: "b-5",
    category: "Utilities & Electricity",
    categoryTe: "కరెంట్ & నీటి బిల్లులు",
    color: "#EC4899",
    limit: 3000,
    spent: 2400,
    threshold: 80,
  },
];

export const sampleAccounts: SampleAccount[] = [
  {
    id: "acc-1",
    name: "Cash in Hand",
    nameTe: "చేతిలో నగదు",
    type: "CASH",
    balance: 12450,
    color: "#10B981",
  },
  {
    id: "acc-2",
    name: "HDFC Salary Account",
    nameTe: "హెచ్.డి.ఎఫ్.సి శాలరీ ఖాతా",
    type: "BANK",
    accountNumber: "•••• 9104",
    balance: 68000,
    color: "#3B82F6",
  },
  {
    id: "acc-3",
    name: "SBI Savings Bank",
    nameTe: "ఎస్.బి.ఐ సేవింగ్స్ ఖాతా",
    type: "BANK",
    accountNumber: "•••• 4582",
    balance: 48000,
    color: "#8B5CF6",
  },
  {
    id: "acc-4",
    name: "ICICI Coral Credit Card",
    nameTe: "ఐసీఐసీఐ కోరల్ క్రెడిట్ కార్డు",
    type: "CREDIT_CARD",
    accountNumber: "•••• 1122",
    balance: -4200,
    color: "#EF4444",
  },
];

export const sampleSavingsGoals = [
  {
    id: "sg-1",
    title: "Emergency Reserve Fund",
    titleTe: "అత్యవసర నిధి (ఎమర్జెన్సీ ఫండ్)",
    target: 150000,
    current: 85000,
    targetDate: "2027-05-31",
    color: "#10B981",
  },
  {
    id: "sg-2",
    title: "New Electric Two-Wheeler",
    titleTe: "కొత్త ఎలక్ట్రిక్ ద్విచక్ర వాహనం",
    target: 90000,
    current: 45000,
    targetDate: "2027-10-31",
    color: "#3B82F6",
  },
  {
    id: "sg-3",
    title: "Sovereign Gold Bond / Gold",
    titleTe: "బంగారు పొదుపు బాండ్లు",
    target: 50000,
    current: 25000,
    targetDate: "2027-12-31",
    color: "#F59E0B",
  },
];

