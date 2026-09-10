"use client";

import { useActionState, useState } from "react";
import { formatMoney } from "@/lib/format";
import type {
  ClosedRegisterDTO,
  OpenRegisterSummaryDTO,
} from "@/lib/types";
import {
  addExpense,
  closeRegister,
  openRegister,
  type CajaActionState,
} from "./actions";

const EXPENSE_CATEGORIES = [
  "Hielo",
  "Insumos",
  "Bolsas y empaques",
  "Servicios",
  "Transporte",
  "Otro",
];

function Feedback({ state }: { state: CajaActionState | null }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-600">
        {state.message}
      </p>
    );
  }
  return null;
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
      className={`rounded-2xl border p-4 shadow-sm ${
        accent ?? "border-pink-100 bg-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-slate-800">{value}</p>
    </div>
  );
}

export function CajaClient({
  summary,
  closedRegisters,
}: {
  summary: OpenRegisterSummaryDTO | null;
  closedRegisters: ClosedRegisterDTO[];
}) {
  const [openState, openAction, openPending] = useActionState(openRegister, null);
  const [expenseState, expenseAction, expensePending] = useActionState(
    addExpense,
    null,
  );
  const [closeState, closeAction, closePending] = useActionState(
    closeRegister,
    null,
  );
  const [countedCash, setCountedCash] = useState("");

  const counted = Number(countedCash.replace(",", "."));
  const hasCounted =
    summary !== null && countedCash.trim().length > 0 && Number.isFinite(counted);
  const liveDifference = hasCounted && summary ? counted - summary.expectedCash : null;

  const diffBadge =
    liveDifference === null
      ? null
      : liveDifference === 0
        ? { text: "✅ Caja cuadrada", cls: "bg-emerald-50 text-emerald-600" }
        : liveDifference > 0
          ? {
              text: `🔺 Sobrante de ${formatMoney(liveDifference)}`,
              cls: "bg-sky-50 text-sky-600",
            }
          : {
              text: `🔻 Faltante de ${formatMoney(-liveDifference)}`,
              cls: "bg-rose-50 text-rose-600",
            };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-800">
          💵 Arqueo y Caja Chica
        </h1>
        <p className="text-sm text-slate-500">
          Control estricto del efectivo: apertura, gastos y cierre con
          verificación de descuadre.
        </p>
      </header>

      <Feedback state={closeState} />

      {!summary ? (
        <section className="rounded-3xl border border-pink-100 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-extrabold text-slate-800">🔓 Abrir turno</h2>
          <p className="mt-1 mb-5 text-sm text-slate-500">
            Registra el efectivo con el que inicias el día en caja.
          </p>
          <form action={openAction} className="space-y-3">
            <label className="block text-sm font-semibold text-slate-600">
              Monto inicial en caja
              <input
                type="number"
                name="initialAmount"
                inputMode="decimal"
                min={0}
                step="any"
                required
                placeholder="Ej: 100000"
                className="mt-1 w-full rounded-xl border border-pink-100 bg-rose-50/50 px-4 py-3 text-2xl font-extrabold outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
              />
            </label>
            <Feedback state={openState} />
            <button
              type="submit"
              disabled={openPending}
              className="w-full rounded-2xl bg-emerald-500 py-3.5 text-base font-extrabold text-white shadow-lg shadow-emerald-100 transition enabled:hover:bg-emerald-600 disabled:opacity-40"
            >
              {openPending ? "Abriendo…" : "Abrir turno"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section>
            <h2 className="mb-3 flex items-center justify-between text-lg font-extrabold text-slate-800">
              📊 Turno actual
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-600">
                Abierto
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Base inicial" value={formatMoney(summary.initialAmount)} />
              <StatCard label="Ventas efectivo" value={formatMoney(summary.cashSales)} />
              <StatCard label="Ventas digitales" value={formatMoney(summary.digitalSales)} />
              <StatCard
                label="Gastos caja chica"
                value={`−${formatMoney(summary.expensesTotal)}`}
                accent="border-rose-100 bg-rose-50"
              />
              <StatCard
                label="Efectivo esperado"
                value={formatMoney(summary.expectedCash)}
                accent="border-emerald-200 bg-emerald-50"
              />
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-base font-extrabold text-slate-800">
                🛒 Gasto rápido de caja chica
              </h3>
              <form action={expenseAction} className="space-y-3">
                <input
                  type="text"
                  name="description"
                  required
                  maxLength={120}
                  placeholder="Descripción (ej: pago de hielo)"
                  className="w-full rounded-xl border border-pink-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                />
                <div className="flex gap-2">
                  <select
                    name="category"
                    defaultValue="Hielo"
                    className="w-40 rounded-xl border border-pink-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-300"
                  >
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    name="amount"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    required
                    placeholder="$ Monto"
                    className="flex-1 rounded-xl border border-pink-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                  />
                </div>
                <Feedback state={expenseState} />
                <button
                  type="submit"
                  disabled={expensePending}
                  className="w-full rounded-xl bg-pink-500 py-2.5 text-sm font-extrabold text-white transition enabled:hover:bg-pink-600 disabled:opacity-40"
                >
                  {expensePending ? "Guardando…" : "Registrar gasto"}
                </button>
              </form>

              <div className="mt-5 max-h-64 overflow-y-auto">
                {summary.expenses.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    Sin gastos registrados en este turno.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {summary.expenses.map((expense) => (
                      <li
                        key={expense.id}
                        className="flex items-center justify-between rounded-xl bg-rose-50/60 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-700">
                            {expense.description}
                          </p>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {expense.category} ·{" "}
                            {new Date(expense.createdAt).toLocaleTimeString("es-CO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span className="font-extrabold text-rose-500">
                          −{formatMoney(expense.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-5 shadow-sm">
              <h3 className="mb-1 text-base font-extrabold text-slate-800">
                🔒 Cierre de caja
              </h3>
              <p className="mb-4 text-xs text-slate-500">
                Cuenta el efectivo físico y compáralo con lo esperado (
                {formatMoney(summary.expectedCash)}).
              </p>
              <form action={closeAction} className="space-y-3">
                <label className="block text-sm font-semibold text-slate-600">
                  Efectivo contado físicamente
                  <input
                    type="number"
                    name="actualAmount"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    required
                    value={countedCash}
                    onChange={(event) => setCountedCash(event.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-2xl font-extrabold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                  />
                </label>

                {diffBadge && (
                  <div
                    className={`rounded-xl px-4 py-3 text-center text-base font-extrabold ${diffBadge.cls}`}
                  >
                    {diffBadge.text}
                    {liveDifference !== null && liveDifference !== 0 && (
                      <p className="mt-0.5 text-xs font-semibold">
                        Esperado: {formatMoney(summary.expectedCash)} · Contado:{" "}
                        {formatMoney(counted)}
                      </p>
                    )}
                  </div>
                )}

                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Notas del turno (opcional)"
                  className="w-full resize-none rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                />

                <button
                  type="submit"
                  disabled={closePending || !hasCounted}
                  className="w-full rounded-2xl bg-sky-600 py-3 text-base font-extrabold text-white shadow-lg shadow-sky-100 transition enabled:hover:bg-sky-700 disabled:opacity-40"
                >
                  {closePending ? "Cerrando…" : "Cerrar turno e imprimir arqueo"}
                </button>
              </form>
            </div>
          </section>
        </>
      )}

      {closedRegisters.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
          <h2 className="border-b border-pink-50 px-5 py-4 text-base font-extrabold text-slate-800">
            🗂️ Historial de cierres
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-bold">Turno</th>
                  <th className="px-5 py-3 font-bold">Base</th>
                  <th className="px-5 py-3 font-bold">Esperado</th>
                  <th className="px-5 py-3 font-bold">Contado</th>
                  <th className="px-5 py-3 font-bold">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {closedRegisters.map((register) => {
                  const difference = register.difference ?? 0;
                  return (
                    <tr key={register.id} className="border-t border-pink-50">
                      <td className="px-5 py-3 font-semibold text-slate-600">
                        {new Date(register.closedAt).toLocaleDateString("es-CO")}{" "}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {new Date(register.openedAt).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          →{" "}
                          {new Date(register.closedAt).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-3">{formatMoney(register.initialAmount)}</td>
                      <td className="px-5 py-3">{formatMoney(register.expectedAmount ?? 0)}</td>
                      <td className="px-5 py-3">{formatMoney(register.actualAmount ?? 0)}</td>
                      <td
                        className={`px-5 py-3 font-extrabold ${
                          difference === 0
                            ? "text-emerald-600"
                            : difference > 0
                              ? "text-sky-600"
                              : "text-rose-500"
                        }`}
                      >
                        {difference === 0
                          ? "Cuadrada ✅"
                          : difference > 0
                            ? `Sobrante +${formatMoney(difference)}`
                            : `Faltante −${formatMoney(-difference)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
