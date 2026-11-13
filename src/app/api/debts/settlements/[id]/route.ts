import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, paymentDate, paymentMethod, referenceNumber, notes } = body;

    const settlement = await prisma.debtSettlement.findUnique({
      where: { id },
      include: {
        debt: true,
        transaction: true,
      },
    });

    if (!settlement) {
      return NextResponse.json({ error: "Settlement record not found" }, { status: 404 });
    }

    const debt = settlement.debt;
    const prevAmount = settlement.amountPaid;
    const newAmount = amount !== undefined ? parseFloat(amount) : prevAmount;

    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const difference = newAmount - prevAmount; // positive means paying more, negative means paying less

    if (difference > 0 && difference > debt.remainingAmount) {
      return NextResponse.json(
        { error: `Payment increase (₹${difference}) exceeds remaining balance of ₹${debt.remainingAmount}` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const newRemaining = Math.max(0, debt.remainingAmount - difference);
      const newPaid = Math.max(0, debt.originalAmount - newRemaining);
      let newStatus = debt.status;
      if (newRemaining === 0) {
        newStatus = "SETTLED";
      } else if (newRemaining === debt.originalAmount) {
        newStatus = "PENDING";
      } else {
        newStatus = "PARTIALLY_PAID";
      }

      // 1. Update Debt
      await tx.debt.update({
        where: { id: debt.id },
        data: {
          remainingAmount: newRemaining,
          paidAmount: newPaid,
          status: newStatus,
        },
      });

      // 2. Adjust Account Balance
      if (difference !== 0 && settlement.transaction) {
        if (debt.type === "BORROWED") {
          // If paying more -> balance decrements more
          // If paying less -> balance refunded (increments)
          await tx.account.update({
            where: { id: settlement.transaction.accountId },
            data: { currentBalance: { decrement: difference } },
          });
        } else {
          // LENT settlement
          await tx.account.update({
            where: { id: settlement.transaction.accountId },
            data: { currentBalance: { increment: difference } },
          });
        }
      }

      // 3. Update Transaction
      if (settlement.transactionId) {
        await tx.transaction.update({
          where: { id: settlement.transactionId },
          data: {
            amount: newAmount,
            transactionDate: paymentDate ? new Date(paymentDate) : settlement.transaction.transactionDate,
            paymentMethod: paymentMethod || settlement.transaction.paymentMethod,
            referenceNumber: referenceNumber !== undefined ? referenceNumber : settlement.transaction.referenceNumber,
            notes: notes !== undefined ? notes : settlement.transaction.notes,
          },
        });
      }

      // 4. Update DebtSettlement
      const updatedSettlement = await tx.debtSettlement.update({
        where: { id },
        data: {
          amountPaid: newAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : settlement.paymentDate,
          paymentMethod: paymentMethod || settlement.paymentMethod,
          referenceNumber: referenceNumber !== undefined ? referenceNumber : settlement.referenceNumber,
          notes: notes !== undefined ? notes : settlement.notes,
        },
        include: {
          debt: { include: { party: true } },
          transaction: { include: { account: true } },
        },
      });

      return updatedSettlement;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Update settlement error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update settlement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const settlement = await prisma.debtSettlement.findUnique({
      where: { id },
      include: {
        debt: true,
        transaction: true,
      },
    });

    if (!settlement) {
      return NextResponse.json({ error: "Settlement record not found" }, { status: 404 });
    }

    const debt = settlement.debt;
    const amountToRevert = settlement.amountPaid;

    await prisma.$transaction(async (tx) => {
      // 1. Recalculate remaining on debt
      const newRemaining = Math.min(debt.originalAmount, debt.remainingAmount + amountToRevert);
      const newPaid = Math.max(0, debt.originalAmount - newRemaining);
      const newStatus = newRemaining === debt.originalAmount ? "PENDING" : "PARTIALLY_PAID";

      await tx.debt.update({
        where: { id: debt.id },
        data: {
          remainingAmount: newRemaining,
          paidAmount: newPaid,
          status: newStatus,
        },
      });

      // 2. Refund account balance
      if (settlement.transaction) {
        if (debt.type === "BORROWED") {
          // Revert payment made -> refund account
          await tx.account.update({
            where: { id: settlement.transaction.accountId },
            data: { currentBalance: { increment: amountToRevert } },
          });
        } else {
          // Revert collection received -> decrement account
          await tx.account.update({
            where: { id: settlement.transaction.accountId },
            data: { currentBalance: { decrement: amountToRevert } },
          });
        }

        // 3. Delete linked Transaction
        await tx.transaction.delete({
          where: { id: settlement.transactionId },
        });
      }

      // 4. Delete DebtSettlement record
      await tx.debtSettlement.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete settlement error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete settlement record" },
      { status: 500 }
    );
  }
}

