import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
        toAccount: true,
        category: true,
        party: true,
        debt: {
          include: { party: true },
        },
        debtSettlement: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error("Get transaction error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch transaction details" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { accountId, categoryId, amount, transactionDate, notes, paymentMethod } = body;

    const oldTx = await prisma.transaction.findUnique({ where: { id } });
    if (!oldTx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const newAmount = amount !== undefined ? parseFloat(amount) : oldTx.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a valid positive number" }, { status: 400 });
    }

    const targetAccountId = accountId || oldTx.accountId;

    const updated = await prisma.$transaction(async (tx) => {
      // If amount or account changed, adjust balances
      if (newAmount !== oldTx.amount || targetAccountId !== oldTx.accountId) {
        let isOutflow = oldTx.type === "EXPENSE" || oldTx.type === "LEND";
        let isInflow = oldTx.type === "INCOME" || oldTx.type === "BORROW";

        if (oldTx.type === "SETTLEMENT" && oldTx.debtId) {
          const debt = await tx.debt.findUnique({ where: { id: oldTx.debtId } });
          if (debt) {
            // LENT settlement = inflow (+ to account); BORROWED settlement = repayment outflow (- from account)
            isInflow = debt.type === "LENT";
            isOutflow = debt.type === "BORROWED";

            // If amount changed on a settlement transaction, update debt remaining balance and settlement
            if (newAmount !== oldTx.amount) {
              const delta = newAmount - oldTx.amount;
              const newRemaining = debt.remainingAmount - delta;
              if (newRemaining < 0) {
                throw new Error(`OVERPAYMENT:Updated payment (₹${newAmount}) exceeds remaining balance of ₹${debt.remainingAmount + oldTx.amount}`);
              }
              await tx.debt.update({
                where: { id: debt.id },
                data: {
                  remainingAmount: newRemaining,
                  status: newRemaining === 0 ? "SETTLED" : "PARTIALLY_PAID",
                },
              });
              await tx.debtSettlement.updateMany({
                where: { transactionId: id },
                data: { amountPaid: newAmount },
              });
            }
          }
        }

        // 1. Revert old balance
        if (isInflow) {
          await tx.account.update({
            where: { id: oldTx.accountId },
            data: { currentBalance: { decrement: oldTx.amount } },
          });
        } else if (isOutflow) {
          await tx.account.update({
            where: { id: oldTx.accountId },
            data: { currentBalance: { increment: oldTx.amount } },
          });
        }

        // 2. Apply new balance
        if (isInflow) {
          await tx.account.update({
            where: { id: targetAccountId },
            data: { currentBalance: { increment: newAmount } },
          });
        } else if (isOutflow) {
          await tx.account.update({
            where: { id: targetAccountId },
            data: { currentBalance: { decrement: newAmount } },
          });
        }
      }

      // Update the transaction record
      const result = await tx.transaction.update({
        where: { id },
        data: {
          accountId: targetAccountId,
          categoryId: categoryId !== undefined ? categoryId : oldTx.categoryId,
          amount: newAmount,
          transactionDate: transactionDate ? new Date(transactionDate) : oldTx.transactionDate,
          notes: notes !== undefined ? notes : oldTx.notes,
          paymentMethod: paymentMethod !== undefined ? paymentMethod : oldTx.paymentMethod,
        },
        include: {
          account: true,
          category: true,
          party: true,
        },
      });

      return result;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update transaction error:", error);
    const msg = error.message || "";
    if (msg.startsWith("OVERPAYMENT:")) {
      return NextResponse.json({ error: msg.replace("OVERPAYMENT:", "") }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Revert account balance impact
      const { type, amount, accountId, toAccountId, debtId } = transaction;

      if (type === "INCOME" || type === "BORROW") {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: amount } },
        });
      } else if (type === "EXPENSE" || type === "LEND") {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: amount } },
        });
      } else if (type === "TRANSFER" && toAccountId) {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: amount } },
        });
        await tx.account.update({
          where: { id: toAccountId },
          data: { currentBalance: { decrement: amount } },
        });
      } else if (type === "SETTLEMENT" && debtId) {
        // Revert settlement
        const debt = await tx.debt.findUnique({ where: { id: debtId } });
        if (debt) {
          if (debt.type === "LENT") {
            // Revert inflow
            await tx.account.update({
              where: { id: accountId },
              data: { currentBalance: { decrement: amount } },
            });
          } else {
            // Revert outflow
            await tx.account.update({
              where: { id: accountId },
              data: { currentBalance: { increment: amount } },
            });
          }

          const newRemaining = debt.remainingAmount + amount;
          await tx.debt.update({
            where: { id: debtId },
            data: {
              remainingAmount: newRemaining,
              status: newRemaining >= debt.originalAmount ? "PENDING" : "PARTIALLY_PAID",
            },
          });
        }
      }

      // If this transaction created a debt, verify no active settlements before deleting
      if (debtId && (type === "LEND" || type === "BORROW")) {
        const settlements = await tx.debtSettlement.findMany({ where: { debtId } });
        if (settlements.length > 0) {
          throw new Error("CANNOT_DELETE_WITH_SETTLEMENTS:Cannot delete transaction with existing debt settlements. Please delete partial settlements first.");
        }
        await tx.debt.delete({ where: { id: debtId } });
      }

      await tx.transaction.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete transaction error:", error);
    const msg = error.message || "";
    if (msg.startsWith("CANNOT_DELETE_WITH_SETTLEMENTS:")) {
      return NextResponse.json({ error: msg.replace("CANNOT_DELETE_WITH_SETTLEMENTS:", "") }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to delete transaction" }, { status: 500 });
  }
}
