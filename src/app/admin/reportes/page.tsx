import { formatMoney } from "@/lib/format";
import {
  REPORT_RANGES,
  buildReport,
  parseRange,
} from "./report-data";

export const metadata = { title: "Reportes · Heladería POS" };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const params = await searchParams;
  const report = await buildReport(parseRange(params.rango));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            📊 Reportes y Utilidad
          </h1>
          <p className="text-sm text-slate-500">
            Ventas, costos de insumos, gastos de caja chica y descuadres.
          </p>
        </div>
        <a
          href={`/admin/reportes/export?rango=${report.range}`}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-emerald-700"
        >
          ⬇ Exportar a Excel / CSV
        </a>
      </header>

      <div className="flex flex-wrap gap-2">
        {REPORT_RANGES.map((range) => (
          <a
            key={range.key}
            href={`?rango=${range.key}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              range.key === report.range
                ? "bg-pink-500 text-white shadow"
                : "bg-white text-slate-600 shadow-sm hover:bg-pink-50"
            }`}
          >
            {range.label}
          </a>
        ))}
        <span className="ml-auto self-center text-xs font-semibold text-slate-400">
          {formatDate(report.from)} → {formatDate(report.to)}
        </span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de ventas" value={formatMoney(report.totalSales)} />
        <StatCard
          label="Costo de insumos (COGS)"
          value={formatMoney(report.totalCogs)}
        />
        <StatCard
          label="Gastos de caja chica"
          value={formatMoney(report.expensesTotal)}
        />
        <StatCard
          label="Utilidad neta real"
          value={formatMoney(report.netProfit)}
          accent="border-emerald-200 bg-emerald-50"
        />
      </section>

      <p className="text-xs text-slate-400">
        Utilidad neta = Ventas ({report.sales.length} pedidos pagados) − Costo
        de insumos − Gastos de caja chica.
      </p>

      <section className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
        <h2 className="border-b border-pink-50 px-5 py-4 text-base font-extrabold text-slate-800">
          🏆 Productos más vendidos
        </h2>
        {report.topProducts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">
            Sin ventas registradas en este periodo.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pink-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-bold">#</th>
                <th className="px-5 py-2.5 font-bold">Producto</th>
                <th className="px-5 py-2.5 text-right font-bold">Vendidos</th>
                <th className="px-5 py-2.5 text-right font-bold">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {report.topProducts.slice(0, 10).map((product, index) => (
                <tr key={product.productId}>
                  <td className="px-5 py-2.5 font-extrabold text-slate-300">
                    {index + 1}
                  </td>
                  <td className="px-5 py-2.5 font-bold text-slate-700">
                    {index === 0 ? "🥇 " : ""}
                    {product.name}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-600">
                    {product.quantity}
                  </td>
                  <td className="px-5 py-2.5 text-right font-extrabold text-pink-600">
                    {formatMoney(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
        <h2 className="border-b border-pink-50 px-5 py-4 text-base font-extrabold text-slate-800">
          🔍 Descuadres de caja
        </h2>
        {report.cashDiscrepancies.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">
            Sin descuadres en este periodo. ¡Cajas cuadradas! ✅
          </p>
        ) : (
          <ul className="divide-y divide-pink-50">
            {report.cashDiscrepancies.map((register) => (
              <li
                key={register.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    Turno #{register.id}
                  </p>
                  <p className="text-xs text-slate-400">
                    Cerrado: {formatDate(register.closedAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    register.difference > 0
                      ? "bg-sky-50 text-sky-600"
                      : "bg-rose-50 text-rose-500"
                  }`}
                >
                  {register.difference > 0 ? "Sobrante" : "Faltante"} de{" "}
                  {formatMoney(Math.abs(register.difference))} (esperado{" "}
                  {formatMoney(register.expectedAmount)})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${accent ?? "border-pink-100 bg-white"}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold text-slate-800">{value}</p>
    </div>
  );
}
