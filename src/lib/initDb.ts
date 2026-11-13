import prisma from "./prisma";

export async function ensureInitialData() {
  try {
    const user = await prisma.user.upsert({
      where: { email: "user@personalfinance.local" },
      update: {},
      create: {
        email: "user@personalfinance.local",
        fullName: "Suneel Garnepudi",
        preferredLanguage: "en",
        baseCurrency: "INR",
      },
    });

    // 1. Ensure Standard Categories if not present
    const categoryCount = await prisma.category.count({ where: { userId: user.id } });
    if (categoryCount === 0) {
      const categoriesData = [
        { nameEn: "Salary", nameTe: "జీతం", type: "INCOME", icon: "briefcase", color: "#10B981" },
        { nameEn: "Freelance & Business", nameTe: "వ్యాపారం & ఫ్రీలాన్సింగ్", type: "INCOME", icon: "trending-up", color: "#059669" },
        { nameEn: "Investments & Returns", nameTe: "పెట్టుబడులు & రాబడులు", type: "INCOME", icon: "pie-chart", color: "#047857" },
        { nameEn: "Gifts & Other Income", nameTe: "బహుమతులు & ఇతర రాబడి", type: "INCOME", icon: "plus-circle", color: "#34D399" },
        { nameEn: "Groceries & Food", nameTe: "కిరాణా సరుకులు & భోజనం", type: "EXPENSE", icon: "shopping-cart", color: "#F59E0B" },
        { nameEn: "Rent & Housing", nameTe: "ఇంటి అద్దె & నివాసం", type: "EXPENSE", icon: "home", color: "#EF4444" },
        { nameEn: "Utilities & Electricity", nameTe: "కరెంట్ & నీటి బిల్లులు", type: "EXPENSE", icon: "zap", color: "#F97316" },
        { nameEn: "Transportation & Petrol", nameTe: "ప్రయాణం & పెట్రోల్", type: "EXPENSE", icon: "car", color: "#EC4899" },
        { nameEn: "Dining & Entertainment", nameTe: "రెస్టారెంట్లు & వినోదం", type: "EXPENSE", icon: "film", color: "#8B5CF6" },
        { nameEn: "Healthcare & Pharmacy", nameTe: "వైద్యం & మందులు", type: "EXPENSE", icon: "heart-pulse", color: "#E11D48" },
        { nameEn: "Shopping & Gadgets", nameTe: "షాపింగ్ & దుస్తులు", type: "EXPENSE", icon: "shopping-bag", color: "#6366F1" },
        { nameEn: "Education & Courses", nameTe: "చదువు & పుస్తకాలు", type: "EXPENSE", icon: "book-open", color: "#0284C7" },
        { nameEn: "Other Expenses", nameTe: "ఇతర ఖర్చులు", type: "EXPENSE", icon: "more-horizontal", color: "#64748B" },
      ];

      for (const cat of categoriesData) {
        await prisma.category.create({
          data: { ...cat, userId: user.id, isDefault: true },
        });
      }
    }

    // 2. Ensure initial clean accounts if user has none
    const accountCount = await prisma.account.count({ where: { userId: user.id } });
    if (accountCount === 0) {
      await prisma.account.create({
        data: {
          userId: user.id,
          name: "Cash",
          type: "CASH",
          initialBalance: 0,
          currentBalance: 0,
          color: "#10B981",
        },
      });

      await prisma.account.create({
        data: {
          userId: user.id,
          name: "Bank Account",
          type: "BANK",
          initialBalance: 0,
          currentBalance: 0,
          color: "#3B82F6",
        },
      });
    }

    return user;
  } catch (error) {
    console.error("Error in ensureInitialData:", error);
    throw error;
  }
}
