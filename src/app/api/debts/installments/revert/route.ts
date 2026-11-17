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
    const { installmentId } = body;

    if (!installmentId) {
      return NextResponse.json({ error: "Installment ID is required" }, { status: 400 });
    }

    // 1. Fetch installment with parent debt and transaction
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        debt: {
          include: { installments: true },
        },
        transaction: {
          include: { account: true },
        },
      },
    });

    if (!installment) {
      return NextResponse.json({ error: "Installment not found" }, { status: 404 });
    }

    if (installment.status !== "PAID" && installment.status !== "PARTIALLY_PAID" && !installment.transactionId) {
      return NextResponse.json({ error: "Installment is not paid, cannot revert" }, { status: 400 });
    }

    const refundAmount = installment.paidAmount > 0 ? installment.paidAmount : installment.amount;
    const parentDebt = installment.debt;

    // 2. Refund the account balance if a transaction exists
    if (installment.transaction) {
      const accountId = installment.transaction.accountId;
      const txAmount = installment.transaction.amount;

      // Refund the money back to the account
      await prisma.account.update({
        where: { id: accountId },
        data: {
          currentBalance: { increment: txAmount },
        },
      });

      // Delete the linked DebtSettlement if any
      await prisma.debtSettlement.deleteMany({
        where: { transactionId: installment.transaction.id },
      });

      // Delete the transaction
      await prisma.transaction.delete({
        where: { id: installment.transaction.id },
      });
    }

    // 3. Determine new installment status: if past due date, status is OVERDUE or PENDING
    const due = new Date(installment.dueDate);
    const now = new Date();
    const isPastDue = due < now;

    const revertedInstallment = await prisma.installment.update({
      where: { id: installment.id },
      data: {
        status: isPastDue ? "OVERDUE" : "PENDING",
        paidAmount: 0.0,
        paidDate: null,
        transactionId: null,
      },
    });

    // 4. Update parent Debt totals
    const newPaidAmount = Math.max(0, parentDebt.paidAmount - refundAmount);
    const newRemainingAmount = Math.min(parentDebt.originalAmount, parentDebt.remainingAmount + refundAmount);

    const hasAnyOtherPaid = await prisma.installment.count({
      where: {
        debtId: parentDebt.id,
        id: { not: installment.id },
        status: { in: ["PAID", "PARTIALLY_PAID", "SETTLED"] },
      },
    });

    const newDebtStatus = newPaidAmount > 0 || hasAnyOtherPaid > 0 ? "PARTIALLY_PAID" : "PENDING";

    const updatedDebt = await prisma.debt.update({
      where: { id: parentDebt.id },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newDebtStatus,
      },
      include: {
        party: true,
        installments: { orderBy: { installmentNumber: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment reverted successfully. Money has been refunded to your account balance.",
      installment: revertedInstallment,
      debt: updatedDebt,
    });
  } catch (error: any) {
    console.error("POST /api/debts/installments/revert error:", error);
    return NextResponse.json({ error: error.message || "Failed to revert payment" }, { status: 500 });
  }
}
