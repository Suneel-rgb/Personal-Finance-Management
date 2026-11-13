import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function GET() {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { nameEn: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { nameEn, nameTe, type, icon, color } = body;

    if (!nameEn || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        userId: user.id,
        nameEn,
        nameTe: nameTe || nameEn,
        type,
        icon: icon || "tag",
        color: color || "#3B82F6",
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("Categories POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create category" }, { status: 500 });
  }
}

