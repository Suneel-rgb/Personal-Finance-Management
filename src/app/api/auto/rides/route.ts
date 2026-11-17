import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";
import { syncDailyLog } from "@/lib/autoSync";

export { syncDailyLog };

export async function GET(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const rideType = searchParams.get("rideType");
    const paymentMethod = searchParams.get("paymentMethod");

    const where: any = { userId: user.id };

    if (dateParam) {
      const start = new Date(dateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateParam);
      end.setHours(23, 59, 59, 999);
      where.rideDate = { gte: start, lte: end };
    } else if (startDateParam || endDateParam) {
      where.rideDate = {};
      if (startDateParam) {
        const s = new Date(startDateParam);
        s.setHours(0, 0, 0, 0);
        where.rideDate.gte = s;
      }
      if (endDateParam) {
        const e = new Date(endDateParam);
        e.setHours(23, 59, 59, 999);
        where.rideDate.lte = e;
      }
    }

    if (rideType && rideType !== "ALL") {
      where.rideType = rideType;
    }
    if (paymentMethod && paymentMethod !== "ALL") {
      where.paymentMethod = paymentMethod;
    }

    const rides = await prisma.autoRide.findMany({
      where,
      orderBy: { rideDate: "desc" },
    });

    const totalRides = rides.length;
    const cashEarnings = rides
      .filter((r) => r.paymentMethod === "CASH")
      .reduce((sum, r) => sum + r.fareAmount, 0);
    const upiEarnings = rides
      .filter((r) => r.paymentMethod !== "CASH")
      .reduce((sum, r) => sum + r.fareAmount, 0);
    const totalEarnings = cashEarnings + upiEarnings;

    return NextResponse.json({
      rides,
      summary: {
        totalRides,
        totalEarnings,
        cashEarnings,
        upiEarnings,
      },
    });
  } catch (error: any) {
    console.error("GET /api/auto/rides error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch rides" }, { status: 500 });
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
      rideDate,
      rideType = "LOCAL",
      pickupLocation,
      dropLocation,
      fareAmount,
      paymentMethod = "CASH",
      passengerCount = 1,
      distanceKm,
      notes,
    } = body;

    const numFare = parseFloat(fareAmount);
    if (isNaN(numFare) || numFare <= 0) {
      return NextResponse.json({ error: "Please enter a valid fare amount" }, { status: 400 });
    }

    const date = rideDate ? new Date(rideDate) : new Date();

    const ride = await prisma.autoRide.create({
      data: {
        userId: user.id,
        rideDate: date,
        rideType,
        pickupLocation: pickupLocation?.trim() || null,
        dropLocation: dropLocation?.trim() || null,
        fareAmount: numFare,
        paymentMethod: paymentMethod || "CASH",
        passengerCount: passengerCount ? parseInt(passengerCount) : 1,
        distanceKm: distanceKm ? parseFloat(distanceKm) : null,
        notes: notes?.trim() || null,
      },
    });

    // Update the daily log
    await syncDailyLog(user.id, date);

    return NextResponse.json(ride, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/auto/rides error:", error);
    return NextResponse.json({ error: error.message || "Failed to add ride" }, { status: 500 });
  }
}
