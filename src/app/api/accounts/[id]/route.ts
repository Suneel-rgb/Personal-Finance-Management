import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        fromTransactions: {
          orderBy: { transactionDate: "desc" },
          take: 50,
          include: { category: true, party: true, account: true, toAccount: true },
        },
        toTransactions: {
          orderBy: { transactionDate: "desc" },
          take: 50,
          include: { category: true, party: true, account: true, toAccount: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error: any) {
    console.error("Get account error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch account" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, accountNumber, color, currentBalance } = body;

    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        name: name !== undefined ? name : account.name,
        type: type !== undefined ? type : account.type,
        accountNumber: accountNumber !== undefined ? accountNumber : account.accountNumber,
        color: color !== undefined ? color : account.color,
        currentBalance: currentBalance !== undefined ? parseFloat(currentBalance) : account.currentBalance,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update account error:", error);
    return NextResponse.json({ error: error.message || "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txCount = await prisma.transaction.count({
      where: { OR: [{ accountId: id }, { toAccountId: id }] },
    });

    if (txCount > 0) {
      // Soft delete to protect financial audit history
      await prisma.account.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: "Account archived (has transaction history)" });
    }

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete account" }, { status: 500 });
  }
}
