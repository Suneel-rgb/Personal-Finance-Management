import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";
import { syncDailyLog } from "@/lib/autoSync";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      rideDate,
      rideType,
      pickupLocation,
      dropLocation,
      fareAmount,
      paymentMethod,
      passengerCount,
      distanceKm,
      notes,
    } = body;

    const existing = await prisma.autoRide.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    const date = rideDate ? new Date(rideDate) : existing.rideDate;
    const numFare = fareAmount !== undefined ? parseFloat(fareAmount) : existing.fareAmount;

    const updated = await prisma.autoRide.update({
      where: { id },
      data: {
        rideDate: date,
        rideType: rideType !== undefined ? rideType : existing.rideType,
        pickupLocation: pickupLocation !== undefined ? pickupLocation : existing.pickupLocation,
        dropLocation: dropLocation !== undefined ? dropLocation : existing.dropLocation,
        fareAmount: numFare,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
        passengerCount: passengerCount !== undefined ? parseInt(passengerCount) : existing.passengerCount,
        distanceKm: distanceKm !== undefined ? parseFloat(distanceKm) : existing.distanceKm,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    // Sync old and new dates' daily log
    await syncDailyLog(user.id, existing.rideDate);
    if (existing.rideDate.toDateString() !== date.toDateString()) {
      await syncDailyLog(user.id, date);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/auto/rides/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update ride" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    const existing = await prisma.autoRide.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    await prisma.autoRide.delete({ where: { id } });
    await syncDailyLog(user.id, existing.rideDate);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/auto/rides/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete ride" }, { status: 500 });
  }
}
