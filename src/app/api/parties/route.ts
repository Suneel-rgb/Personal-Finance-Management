import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function GET() {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const parties = await prisma.party.findMany({
      where: { userId: user.id },
      include: {
        debts: {
          select: {
            id: true,
            type: true,
            originalAmount: true,
            remainingAmount: true,
            status: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(parties);
  } catch (error: any) {
    console.error("Parties GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, phone, email, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const party = await prisma.party.create({
      data: {
        userId: user.id,
        name,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(party, { status: 201 });
  } catch (error: any) {
    console.error("Parties POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create contact" }, { status: 500 });
  }
}

