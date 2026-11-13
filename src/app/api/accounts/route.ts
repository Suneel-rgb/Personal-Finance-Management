import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function GET() {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { fromTransactions: true, toTransactions: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error("Accounts GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, initialBalance, accountNumber, color } = body;

    if (!name) {
      return NextResponse.json({ error: "Account name is required" }, { status: 400 });
    }

    const balance = parseFloat(initialBalance || "0");

    const account = await prisma.account.create({
      data: {
        userId: user.id,
        name,
        type: type || "BANK",
        initialBalance: balance,
        currentBalance: balance,
        accountNumber: accountNumber || null,
        color: color || "#3B82F6",
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error("Accounts POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create account" }, { status: 500 });
  }
}

