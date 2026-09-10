"use client";

import { useState } from "react";
import {
  createProduct,
  type ProductoActionState,
} from "./actions";

const PRODUCT_UNITS = ["unidad", "porción", "litro", "orden"];

export function ProductCreateForm({
  categories,
}: {
  categories: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ProductoActionState | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await createProduct(null, formData);
      setState(result);
      if (result.ok) setOpen(false);
    } catch {
      setState({ ok: false, error: "Error de conexión con el servidor." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-50 px-5 py-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">
            🏷️ Catálogo comercial
          </h2>
          <p className="text-xs text-slate-400">
            Crea productos Base (bolas extra, vasos, conos) o Combinaciones que
            usan receta.
          </p>
        </div>
        {categories.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              open
                ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                : "bg-pink-500 text-white shadow hover:bg-pink-600"
            }`}
          >
            {open ? "Cancelar" : "+ Nuevo producto"}
          </button>
        )}
      </header>

      {open && (
        <form
          action={handleSubmit}
          className="grid gap-3 border-b border-pink-50 bg-pink-50/30 px-5 py-4 sm:grid-cols-2"
        >
          <label className="text-xs font-semibold text-slate-500 sm:col-span-2">
            Nombre del producto
            <input
              name="name"
              required
              placeholder="Ej: Cono Doble"
              className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
            />
          </label>

          <label className="text-xs font-semibold text-slate-500">
            Categoría
            <select
              name="categoryId"
              required
              className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500">
            Tipo de producto
            <select
              name="kind"
              defaultValue="BASE"
              className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
            >
              <option value="BASE">Producto Base (suelto / envase)</option>
              <option value="COMBO">Combinación (usa receta)</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-500">
            Precio de venta (COP)
            <input
              name="price"
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              required
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-500">
              Unidad
              <select
                name="unit"
                defaultValue="unidad"
                className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
              >
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Stock inicial
              <input
                name="stockQuantity"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                defaultValue={0}
                required
                className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
              />
            </label>
          </div>

          {state && !state.ok && state.error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 sm:col-span-2">
              {state.error}
            </p>
          )}
          {state?.ok && state.message && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 sm:col-span-2">
              ✅ {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-pink-500 py-2.5 text-sm font-extrabold text-white transition enabled:hover:bg-pink-600 disabled:opacity-40 sm:col-span-2 sm:w-auto sm:px-8"
          >
            {pending ? "Creando…" : `Crear producto`}
          </button>
        </form>
      )}

      {!open && state && (
        <div className="border-b border-pink-50 px-5 pt-3">
          {state.ok ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
              ✅ {state.message}
            </p>
          ) : (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
              {state.error}
            </p>
          )}
        </div>
      )}

      {categories.length === 0 && (
        <p className="px-5 py-4 text-sm text-slate-400">
          Primero crea una categoría para poder agregar productos.
        </p>
      )}
      <p className="px-5 py-3 text-[11px] text-slate-400">
        El stock controla la disponibilidad inmediata en el POS; los productos
        tipo Combinación descuentan su receta de insumos en cada venta.
      </p>
    </section>
  );
}
