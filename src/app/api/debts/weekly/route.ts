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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    // 1. Fetch all weekly loans for the user
    const weeklyLoans = await prisma.debt.findMany({
      where: {
        userId: user.id,
        type: "BORROWED",
        frequency: "WEEKLY",
      },
      include: {
        party: true,
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
        settlements: {
          include: { transaction: { include: { account: true } } },
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Start and end of current week (Sunday to Saturday)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    // 2. Aggregate installments across all multiple lenders/people
    const allInstallments: any[] = [];
    const thisWeekInstallments: any[] = [];
    const paidInstallments: any[] = [];
    let totalDueThisWeek = 0;
    let totalWeeklyRemaining = 0;
    let totalWeeklyPaid = 0;

    weeklyLoans.forEach((loan) => {
      const remaining = loan.remainingAmount;
      const paid = loan.paidAmount || (loan.originalAmount - remaining);
      totalWeeklyRemaining += remaining;
      totalWeeklyPaid += paid;

      loan.installments.forEach((inst) => {
        const due = new Date(inst.dueDate);
        due.setHours(0, 0, 0, 0);

        const isPaid = inst.status === "PAID" || inst.status === "SETTLED";
        const isUnpaid = !isPaid;

        // Calculate timing differences
        let wasPaidLate = false;
        let daysLate = 0;
        let isMissed = false;
        let daysMissed = 0;

        if (isPaid && inst.paidDate) {
          const paidD = new Date(inst.paidDate);
          paidD.setHours(0, 0, 0, 0);
          const diffDays = Math.round((paidD.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            wasPaidLate = true;
            daysLate = diffDays;
          }
        } else if (isUnpaid) {
          const diffDays = Math.round((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            isMissed = true;
            daysMissed = diffDays;
          }
        }

        const isPastDue = isUnpaid && isMissed;
        const isDueThisWeek = due >= startOfWeek && due <= endOfWeek;

        const enhancedInst = {
          ...inst,
          lenderName: loan.party?.name || "Financier",
          loanTitle: loan.title || `${loan.party?.name} Weekly Loan`,
          debtOriginalAmount: loan.originalAmount,
          debtRemainingAmount: loan.remainingAmount,
          debtPaidAmount: loan.paidAmount,
          disbursedAmount: loan.disbursedAmount,
          installmentDay: loan.installmentDay,
          isPaid,
          isPastDue,
          isDueThisWeek,
          isMissed,
          daysMissed,
          wasPaidLate,
          daysLate,
        };

        allInstallments.push(enhancedInst);

        if (isPaid) {
          paidInstallments.push(enhancedInst);
        }

        // Include in "Due This Week" if unpaid and falling in current week OR past overdue
        if (isUnpaid && (isDueThisWeek || isPastDue)) {
          thisWeekInstallments.push(enhancedInst);
          totalDueThisWeek += inst.amount;
        }
      });
    });

    // Sort this week installments: overdue first, then by dueDate asc
    thisWeekInstallments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Sort paid installments: latest paidDate first
    paidInstallments.sort((a, b) => {
      const timeA = a.paidDate ? new Date(a.paidDate).getTime() : 0;
      const timeB = b.paidDate ? new Date(b.paidDate).getTime() : 0;
      return timeB - timeA;
    });

    // Filter by search query if present
    let filteredLoans = weeklyLoans;
    if (search.trim()) {
      const q = search.toLowerCase();
      filteredLoans = weeklyLoans.filter(
        (l) =>
          l.party?.name.toLowerCase().includes(q) ||
          l.title?.toLowerCase().includes(q) ||
          l.notes?.toLowerCase().includes(q)
      );
    }

    if (status !== "all") {
      filteredLoans = filteredLoans.filter((l) => l.status === status);
    }

    return NextResponse.json({
      weeklyLoans: filteredLoans,
      thisWeekInstallments,
      paidInstallments,
      allInstallments,
      totalDueThisWeek,
      totalWeeklyRemaining,
      totalWeeklyPaid,
      activeLendersCount: new Set(weeklyLoans.filter((l) => l.status !== "SETTLED").map((l) => l.partyId)).size,
      totalLoansCount: weeklyLoans.length,
    });
  } catch (error: any) {
    console.error("GET /api/debts/weekly error:", error);
    return NextResponse.json({ error: error.message || "Failed to load weekly payments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureInitialData();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      partyName,
      disbursedAmount,
      originalAmount,
      installmentAmount,
      totalInstallments: inputInstallments,
      firstDueDate,
      depositToAccountId,
      notes,
      paymentMethod = "UPI",
    } = body;

    if (!partyName || !partyName.trim()) {
      return NextResponse.json({ error: "Lender / Person Name is required" }, { status: 400 });
    }

    const totalToPay = parseFloat(originalAmount);
    if (isNaN(totalToPay) || totalToPay <= 0) {
      return NextResponse.json({ error: "Total repayment amount must be greater than 0" }, { status: 400 });
    }

    const perWeekAmount = parseFloat(installmentAmount);
    if (isNaN(perWeekAmount) || perWeekAmount <= 0) {
      return NextResponse.json({ error: "Weekly installment amount must be greater than 0" }, { status: 400 });
    }

    // Calculate number of installments
    let numWeeks = inputInstallments ? parseInt(inputInstallments, 10) : Math.ceil(totalToPay / perWeekAmount);
    if (isNaN(numWeeks) || numWeeks <= 0) {
      numWeeks = Math.ceil(totalToPay / perWeekAmount);
    }

    // Determine start due date
    const startDate = firstDueDate ? new Date(firstDueDate) : new Date();
    startDate.setHours(12, 0, 0, 0); // normalize time

    // Determine Day of week (e.g. "Monday")
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = dayNames[startDate.getDay()];

    const givenAmount = disbursedAmount ? parseFloat(disbursedAmount) : null;

    // 1. Find or create Party
    let party = await prisma.party.findFirst({
      where: { userId: user.id, name: partyName.trim() },
    });
    if (!party) {
      party = await prisma.party.create({
        data: {
          userId: user.id,
          name: partyName.trim(),
        },
      });
    }

    // 2. Create parent Debt record
    const title = `${party.name} Weekly Finance (₹${givenAmount ? givenAmount.toLocaleString("en-IN") : ""} -> ₹${totalToPay.toLocaleString("en-IN")})`;

    const debt = await prisma.debt.create({
      data: {
        userId: user.id,
        partyId: party.id,
        title,
        type: "BORROWED",
        frequency: "WEEKLY",
        originalAmount: totalToPay,
        remainingAmount: totalToPay,
        paidAmount: 0.0,
        disbursedAmount: givenAmount,
        installmentAmount: perWeekAmount,
        totalInstallments: numWeeks,
        installmentDay: dayOfWeek,
        dueDate: startDate,
        status: "PENDING",
        paymentMethod,
        isRecurring: true,
        notes: notes || `Disbursed: ₹${givenAmount || "N/A"}, Weekly Installment: ₹${perWeekAmount} every ${dayOfWeek} for ${numWeeks} weeks.`,
      },
    });

    // 3. Optional: If user requested to deposit disbursed amount into an account
    if (depositToAccountId && givenAmount && givenAmount > 0) {
      const account = await prisma.account.findUnique({
        where: { id: depositToAccountId },
      });

      if (account) {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            accountId: account.id,
            debtId: debt.id,
            partyId: party.id,
            type: "BORROW",
            amount: givenAmount,
            paymentMethod,
            transactionDate: new Date(),
            notes: `Received loan disbursement from ${party.name} (${title})`,
          },
        });

        await prisma.account.update({
          where: { id: account.id },
          data: {
            currentBalance: { increment: givenAmount },
          },
        });
      }
    }

    // 4. Automatically generate all weekly Installment records (e.g. 12 weeks every 7 days)
    const installmentData = [];
    let remainingToAllocate = totalToPay;

    for (let i = 1; i <= numWeeks; i++) {
      const weekDueDate = new Date(startDate);
      weekDueDate.setDate(startDate.getDate() + (i - 1) * 7);

      // Amount for this installment: perWeekAmount, or remainder on last installment
      const thisInstAmount = i === numWeeks && remainingToAllocate < perWeekAmount * 2
        ? remainingToAllocate
        : Math.min(perWeekAmount, remainingToAllocate);

      remainingToAllocate -= thisInstAmount;

      installmentData.push({
        debtId: debt.id,
        installmentNumber: i,
        totalInstallments: numWeeks,
        dueDate: weekDueDate,
        amount: thisInstAmount,
        paidAmount: 0.0,
        status: "PENDING",
        paymentMethod,
        notes: `Week ${i} of ${numWeeks} (${dayOfWeek})`,
      });
    }

    // Insert installments
    for (const inst of installmentData) {
      await prisma.installment.create({ data: inst });
    }

    const completeLoan = await prisma.debt.findUnique({
      where: { id: debt.id },
      include: {
        party: true,
        installments: { orderBy: { installmentNumber: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      loan: completeLoan,
    });
  } catch (error: any) {
    console.error("POST /api/debts/weekly error:", error);
    return NextResponse.json({ error: error.message || "Failed to create weekly payment" }, { status: 500 });
  }
}
