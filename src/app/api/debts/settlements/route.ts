import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureInitialData } from "@/lib/initDb";

export async function GET(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "BORROWED" (payables paid) or "LENT" (receivables collected) or all

    const settlements = await prisma.debtSettlement.findMany({
      where: {
        debt: {
          userId: user.id,
          ...(type ? { type } : { type: "BORROWED" }),
        },
      },
      include: {
        debt: {
          include: { party: true },
        },
        transaction: {
          include: { account: true },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json(settlements);
  } catch (error: any) {
    console.error("Fetch settlements error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch paid history" },
      { status: 500 }
    );
  }
}

