"use client";

import { useState } from "react";
import type { CatalogProductDTO } from "./catalog-manager";

export function ProductStockDialog({
  product,
  onClose,
  onSaved,
}: {
  product: CatalogProductDTO;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [mode, setMode] = useState<"add" | "set">("add");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value)) {
      setError("Ingresa una cantidad válida.");
      return;
    }
    if (mode === "set" && value < 0) {
      setError("El stock final no puede ser negativo.");
      return;
    }
    if (mode === "add" && product.stockQuantity + value < 0) {
      setError("El ajuste dejaría el stock en negativo.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/productos/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjustStock",
          ...(mode === "add" ? { adjustment: value } : { stockQuantity: value }),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "No se pudo ajustar el stock.");
        return;
      }
      onSaved(
        mode === "add"
          ? `Stock actualizado: ${product.stockQuantity} → ${
              product.stockQuantity + value
            } ${product.unit}.`
          : `Stock corregido a ${value} ${product.unit}.`,
      );
    } catch {
      setError("Error de conexión con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={() => !saving && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-[#FAF7F5] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">
              Surtir / ajustar stock
            </h3>
            <p className="text-xs text-slate-500">
              {product.name} · Actual: {product.stockQuantity} {product.unit}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full bg-[#F3E6EB] px-2.5 py-1 text-xs font-bold text-[#BE3663] disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("add")}
            className={`rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition ${
              mode === "add"
                ? "border-[#D64575] bg-[#F3E6EB] text-[#D64575]"
                : "border-slate-200 text-slate-500 hover:border-[#E4C7D2]"
            }`}
          >
            + Sumar stock
          </button>
          <button
            type="button"
            onClick={() => setMode("set")}
            className={`rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition ${
              mode === "set"
                ? "border-[#D64575] bg-[#F3E6EB] text-[#D64575]"
                : "border-slate-200 text-slate-500 hover:border-[#E4C7D2]"
            }`}
          >
            Corregir stock final
          </button>
        </div>

        <label className="mt-4 block text-xs font-semibold text-slate-500">
          {mode === "add"
            ? `Cantidad a sumar (${product.unit})`
            : `Stock final (${product.unit})`}
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={mode === "add" ? "Ej: 20 o 5000" : "Ej: 50"}
            autoFocus
            className="mt-1 w-full rounded-xl border border-[#E4C7D2] bg-white px-4 py-3 text-lg font-extrabold text-slate-800 outline-none focus:border-[#FF9CEE]"
          />
        </label>

        <div className="mt-2 flex flex-wrap gap-2">
          {[10, 20, 50, 100].map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() =>
                setAmount(
                  mode === "add"
                    ? String((Number(amount.replace(",", ".")) || 0) + quick)
                    : String(quick),
                )
              }
              className="rounded-full border border-[#E4C7D2] bg-[#FDF8FC] px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
            >
              {mode === "add" ? `+${quick}` : quick}
            </button>
          ))}
        </div>

        {product.kind === "COMBO" && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
            Este producto es una combinación: su disponibilidad real se calcula
            desde la receta de insumos. Este ajuste actualiza su stock de
            referencia.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-[#F3E6EB] px-4 py-2.5 text-sm font-semibold text-[#BE3663]">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-2xl bg-[#FDF8FC] py-3 font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] rounded-2xl bg-[#D64575] py-3 font-extrabold text-white shadow-lg transition enabled:hover:bg-[#BE3663] disabled:opacity-40"
          >
            {saving ? "Guardando..." : "Aplicar ajuste"}
          </button>
        </div>
      </form>
    </div>
  );
}
