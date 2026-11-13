import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function GET() {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const goals = await prisma.savingsGoal.findMany({
      where: { userId: user.id },
      include: {
        contributions: {
          include: { account: true },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = goals.map((g) => {
      const percentage = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
      return {
        ...g,
        percentage,
        isCompleted: g.currentAmount >= g.targetAmount || g.isCompleted,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Savings GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch savings goals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { nameEn, nameTe, targetAmount, targetDate, color } = body;

    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      return NextResponse.json({ error: "Valid target amount required" }, { status: 400 });
    }

    if (!nameEn) {
      return NextResponse.json({ error: "Goal name is required" }, { status: 400 });
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        nameEn,
        nameTe: nameTe || nameEn,
        targetAmount: target,
        currentAmount: 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        color: color || "#10B981",
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error: any) {
    console.error("Savings POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create savings goal" }, { status: 500 });
  }
}

