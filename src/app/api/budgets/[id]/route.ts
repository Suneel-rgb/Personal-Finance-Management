import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

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
    const { amountLimit, alertThresholdPct } = body;

    const limit = parseFloat(amountLimit);
    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json({ error: "Please enter a valid amount limit" }, { status: 400 });
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        amountLimit: limit,
        alertThresholdPct: alertThresholdPct ? parseInt(alertThresholdPct) : 80,
      },
      include: { category: true },
    });

    return NextResponse.json(budget);
  } catch (error: any) {
    console.error("Budget PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update budget" }, { status: 500 });
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
    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Budget DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete budget" }, { status: 500 });
  }
}

