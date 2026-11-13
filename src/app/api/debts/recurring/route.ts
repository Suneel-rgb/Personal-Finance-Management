import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { debtId } = body;

    if (!debtId) {
      return NextResponse.json({ error: "Debt ID is required" }, { status: 400 });
    }

    const currentDebt = await prisma.debt.findUnique({
      where: { id: debtId },
      include: { party: true },
    });

    if (!currentDebt) {
      return NextResponse.json({ error: "Original payment record not found" }, { status: 404 });
    }

    const freq = currentDebt.frequency || "ONE_TIME";
    if (freq !== "WEEKLY" && freq !== "MONTHLY") {
      return NextResponse.json(
        { error: "Only weekly or monthly recurring payments can generate the next cycle" },
        { status: 400 }
      );
    }

    // Compute next due date
    const baseDate = currentDebt.dueDate ? new Date(currentDebt.dueDate) : new Date();
    let nextDueDate = new Date(baseDate);

    if (freq === "WEEKLY") {
      nextDueDate.setDate(nextDueDate.getDate() + 7);
    } else if (freq === "MONTHLY") {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    // Prevent duplicate recurring entries
    const startOfDay = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), nextDueDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), nextDueDate.getDate(), 23, 59, 59);

    const existingDuplicate = await prisma.debt.findFirst({
      where: {
        userId: user.id,
        partyId: currentDebt.partyId,
        title: currentDebt.title,
        frequency: freq,
        dueDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingDuplicate) {
      return NextResponse.json(
        { error: "A payment record for this upcoming period already exists" },
        { status: 400 }
      );
    }

    const nextPayment = await prisma.debt.create({
      data: {
        userId: user.id,
        partyId: currentDebt.partyId,
        title: currentDebt.title,
        type: currentDebt.type,
        frequency: freq,
        originalAmount: currentDebt.originalAmount,
        remainingAmount: currentDebt.originalAmount,
        paidAmount: 0,
        paymentMethod: currentDebt.paymentMethod || "UPI",
        dueDate: nextDueDate,
        status: "PENDING",
        notes: currentDebt.notes || null,
        parentDebtId: currentDebt.id,
        isRecurring: true,
      },
      include: { party: true },
    });

    return NextResponse.json(nextPayment, { status: 201 });
  } catch (error: any) {
    console.error("Generate recurring debt error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate next recurring payment" },
      { status: 500 }
    );
  }
}

