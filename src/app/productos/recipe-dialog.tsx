"use client";

import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/format";
import type { IngredientDTO, RecipeEntryDTO } from "@/lib/types";
import { saveRecipe } from "./actions";

interface RecipeLine {
  key: number;
  ingredientId: number;
  quantity: string;
}

let lineKey = 0;

function unitShort(unit: string): string {
  return unit === "gramos" ? "g" : unit === "unidades" ? "und" : "ml";
}

export function RecipeDialog({
  product,
  ingredients,
  recipe,
}: {
  product: { id: number; name: string; price: number };
  ingredients: IngredientDTO[];
  recipe: RecipeEntryDTO[];
}) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setError(null);
    setSavedMessage(null);
    setLines(
      recipe.length > 0
        ? recipe.map((entry) => ({
            key: ++lineKey,
            ingredientId: entry.ingredientId,
            quantity: String(entry.quantity),
          }))
        : ingredients.length > 0
          ? [{ key: ++lineKey, ingredientId: ingredients[0].id, quantity: "" }]
          : [],
    );
    setOpen(true);
  }

  function updateLine(key: number, patch: Partial<RecipeLine>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    if (ingredients.length === 0) return;
    const used = new Set(lines.map((line) => line.ingredientId));
    const available = ingredients.find((ing) => !used.has(ing.id)) ?? ingredients[0];
    setLines((prev) => [
      ...prev,
      { key: ++lineKey, ingredientId: available.id, quantity: "" },
    ]);
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }

  const estimatedCost = lines.reduce((sum, line) => {
    const ingredient = ingredients.find((ing) => ing.id === line.ingredientId);
    const quantity = Number(line.quantity.replace(",", "."));
    if (!ingredient || !Number.isFinite(quantity)) return sum;
    return sum + quantity * ingredient.costPerUnit;
  }, 0);

  const packagingIngredients = ingredients.filter(
    (ingredient) => ingredient.unit === "unidades",
  );
  const [packagingId, setPackagingId] = useState<number | null>(
    packagingIngredients[0]?.id ?? null,
  );
  const [packagingQty, setPackagingQty] = useState("1");

  function addPackaging() {
    if (packagingId === null) return;
    if (!packagingIngredients.some((ing) => ing.id === packagingId)) return;
    setLines((prev) => [
      ...prev,
      { key: ++lineKey, ingredientId: packagingId, quantity: packagingQty || "1" },
    ]);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveRecipe({
          productId: product.id,
          items: lines.map((line) => ({
            ingredientId: line.ingredientId,
            quantity: Number(line.quantity.replace(",", ".")),
          })),
        });
        if (!result.ok) {
          setError(result.error ?? "No se pudo guardar la receta.");
          return;
        }
        setSavedMessage(result.message ?? "Receta guardada.");
        setTimeout(() => setOpen(false), 700);
      } catch {
        setError("Error de conexión con el servidor.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title="Editar receta / escandallo"
        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
          recipe.length > 0
            ? "bg-pink-50 text-pink-600 hover:bg-pink-100"
            : "bg-slate-100 text-slate-500 hover:bg-pink-50 hover:text-pink-600"
        }`}
      >
        🧾 Receta{recipe.length > 0 ? ` (${recipe.length})` : ""}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-slate-800">
              🧾 Receta · {product.name}
            </h3>
            <p className="mt-0.5 mb-4 text-xs text-slate-400">
              Define cuánto insumo consume cada unidad vendida. El stock se
              descontará automáticamente en cada venta.
            </p>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {ingredients.length === 0 ? (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-600">
                  Primero crea insumos en la sección de arriba.
                </p>
              ) : (
                lines.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-center gap-2 rounded-2xl bg-rose-50/60 p-2"
                  >
                    <select
                      value={line.ingredientId}
                      onChange={(event) =>
                        updateLine(line.key, {
                          ingredientId: Number(event.target.value),
                        })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-pink-100 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-pink-300"
                    >
                      {ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name} ({unitShort(ingredient.unit)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min={0}
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, { quantity: event.target.value })
                      }
                      placeholder="Cant."
                      className="w-20 rounded-lg border border-pink-100 bg-white px-2.5 py-2 text-right text-sm font-bold text-slate-700 outline-none focus:border-pink-300"
                    />
                    <button
                      type="button"
                      aria-label="Quitar línea"
                      onClick={() => removeLine(line.key)}
                      className="px-2 py-1 text-slate-400 transition hover:text-rose-500"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={addLine}
              disabled={ingredients.length === 0}
              className="mt-2 w-full rounded-xl border-2 border-dashed border-pink-200 py-2 text-xs font-bold text-pink-500 transition enabled:hover:border-pink-300 enabled:hover:bg-pink-50 disabled:opacity-40"
            >
              + Agregar insumo
            </button>

            {packagingIngredients.length > 0 && (
              <div className="mt-3 rounded-2xl bg-sky-50/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-sky-600">
                  📦 Envase / Presentación (domicilios y extras)
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={packagingId ?? ""}
                    onChange={(event) =>
                      setPackagingId(Number(event.target.value))
                    }
                    className="min-w-0 flex-1 rounded-lg border border-sky-100 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-sky-300"
                  >
                    {packagingIngredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    value={packagingQty}
                    onChange={(event) => setPackagingQty(event.target.value)}
                    aria-label="Cantidad de envases"
                    className="w-16 rounded-lg border border-sky-100 bg-white px-2.5 py-2 text-right text-sm font-bold text-slate-700 outline-none focus:border-sky-300"
                  />
                  <button
                    type="button"
                    onClick={addPackaging}
                    className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-sky-600"
                  >
                    + Añadir
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Ej: 1 Vaso Icopor + 160g Helado Brownie. Se cobra y descuenta
                  automáticamente en cada venta.
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
              <span className="font-semibold text-slate-500">
                Costo por unidad vendida
              </span>
              <span className="font-extrabold text-slate-800">
                {formatMoney(estimatedCost)}
              </span>
            </div>
            <p className="mt-1 text-right text-xs font-semibold text-emerald-600">
              Utilidad estimada:{" "}
              {formatMoney(product.price - estimatedCost)} / venta
            </p>

            {error && (
              <p className="mt-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-600">
                {error}
              </p>
            )}
            {savedMessage && (
              <p className="mt-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-600">
                ✅ {savedMessage}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-500 transition hover:bg-slate-200 disabled:opacity-40"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={pending || ingredients.length === 0}
                onClick={handleSave}
                className="flex-[2] rounded-2xl bg-pink-500 py-3 font-extrabold text-white shadow-lg shadow-pink-100 transition enabled:hover:bg-pink-600 disabled:opacity-40"
              >
                {pending ? "Guardando…" : "Guardar receta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
