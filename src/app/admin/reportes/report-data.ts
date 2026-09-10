import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";

export type ReportRange = "hoy" | "semana" | "mes";

export const REPORT_RANGES: {
  key: ReportRange;
  label: string;
}[] = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Esta semana" },
  { key: "mes", label: "Este mes" },
];

export function parseRange(value: string | undefined): ReportRange {
  return value === "semana" || value === "mes" ? value : "hoy";
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getRangeBounds(range: ReportRange): { from: Date; to: Date } {
  const to = startOfToday();
  to.setDate(to.getDate() + 1);

  if (range === "hoy") return { from: startOfToday(), to };

  if (range === "semana") {
    const from = startOfToday();
    const day = from.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    from.setDate(from.getDate() - diffToMonday);
    return { from, to };
  }

  const from = startOfToday();
  from.setDate(1);
  return { from, to };
}

export interface SaleRow {
  id: number;
  orderNumber: number;
  createdAt: Date;
  paymentMethod: string | null;
  total: number;
  cogs: number;
}

export interface ReportData {
  range: ReportRange;
  from: Date;
  to: Date;
  sales: SaleRow[];
  totalSales: number;
  totalCogs: number;
  expensesTotal: number;
  netProfit: number;
  topProducts: {
    productId: number;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  cashDiscrepancies: {
    id: number;
    openedAt: Date;
    closedAt: Date;
    expectedAmount: number;
    actualAmount: number;
    difference: number;
  }[];
}

export async function buildReport(range: ReportRange): Promise<ReportData> {
  const { from, to } = getRangeBounds(range);
  const paidWhere = { status: "PAID", createdAt: { gte: from, lt: to } };

  const [orders, expenseAgg, discrepancies] = await Promise.all([
    prisma.order.findMany({
      where: paidWhere,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        paymentMethod: true,
        total: true,
        cogs: true,
      },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: from, lt: to } },
    }),
    prisma.cashRegister.findMany({
      where: {
        status: "CLOSED",
        closedAt: { gte: from, lt: to },
        NOT: { difference: 0 },
      },
      orderBy: { closedAt: "asc" },
    }),
  ]);

  const sales: SaleRow[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    total: order.total,
    cogs: order.cogs,
  }));

  const totalSales = round2(sales.reduce((sum, sale) => sum + sale.total, 0));
  const totalCogs = round2(
    sales.reduce((sum, sale) => sum + sale.cogs, 0),
  );
  const expensesTotal = round2(expenseAgg._sum.amount ?? 0);

  const soldItems = await prisma.orderItem.findMany({
    where: {
      order: { status: "PAID", createdAt: { gte: from, lt: to } },
    },
    select: { productId: true, quantity: true, price: true },
  });

  const productIds = [...new Set(soldItems.map((item) => item.productId))];
  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : [];
  const nameById = new Map(products.map((product) => [product.id, product.name]));

  const productAgg = new Map<number, { quantity: number; revenue: number }>();
  for (const item of soldItems) {
    const current = productAgg.get(item.productId) ?? {
      quantity: 0,
      revenue: 0,
    };
    current.quantity += item.quantity;
    current.revenue += item.price * item.quantity;
    productAgg.set(item.productId, current);
  }

  const topProducts = [...productAgg.entries()]
    .map(([productId, totals]) => ({
      productId,
      name: nameById.get(productId) ?? `Producto #${productId}`,
      quantity: round2(totals.quantity),
      revenue: round2(totals.revenue),
    }))
    .sort((a, b) => b.quantity - a.quantity);

  return {
    range,
    from,
    to,
    sales,
    totalSales,
    totalCogs,
    expensesTotal,
    netProfit: round2(totalSales - totalCogs - expensesTotal),
    topProducts,
    cashDiscrepancies: discrepancies.map((register) => ({
      id: register.id,
      openedAt: register.openedAt,
      closedAt: register.closedAt as Date,
      expectedAmount: register.expectedAmount ?? 0,
      actualAmount: register.actualAmount ?? 0,
      difference: register.difference ?? 0,
    })),
  };
}
