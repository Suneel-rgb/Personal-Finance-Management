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
    const dateParam = searchParams.get("date"); // YYYY-MM-DD
    const daysParam = parseInt(searchParams.get("days") || "7");

    if (dateParam) {
      const start = new Date(dateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateParam);
      end.setHours(23, 59, 59, 999);

      let log = await prisma.autoDailyLog.findFirst({
        where: {
          userId: user.id,
          date: { gte: start, lte: end },
        },
      });

      if (!log) {
        // Sync to generate it if rides/expenses exist
        log = await syncDailyLog(user.id, start);
      }

      return NextResponse.json(log);
    }

    // Default: fetch recent daily logs
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysParam);
    sinceDate.setHours(0, 0, 0, 0);

    const logs = await prisma.autoDailyLog.findMany({
      where: {
        userId: user.id,
        date: { gte: sinceDate },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("GET /api/auto/daily-log error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch daily logs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { date, startMeterKm, endMeterKm, notes } = body;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startKm = startMeterKm !== undefined && startMeterKm !== "" ? parseFloat(startMeterKm) : null;
    const endKm = endMeterKm !== undefined && endMeterKm !== "" ? parseFloat(endMeterKm) : null;

    let totalKm: number | null = null;
    if (startKm !== null && endKm !== null && endKm >= startKm) {
      totalKm = endKm - startKm;
    }

    const existing = await prisma.autoDailyLog.findFirst({
      where: {
        userId: user.id,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    let result;
    if (existing) {
      result = await prisma.autoDailyLog.update({
        where: { id: existing.id },
        data: {
          startMeterKm: startKm !== null ? startKm : existing.startMeterKm,
          endMeterKm: endKm !== null ? endKm : existing.endMeterKm,
          totalKm: totalKm !== null ? totalKm : existing.totalKm,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });
    } else {
      result = await prisma.autoDailyLog.create({
        data: {
          userId: user.id,
          date: startOfDay,
          startMeterKm: startKm,
          endMeterKm: endKm,
          totalKm,
          notes,
        },
      });
    }

    // Trigger full sync
    await syncDailyLog(user.id, targetDate);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/auto/daily-log error:", error);
    return NextResponse.json({ error: error.message || "Failed to update meter readings" }, { status: 500 });
  }
}
