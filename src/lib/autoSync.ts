import prisma from "@/lib/prisma";

// Recalculate and update the AutoDailyLog for a given date
export async function syncDailyLog(userId: string, targetDate: Date) {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch all rides for this day
  const rides = await prisma.autoRide.findMany({
    where: {
      userId,
      rideDate: { gte: startOfDay, lte: endOfDay },
    },
  });

  const totalRidesCount = rides.length;
  const cashEarnings = rides
    .filter((r) => r.paymentMethod === "CASH")
    .reduce((sum, r) => sum + r.fareAmount, 0);
  const upiEarnings = rides
    .filter((r) => r.paymentMethod !== "CASH")
    .reduce((sum, r) => sum + r.fareAmount, 0);
  const totalEarnings = cashEarnings + upiEarnings;

  // Fetch all expenses for this day
  const expenses = await prisma.autoExpense.findMany({
    where: {
      userId,
      expenseDate: { gte: startOfDay, lte: endOfDay },
    },
  });

  const totalFuelCost = expenses
    .filter((e) => e.category === "CNG_GAS" || e.category === "PETROL_DIESEL")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOtherExpenses = expenses
    .filter((e) => e.category !== "CNG_GAS" && e.category !== "PETROL_DIESEL")
    .reduce((sum, e) => sum + e.amount, 0);

  const netProfit = totalEarnings - (totalFuelCost + totalOtherExpenses);

  // Upsert the daily log record
  const existing = await prisma.autoDailyLog.findFirst({
    where: {
      userId,
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  let totalKm = existing?.totalKm || null;
  if (existing?.startMeterKm && existing?.endMeterKm && existing.endMeterKm >= existing.startMeterKm) {
    totalKm = existing.endMeterKm - existing.startMeterKm;
  }

  if (existing) {
    return await prisma.autoDailyLog.update({
      where: { id: existing.id },
      data: {
        totalRidesCount,
        totalEarnings,
        cashEarnings,
        upiEarnings,
        totalFuelCost,
        totalOtherExpenses,
        netProfit,
        totalKm,
      },
    });
  } else {
    return await prisma.autoDailyLog.create({
      data: {
        userId,
        date: startOfDay,
        totalRidesCount,
        totalEarnings,
        cashEarnings,
        upiEarnings,
        totalFuelCost,
        totalOtherExpenses,
        netProfit,
        totalKm,
      },
    });
  }
}
