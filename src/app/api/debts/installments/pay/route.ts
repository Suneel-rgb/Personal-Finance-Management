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
    const {
      installmentId,
      amountPaid,
      accountId,
      paymentDate,
      paymentMethod = "UPI",
      referenceNumber,
      notes,
    } = body;

    if (!installmentId) {
      return NextResponse.json({ error: "Installment ID is required" }, { status: 400 });
    }

    // 1. Fetch installment with parent debt
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        debt: {
          include: { party: true, installments: true },
        },
      },
    });

    if (!installment) {
      return NextResponse.json({ error: "Installment not found" }, { status: 404 });
    }

    const payingAmount = amountPaid ? parseFloat(amountPaid) : installment.amount;
    if (isNaN(payingAmount) || payingAmount <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    // 2. Resolve account (fallback to user's first active account if not specified)
    let account = null;
    if (accountId) {
      account = await prisma.account.findUnique({ where: { id: accountId } });
    }
    if (!account) {
      account = await prisma.account.findFirst({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!account) {
      account = await prisma.account.create({
        data: {
          userId: user.id,
          name: "Cash in Hand",
          type: "CASH",
          initialBalance: 0,
          currentBalance: 0,
        },
      });
    }

    const txDate = paymentDate ? new Date(paymentDate) : new Date();

    // 3. Create actual payment Transaction
    const transactionTitle = `Weekly Installment ${installment.installmentNumber} of ${installment.totalInstallments} to ${installment.debt.party.name}`;
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        debtId: installment.debtId,
        partyId: installment.debt.partyId,
        type: "PAYABLE_PAID",
        amount: payingAmount,
        paymentMethod: paymentMethod || installment.paymentMethod || "UPI",
        transactionDate: txDate,
        title: transactionTitle,
        referenceNumber: referenceNumber || undefined,
        notes: notes || `Paid installment for week ${installment.installmentNumber} (${installment.debt.installmentDay || "Weekly"})`,
      },
    });

    // 4. Create DebtSettlement link
    await prisma.debtSettlement.create({
      data: {
        debtId: installment.debtId,
        transactionId: transaction.id,
        amountPaid: payingAmount,
        paymentDate: txDate,
        paymentMethod: paymentMethod || "UPI",
        referenceNumber: referenceNumber || undefined,
        notes: notes || `Installment #${installment.installmentNumber}`,
      },
    });

    // 5. Deduct actual paid amount from account
    await prisma.account.update({
      where: { id: account.id },
      data: {
        currentBalance: { decrement: payingAmount },
      },
    });

    // 6. Update Installment status
    const isFullInstallmentPaid = payingAmount >= installment.amount;
    const updatedInstallment = await prisma.installment.update({
      where: { id: installment.id },
      data: {
        status: isFullInstallmentPaid ? "PAID" : "PARTIALLY_PAID",
        paidAmount: { increment: payingAmount },
        paidDate: txDate,
        paymentMethod: paymentMethod || "UPI",
        transactionId: transaction.id,
        notes: notes || installment.notes,
      },
    });

    // 7. Update Parent Debt remaining and status
    const parentDebt = installment.debt;
    const newRemaining = Math.max(0, parentDebt.remainingAmount - payingAmount);
    const newPaidAmount = parentDebt.paidAmount + payingAmount;

    // Check if all installments are now paid
    const remainingUnpaidInstallments = await prisma.installment.count({
      where: {
        debtId: parentDebt.id,
        id: { not: installment.id },
        status: { notIn: ["PAID", "SETTLED"] },
      },
    });

    const isAllSettled = (isFullInstallmentPaid && remainingUnpaidInstallments === 0) || newRemaining <= 0;

    const updatedDebt = await prisma.debt.update({
      where: { id: parentDebt.id },
      data: {
        remainingAmount: newRemaining,
        paidAmount: newPaidAmount,
        status: isAllSettled ? "SETTLED" : "PARTIALLY_PAID",
      },
      include: {
        party: true,
        installments: { orderBy: { installmentNumber: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      installment: updatedInstallment,
      debt: updatedDebt,
      transaction,
    });
  } catch (error: any) {
    console.error("POST /api/debts/installments/pay error:", error);
    return NextResponse.json({ error: error.message || "Failed to mark installment as paid" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      installmentId,
      newAmountPaid,
      newAccountId,
      newPaymentDate,
      newPaymentMethod,
      newNotes,
    } = body;

    if (!installmentId) {
      return NextResponse.json({ error: "Installment ID is required" }, { status: 400 });
    }

    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        debt: { include: { installments: true } },
        transaction: { include: { account: true } },
      },
    });

    if (!installment) {
      return NextResponse.json({ error: "Installment not found" }, { status: 404 });
    }

    const updatedAmount = newAmountPaid !== undefined ? parseFloat(newAmountPaid) : installment.paidAmount;
    if (isNaN(updatedAmount) || updatedAmount <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    const oldAmount = installment.paidAmount || (installment.transaction?.amount || installment.amount);
    const amountDifference = updatedAmount - oldAmount;
    const parentDebt = installment.debt;

    const updatedTxDate = newPaymentDate ? new Date(newPaymentDate) : (installment.paidDate || new Date());
    const targetAccountId = newAccountId || installment.transaction?.accountId;

    // 1. Reconcile Account Balances
    if (installment.transaction) {
      const oldAccountId = installment.transaction.accountId;

      if (targetAccountId && targetAccountId !== oldAccountId) {
        // Account changed: Refund old account, deduct from new account
        await prisma.account.update({
          where: { id: oldAccountId },
          data: { currentBalance: { increment: oldAmount } },
        });

        await prisma.account.update({
          where: { id: targetAccountId },
          data: { currentBalance: { decrement: updatedAmount } },
        });
      } else if (targetAccountId) {
        // Same account: Adjust difference
        // If updatedAmount is higher, deduct difference. If lower, refund difference.
        await prisma.account.update({
          where: { id: targetAccountId },
          data: { currentBalance: { decrement: amountDifference } },
        });
      }

      // Update Transaction
      await prisma.transaction.update({
        where: { id: installment.transaction.id },
        data: {
          amount: updatedAmount,
          accountId: targetAccountId || oldAccountId,
          transactionDate: updatedTxDate,
          paymentMethod: newPaymentMethod || installment.paymentMethod || "UPI",
          notes: newNotes !== undefined ? newNotes : installment.notes,
        },
      });

      // Update DebtSettlement
      await prisma.debtSettlement.updateMany({
        where: { transactionId: installment.transaction.id },
        data: {
          amountPaid: updatedAmount,
          paymentDate: updatedTxDate,
          paymentMethod: newPaymentMethod || installment.paymentMethod || "UPI",
          notes: newNotes !== undefined ? newNotes : installment.notes,
        },
      });
    }

    // 2. Update Installment
    const isFullInstallmentPaid = updatedAmount >= installment.amount;
    const updatedInstallment = await prisma.installment.update({
      where: { id: installment.id },
      data: {
        paidAmount: updatedAmount,
        status: isFullInstallmentPaid ? "PAID" : "PARTIALLY_PAID",
        paidDate: updatedTxDate,
        paymentMethod: newPaymentMethod || installment.paymentMethod || "UPI",
        notes: newNotes !== undefined ? newNotes : installment.notes,
      },
    });

    // 3. Update Parent Debt
    const newDebtPaid = parentDebt.paidAmount + amountDifference;
    const newDebtRemaining = Math.max(0, parentDebt.remainingAmount - amountDifference);

    const isAllSettled = newDebtRemaining <= 0;

    const updatedDebt = await prisma.debt.update({
      where: { id: parentDebt.id },
      data: {
        paidAmount: newDebtPaid,
        remainingAmount: newDebtRemaining,
        status: isAllSettled ? "SETTLED" : "PARTIALLY_PAID",
      },
      include: {
        party: true,
        installments: { orderBy: { installmentNumber: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Installment payment updated successfully",
      installment: updatedInstallment,
      debt: updatedDebt,
    });
  } catch (error: any) {
    console.error("PUT /api/debts/installments/pay error:", error);
    return NextResponse.json({ error: error.message || "Failed to update payment" }, { status: 500 });
  }
}
