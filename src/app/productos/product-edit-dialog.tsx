"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { IngredientDTO } from "@/lib/types";
import type { CatalogCategoryDTO, CatalogProductDTO } from "./catalog-manager";

interface RecipeLine {
  key: number;
  ingredientId: number;
  quantity: string;
}

let recipeLineKey = 0;

function unitShort(unit: string): string {
  return unit === "gramos" ? "g" : unit === "unidades" ? "und" : "ml";
}

export function ProductEditDialog({
  product,
  categories,
  ingredients,
  onClose,
  onSaved,
}: {
  product: CatalogProductDTO;
  categories: CatalogCategoryDTO[];
  ingredients: IngredientDTO[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(product.name);
  const [categoryId, setCategoryId] = useState(String(product.categoryId));
  const [kind, setKind] = useState(product.kind);
  const [unit, setUnit] = useState(product.unit);
  const [price, setPrice] = useState(String(product.price));
  const [quickCode, setQuickCode] = useState(product.quickCode ?? "");
  const [minStock, setMinStock] = useState(String(product.minStock));
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>(() =>
    product.recipe.map((entry) => ({
      key: ++recipeLineKey,
      ingredientId: entry.ingredientId,
      quantity: String(entry.quantity),
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addRecipeLine() {
    if (ingredients.length === 0) return;
    const used = new Set(recipeLines.map((line) => line.ingredientId));
    const available =
      ingredients.find((ingredient) => !used.has(ingredient.id)) ?? ingredients[0];
    setRecipeLines((prev) => [
      ...prev,
      { key: ++recipeLineKey, ingredientId: available.id, quantity: "" },
    ]);
  }

  function updateRecipeLine(key: number, patch: Partial<RecipeLine>) {
    setRecipeLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function removeRecipeLine(key: number) {
    setRecipeLines((prev) => prev.filter((line) => line.key !== key));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedUnit = unit.trim();
    const numericPrice = Number(price.replace(",", "."));
    const numericMinStock = Number(minStock.replace(",", "."));

    if (!trimmedName) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    if (!trimmedUnit) {
      setError("La unidad de venta es obligatoria.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Ingresa un precio de venta válido.");
      return;
    }
    if (!Number.isFinite(numericMinStock) || numericMinStock < 0) {
      setError("Ingresa un stock mínimo válido.");
      return;
    }

    const recipe = recipeLines.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: Number(line.quantity.replace(",", ".")),
    }));

    if (
      kind === "COMBO" &&
      recipe.some(
        (line) =>
          !Number.isFinite(line.quantity) || line.quantity <= 0,
      )
    ) {
      setError("Cada insumo de la receta debe tener una cantidad mayor a 0.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/productos/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          categoryId: Number(categoryId),
          kind,
          unit: trimmedUnit,
          price: numericPrice,
          quickCode: quickCode.trim() || null,
          minStock: numericMinStock,
          ...(kind === "COMBO" ? { recipe } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "No se pudo actualizar el producto.");
        return;
      }
      onSaved("Producto actualizado correctamente.");
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
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-[#FAF7F5] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#FF9CEE]/40 pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">
              Editar producto
            </h3>
            <p className="text-xs text-slate-500">
              {product.name} · Stock actual: {product.stockQuantity} {product.unit}
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

        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-500 sm:col-span-2">
              Nombre del producto
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[#E4C7D2] bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#FF9CEE]"
              />
            </label>

            <label className="text-xs font-semibold text-slate-500">
              Categoría
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E4C7D2] bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#FF9CEE]"
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
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E4C7D2] bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#FF9CEE]"
              >
                <option value="BASE">Producto Base (suelto / envase)</option>
                <option value="COMBO">Combinación (usa receta)</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-500">
              Unidad de venta
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="unidad, gramos, ml..."
                required
                className="mt-1 w-full rounded-lg border border-[#E4C7D2] bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#FF9CEE]"
              />
            </label>

            <label className="text-xs font-semibold text-slate-500">
              Precio de venta (COP)
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[#E4C7D2] bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#FF9CEE]"
              />
            </label>

            <label className="text-xs font-semibold text-slate-500">
              Código rápido (quickCode)
              <input
                value={quickCode}
                onChange={(event) => setQuickCode(event.target.value)}
                placeholder="Ej: 301"
                className="mt-1 w-full rounded-lg border border-[#E4C7D2] bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#FF9CEE]"
              />
            </label>

            <label className="text-xs font-semibold text-slate-500">
              Stock mínimo
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={minStock}
                onChange={(event) => setMinStock(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E4C7D2] bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#FF9CEE]"
              />
            </label>

            <div className="rounded-xl bg-[#FDF8FC] px-3 py-2 text-xs font-semibold text-slate-500">
              Stock actual:{" "}
              <span className="font-extrabold text-slate-700">
                {product.stockQuantity} {product.unit}
              </span>
              <p className="mt-1 text-[11px] font-normal text-slate-400">
                Para surtir o corregir stock usa la acción rápida “+ Surtir”.
              </p>
            </div>
          </div>

          {kind === "COMBO" && (
            <div className="mt-4 rounded-2xl border border-[#FF9CEE]/50 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-700">
                    Receta de insumos
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Se descuenta automáticamente en cada venta.
                  </p>
                </div>
                <span className="rounded-full bg-[#DFF2EE] px-2 py-0.5 text-[11px] font-bold text-[#1F7A68]">
                  Costo:{" "}
                  {formatMoney(
                    recipeLines.reduce((sum, line) => {
                      const ingredient = ingredients.find(
                        (item) => item.id === line.ingredientId,
                      );
                      const quantity = Number(line.quantity.replace(",", "."));
                      if (!ingredient || !Number.isFinite(quantity)) return sum;
                      return sum + quantity * ingredient.costPerUnit;
                    }, 0),
                  )}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {ingredients.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    Primero crea insumos para definir la receta.
                  </p>
                ) : recipeLines.length === 0 ? (
                  <p className="rounded-xl bg-[#FDF8FC] px-3 py-2 text-xs text-slate-400">
                    Sin receta definida.
                  </p>
                ) : (
                  recipeLines.map((line) => (
                    <div key={line.key} className="flex items-center gap-2">
                      <select
                        value={line.ingredientId}
                        onChange={(event) =>
                          updateRecipeLine(line.key, {
                            ingredientId: Number(event.target.value),
                          })
                        }
                        className="min-w-0 flex-1 rounded-lg border border-[#E4C7D2] bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#FF9CEE]"
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
                          updateRecipeLine(line.key, {
                            quantity: event.target.value,
                          })
                        }
                        placeholder="Cant."
                        className="w-24 rounded-lg border border-[#E4C7D2] bg-white px-2.5 py-2 text-right text-sm font-bold text-slate-700 outline-none focus:border-[#FF9CEE]"
                      />
                      <button
                        type="button"
                        onClick={() => removeRecipeLine(line.key)}
                        className="px-2 py-1 text-slate-400 transition hover:text-[#D64575]"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={addRecipeLine}
                disabled={ingredients.length === 0}
                className="mt-2 w-full rounded-xl border-2 border-dashed border-[#E4C7D2] py-2 text-xs font-bold text-[#D64575] transition enabled:hover:bg-[#F3E6EB] disabled:opacity-40"
              >
                + Agregar insumo
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-[#F3E6EB] px-4 py-2.5 text-sm font-semibold text-[#BE3663]">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-[#FF9CEE]/40 pt-3">
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
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
