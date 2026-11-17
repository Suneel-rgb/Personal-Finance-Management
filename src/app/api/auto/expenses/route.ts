import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";
import { syncDailyLog } from "@/lib/autoSync";

export async function GET(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const category = searchParams.get("category");

    const where: any = { userId: user.id };

    if (dateParam) {
      const start = new Date(dateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateParam);
      end.setHours(23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    } else if (startDateParam || endDateParam) {
      where.expenseDate = {};
      if (startDateParam) {
        const s = new Date(startDateParam);
        s.setHours(0, 0, 0, 0);
        where.expenseDate.gte = s;
      }
      if (endDateParam) {
        const e = new Date(endDateParam);
        e.setHours(23, 59, 59, 999);
        where.expenseDate.lte = e;
      }
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    const expenses = await prisma.autoExpense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalFuelCost = expenses
      .filter((e) => e.category === "CNG_GAS" || e.category === "PETROL_DIESEL")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalMaintenanceCost = expenses
      .filter(
        (e) =>
          e.category === "MAINTENANCE" ||
          e.category === "OIL_GREASE" ||
          e.category === "TYRE_PUNCTURE" ||
          e.category === "AUTO_WASH"
      )
      .reduce((sum, e) => sum + e.amount, 0);
    const totalOtherCost = totalExpenses - (totalFuelCost + totalMaintenanceCost);

    return NextResponse.json({
      expenses,
      summary: {
        totalExpenses,
        totalFuelCost,
        totalMaintenanceCost,
        totalOtherCost,
      },
    });
  } catch (error: any) {
    console.error("GET /api/auto/expenses error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch auto expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      expenseDate,
      category,
      title,
      amount,
      fuelLitersOrKg,
      meterReadingKm,
      paymentMethod = "CASH",
      accountId,
      deductFromAccount = false,
      notes,
    } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Please enter a valid expense amount" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const date = expenseDate ? new Date(expenseDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create AutoExpense
      const expense = await tx.autoExpense.create({
        data: {
          userId: user.id,
          expenseDate: date,
          category,
          title: title?.trim() || category.replace(/_/g, " "),
          amount: numAmount,
          fuelLitersOrKg: fuelLitersOrKg ? parseFloat(fuelLitersOrKg) : null,
          meterReadingKm: meterReadingKm ? parseFloat(meterReadingKm) : null,
          paymentMethod: paymentMethod || "CASH",
          accountId: accountId || null,
          notes: notes?.trim() || null,
        },
      });

      // 2. Optionally deduct from specified account
      if (deductFromAccount && accountId) {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: numAmount } },
        });

        // Create transaction in main ledger
        await tx.transaction.create({
          data: {
            userId: user.id,
            accountId,
            type: "EXPENSE",
            amount: numAmount,
            paymentMethod: paymentMethod || "CASH",
            transactionDate: date,
            title: `Auto Expense: ${title || category}`,
            notes: notes || `Auto expense under ${category}`,
          },
        });
      }

      return expense;
    });

    // Sync daily log
    await syncDailyLog(user.id, date);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/auto/expenses error:", error);
    return NextResponse.json({ error: error.message || "Failed to record auto expense" }, { status: 500 });
  }
}
