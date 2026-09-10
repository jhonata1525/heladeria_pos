import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { buildReport, parseRange, REPORT_RANGES } from "../report-data";

const dateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
});

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[";\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function money(value: number): string {
  return formatMoney(value).replace(/\u00a0/g, " ");
}

function row(cells: (string | number)[]): string {
  return cells.map(csvCell).join(";");
}

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("No autorizado", { status: 403 });
  }

  const url = new URL(request.url);
  const report = await buildReport(
    parseRange(url.searchParams.get("rango") ?? undefined),
  );
  const rangeLabel =
    REPORT_RANGES.find((range) => range.key === report.range)?.label ??
    report.range;

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: report.from, lt: report.to } },
    orderBy: { createdAt: "asc" },
    select: { description: true, category: true, amount: true },
  });

  const lines: string[] = [];
  lines.push("sep=;");
  lines.push(`Heladeria POS - Reporte (${rangeLabel})`);
  lines.push(row(["Periodo", dateTime.format(report.from), "al", dateTime.format(report.to)]));
  lines.push("");
  lines.push("VENTAS");
  lines.push(row(["Pedido", "Fecha", "Metodo de pago", "Total", "Costo insumos (COGS)", "Utilidad"]));
  for (const sale of report.sales) {
    lines.push(
      row([
        sale.orderNumber,
        dateTime.format(sale.createdAt),
        sale.paymentMethod ?? "",
        money(sale.total),
        money(sale.cogs),
        money(Math.round((sale.total - sale.cogs) * 100) / 100),
      ]),
    );
  }
  lines.push(row(["TOTAL VENTAS", "", "", money(report.totalSales), money(report.totalCogs), ""]));
  lines.push("");
  lines.push("RESUMEN");
  lines.push(row(["Total de ventas", money(report.totalSales)]));
  lines.push(row(["Costo de insumos", money(report.totalCogs)]));
  lines.push(row(["Gastos de caja chica", money(report.expensesTotal)]));
  lines.push(row(["Utilidad neta real", money(report.netProfit)]));
  lines.push("");
  lines.push("PRODUCTOS MAS VENDIDOS");
  lines.push(row(["Producto", "Cantidad vendida", "Ingresos"]));
  for (const product of report.topProducts) {
    lines.push(row([product.name, product.quantity, money(product.revenue)]));
  }
  lines.push("");
  lines.push("GASTOS DE CAJA CHICA");
  lines.push(row(["Descripcion", "Categoria", "Monto"]));
  for (const expense of expenses) {
    lines.push(row([expense.description, expense.category, money(expense.amount)]));
  }
  lines.push("");
  lines.push("CIERRES DE CAJA CON DESCUADRE");
  lines.push(row(["Turno", "Abierto", "Cerrado", "Esperado", "Contado", "Diferencia"]));
  for (const register of report.cashDiscrepancies) {
    lines.push(
      row([
        register.id,
        dateTime.format(register.openedAt),
        dateTime.format(register.closedAt),
        money(register.expectedAmount),
        money(register.actualAmount),
        money(register.difference),
      ]),
    );
  }

  const body = "\uFEFF" + lines.join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${report.range}-${today}.csv"`,
    },
  });
}
