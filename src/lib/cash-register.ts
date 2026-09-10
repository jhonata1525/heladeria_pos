import { prisma } from "@/lib/prisma";
import type { ClosedRegisterDTO, OpenRegisterSummaryDTO } from "@/lib/types";
import { round2 } from "@/lib/format";

export async function getOpenRegisterSummary(): Promise<OpenRegisterSummaryDTO | null> {
  const register = await prisma.cashRegister.findFirst({
    where: { status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });

  if (!register) return null;

  const [paidOrders, expenses] = await Promise.all([
    prisma.order.findMany({
      where: { status: "PAID", createdAt: { gte: register.openedAt } },
      select: { paymentMethod: true, total: true },
    }),
    prisma.expense.findMany({
      where: { cashRegisterId: register.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let cashSales = 0;
  let digitalSales = 0;
  for (const order of paidOrders) {
    if (order.paymentMethod === "CASH") {
      cashSales += order.total;
    } else {
      digitalSales += order.total;
    }
  }

  const expensesTotal = round2(expenses.reduce((sum, e) => sum + e.amount, 0));

  return {
    id: register.id,
    openedAt: register.openedAt.toISOString(),
    initialAmount: register.initialAmount,
    cashSales: round2(cashSales),
    digitalSales: round2(digitalSales),
    expensesTotal,
    expectedCash: round2(register.initialAmount + cashSales - expensesTotal),
    expenses: expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export async function getClosedRegisters(limit = 6): Promise<ClosedRegisterDTO[]> {
  const registers = await prisma.cashRegister.findMany({
    where: { status: "CLOSED" },
    orderBy: { closedAt: "desc" },
    take: limit,
  });

  return registers.map((r) => ({
    id: r.id,
    openedAt: r.openedAt.toISOString(),
    closedAt: r.closedAt?.toISOString() ?? "",
    initialAmount: r.initialAmount,
    expectedAmount: r.expectedAmount,
    actualAmount: r.actualAmount,
    difference: r.difference,
    notes: r.notes,
  }));
}
