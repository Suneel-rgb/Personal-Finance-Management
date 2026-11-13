import prisma from "./prisma";

export async function ensureInitialData() {
  try {
    const user = await prisma.user.upsert({
      where: { email: "user@personalfinance.local" },
      update: {},
      create: {
        email: "user@personalfinance.local",
        fullName: "My Finance Account",
        preferredLanguage: "en",
        baseCurrency: "INR",
      },
    });

    // 1. Ensure Categories
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

    // 2. Ensure Accounts
    let accCash = await prisma.account.findFirst({ where: { userId: user.id, type: "CASH" } });
    if (!accCash) {
      accCash = await prisma.account.create({
        data: {
          userId: user.id,
          name: "Cash in Hand",
          type: "CASH",
          initialBalance: 8500,
          currentBalance: 8500,
          color: "#10B981",
        },
      });
    }

    let accSBI = await prisma.account.findFirst({ where: { userId: user.id, name: { contains: "SBI" } } });
    if (!accSBI) {
      accSBI = await prisma.account.create({
        data: {
          userId: user.id,
          name: "SBI Savings Bank",
          type: "BANK",
          initialBalance: 65000,
          currentBalance: 65000,
          accountNumber: "•••4582",
          color: "#3B82F6",
        },
      });
    }

    let accHDFC = await prisma.account.findFirst({ where: { userId: user.id, name: { contains: "HDFC" } } });
    if (!accHDFC) {
      accHDFC = await prisma.account.create({
        data: {
          userId: user.id,
          name: "HDFC Salary Account",
          type: "BANK",
          initialBalance: 42000,
          currentBalance: 42000,
          accountNumber: "•••9104",
          color: "#8B5CF6",
        },
      });
    }

    // 3. Ensure Parties
    let partyRamesh = await prisma.party.findFirst({ where: { userId: user.id, name: { contains: "Ramesh" } } });
    if (!partyRamesh) {
      partyRamesh = await prisma.party.create({
        data: {
          userId: user.id,
          name: "Ramesh (Colleague)",
          phone: "9876543210",
          notes: "Lent for medical emergency",
        },
      });
    }

    let partySuresh = await prisma.party.findFirst({ where: { userId: user.id, name: { contains: "Suresh" } } });
    if (!partySuresh) {
      partySuresh = await prisma.party.create({
        data: {
          userId: user.id,
          name: "Suresh (Friend)",
          phone: "9123456780",
          notes: "Borrowed for laptop purchase",
        },
      });
    }

    // 4. Ensure Debts
    const debtCount = await prisma.debt.count({ where: { userId: user.id } });
    let debtRamesh = await prisma.debt.findFirst({ where: { userId: user.id, partyId: partyRamesh.id } });

    if (debtCount === 0 || !debtRamesh) {
      const dueDateRamesh = new Date();
      dueDateRamesh.setDate(dueDateRamesh.getDate() + 10);

      debtRamesh = await prisma.debt.create({
        data: {
          userId: user.id,
          partyId: partyRamesh.id,
          type: "LENT",
          originalAmount: 15000,
          remainingAmount: 10000,
          dueDate: dueDateRamesh,
          status: "PARTIALLY_PAID",
          notes: "Hospital expense loan",
        },
      });

      const dueDateSuresh = new Date();
      dueDateSuresh.setDate(dueDateSuresh.getDate() + 5);

      await prisma.debt.create({
        data: {
          userId: user.id,
          partyId: partySuresh.id,
          type: "BORROWED",
          originalAmount: 8000,
          remainingAmount: 8000,
          dueDate: dueDateSuresh,
          status: "PENDING",
          notes: "Short-term borrow for travel tickets",
        },
      });
    }

    // 5. Ensure Sample Transactions
    const txCount = await prisma.transaction.count({ where: { userId: user.id } });
    if (txCount === 0) {
      const catSalary = await prisma.category.findFirst({ where: { userId: user.id, nameEn: "Salary" } });
      const catGroceries = await prisma.category.findFirst({ where: { userId: user.id, nameEn: "Groceries & Food" } });
      const catRent = await prisma.category.findFirst({ where: { userId: user.id, nameEn: "Rent & Housing" } });
      const catFuel = await prisma.category.findFirst({ where: { userId: user.id, nameEn: "Transportation & Petrol" } });
      const catDining = await prisma.category.findFirst({ where: { userId: user.id, nameEn: "Dining & Entertainment" } });

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Monthly Salary
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: accHDFC.id,
          categoryId: catSalary?.id,
          type: "INCOME",
          amount: 85000,
          transactionDate: sevenDaysAgo,
          notes: "Monthly Salary Credit",
        },
      });

      // House Rent
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: accSBI.id,
          categoryId: catRent?.id,
          type: "EXPENSE",
          amount: 18000,
          transactionDate: sevenDaysAgo,
          notes: "House rent payment",
        },
      });

      // Groceries
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: accSBI.id,
          categoryId: catGroceries?.id,
          type: "EXPENSE",
          amount: 4500,
          transactionDate: threeDaysAgo,
          notes: "Monthly supermarket groceries & vegetables",
        },
      });

      // Fuel
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: accCash.id,
          categoryId: catFuel?.id,
          type: "EXPENSE",
          amount: 1200,
          transactionDate: yesterday,
          notes: "Petrol bunk topup",
        },
      });

      // Dinner
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: accHDFC.id,
          categoryId: catDining?.id,
          type: "EXPENSE",
          amount: 1850,
          transactionDate: today,
          notes: "Family dinner at restaurant",
        },
      });

      // Partial Settlement from Ramesh
      if (debtRamesh) {
        const settlementTx = await prisma.transaction.create({
          data: {
            userId: user.id,
            accountId: accCash.id,
            partyId: partyRamesh.id,
            debtId: debtRamesh.id,
            type: "SETTLEMENT",
            amount: 5000,
            transactionDate: yesterday,
            notes: "Ramesh cash repayment (Part 1)",
          },
        });

        await prisma.debtSettlement.create({
          data: {
            debtId: debtRamesh.id,
            transactionId: settlementTx.id,
            amountPaid: 5000,
            paymentDate: yesterday,
            notes: "First installment repayment",
          },
        });
      }
    }

    // 6. Ensure Budgets
    const budgetCount = await prisma.budget.count({ where: { userId: user.id } });
    if (budgetCount === 0) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const catGroceries = await prisma.category.findFirst({ where: { userId: user.id, nameEn: "Groceries & Food" } });
      const catDining = await prisma.category.findFirst({ where: { userId: user.id, nameEn: "Dining & Entertainment" } });
      const catFuel = await prisma.category.findFirst({ where: { userId: user.id, nameEn: "Transportation & Petrol" } });

      if (catGroceries) {
        await prisma.budget.create({
          data: {
            userId: user.id,
            categoryId: catGroceries.id,
            period: "MONTHLY",
            amountLimit: 12000,
            alertThresholdPct: 80,
            startDate: startOfMonth,
            endDate: endOfMonth,
          },
        });
      }

      if (catDining) {
        await prisma.budget.create({
          data: {
            userId: user.id,
            categoryId: catDining.id,
            period: "MONTHLY",
            amountLimit: 5000,
            alertThresholdPct: 75,
            startDate: startOfMonth,
            endDate: endOfMonth,
          },
        });
      }

      if (catFuel) {
        await prisma.budget.create({
          data: {
            userId: user.id,
            categoryId: catFuel.id,
            period: "MONTHLY",
            amountLimit: 4000,
            alertThresholdPct: 80,
            startDate: startOfMonth,
            endDate: endOfMonth,
          },
        });
      }
    }

    // 7. Ensure Savings Goals
    const goalCount = await prisma.savingsGoal.count({ where: { userId: user.id } });
    if (goalCount === 0) {
      const goalTargetDate1 = new Date();
      goalTargetDate1.setMonth(goalTargetDate1.getMonth() + 6);

      const goalTargetDate2 = new Date();
      goalTargetDate2.setFullYear(goalTargetDate2.getFullYear() + 1);

      await prisma.savingsGoal.create({
        data: {
          userId: user.id,
          nameEn: "Emergency Reserve Fund",
          nameTe: "అత్యవసర నిధి (ఎమర్జెన్సీ ఫండ్)",
          targetAmount: 150000,
          currentAmount: 65000,
          targetDate: goalTargetDate1,
          color: "#10B981",
        },
      });

      await prisma.savingsGoal.create({
        data: {
          userId: user.id,
          nameEn: "New Vehicle Purchase",
          nameTe: "కొత్త వాహనం కొనుగోలు",
          targetAmount: 90000,
          currentAmount: 30000,
          targetDate: goalTargetDate2,
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
