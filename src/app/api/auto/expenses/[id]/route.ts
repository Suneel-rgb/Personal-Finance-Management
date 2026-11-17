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
      expenseDate,
      category,
      title,
      amount,
      fuelLitersOrKg,
      meterReadingKm,
      paymentMethod,
      notes,
    } = body;

    const existing = await prisma.autoExpense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const date = expenseDate ? new Date(expenseDate) : existing.expenseDate;
    const numAmount = amount !== undefined ? parseFloat(amount) : existing.amount;

    const updated = await prisma.autoExpense.update({
      where: { id },
      data: {
        expenseDate: date,
        category: category !== undefined ? category : existing.category,
        title: title !== undefined ? title : existing.title,
        amount: numAmount,
        fuelLitersOrKg: fuelLitersOrKg !== undefined ? (fuelLitersOrKg ? parseFloat(fuelLitersOrKg) : null) : existing.fuelLitersOrKg,
        meterReadingKm: meterReadingKm !== undefined ? (meterReadingKm ? parseFloat(meterReadingKm) : null) : existing.meterReadingKm,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    await syncDailyLog(user.id, existing.expenseDate);
    if (existing.expenseDate.toDateString() !== date.toDateString()) {
      await syncDailyLog(user.id, date);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/auto/expenses/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update expense" }, { status: 500 });
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
    const existing = await prisma.autoExpense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.autoExpense.delete({ where: { id } });
    await syncDailyLog(user.id, existing.expenseDate);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/auto/expenses/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete expense" }, { status: 500 });
  }
}
