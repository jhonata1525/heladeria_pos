"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { INGREDIENT_UNITS, WASTE_REASONS } from "@/lib/constants";
import type { IngredientDTO, ProductDTO } from "@/lib/types";
import {
  createIngredient,
  deleteIngredient,
  updateIngredient,
  setAllIngredientsStock,
  type ProductoActionState,
} from "./actions";
import { registerWaste } from "@/lib/actions/waste";
import type { WasteActionState } from "@/lib/actions/waste";

function formatQty(quantity: number, unit: string): string {
  const short = unit === "gramos" ? "g" : unit === "unidades" ? "und" : "ml";
  return `${quantity} ${short}`;
}

function Feedback({ state }: { state: ProductoActionState | null }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="rounded-xl bg-[#F3E6EB] px-3 py-2 text-xs font-semibold text-[#BE3663]">
        {state.error}
      </p>
    );
  }
  if (state.message && state.ok) {
    return (
      <p className="rounded-xl bg-[#F3E6EB] px-3 py-2 text-xs font-semibold text-[#D64575]">
        {state.message}
      </p>
    );
  }
  return null;
}

function WasteModal({
  isOpen,
  onClose,
  ingredient,
  products,
}: {
  isOpen: boolean;
  onClose: () => void;
  ingredient: IngredientDTO | null;
  products: ProductDTO[];
}) {
  if (!isOpen) return null;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"ingredient" | "product">("ingredient");
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("OTHER");
  const [note, setNote] = useState("");

  const isIngredientMode = type === "ingredient";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    if (isIngredientMode && ingredient) {
      formData.set("ingredientId", String(ingredient.id));
    } else if (!isIngredientMode && selectedProductId) {
      formData.set("productId", String(selectedProductId));
    }
    formData.set("quantity", quantity);
    formData.set("reason", reason);
    if (note) formData.set("note", note);

    try {
      const result = await registerWaste(null, formData);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error ?? "Error al registrar la merma");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setSubmitting(false);
    }
  }

  const wasteProducts = products.filter((p) => p.kind === "COMBO");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-[#FAF7F5] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-extrabold text-slate-800">
          {isIngredientMode ? `🗑️ Registrar merma: ${ingredient?.name}` : "🗑️ Registrar merma de producto"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Tipo de merma
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="ingredient"
                  checked={isIngredientMode}
                  onChange={() => setType("ingredient")}
                  className="text-bg-[#D64575]"
                />
                <span>Insumo directo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="product"
                  checked={!isIngredientMode}
                  onChange={() => setType("product")}
                  className="text-bg-[#D64575]"
                />
                <span>Producto (descuenta receta)</span>
              </label>
            </div>
          </div>

          {isIngredientMode && ingredient && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
              <p className="text-sm font-semibold text-amber-800">Insumo: {ingredient.name}</p>
              <p className="text-xs text-amber-700">
                Stock actual: {ingredient.currentStock} {ingredient.unit === "gramos" ? "g" : ingredient.unit === "unidades" ? "und" : "ml"}
                · Mínimo: {ingredient.minStock}
              </p>
            </div>
          )}

          {!isIngredientMode && (
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Producto <span className="text-[#D64575]">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
                required
              >
                <option value="">Selecciona un producto...</option>
                {wasteProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Cantidad <span className="text-[#D64575]">*</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej: 100"
              className="w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Motivo <span className="text-[#D64575]">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
              required
            >
              {WASTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r === "EXPIRED" && "⏰ Expirado / Caducado"}
                  {r === "DAMAGED" && "💥 Dañado / Roto"}
                  {r === "QUALITY" && "📉 Calidad / No apto"}
                  {r === "OTHER" && "📦 Otro"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={3}
              className="w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-[#F3E6EB] px-4 py-2.5 text-sm font-semibold text-[#BE3663]">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-2xl bg-[#FDF8FC] py-3 font-bold text-slate-500 transition hover:bg-slate-200 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || (!isIngredientMode && !selectedProductId) || !quantity}
              className="flex-1 rounded-2xl bg-text-[#D64575] py-3 font-extrabold text-white shadow-lg shadow-bg-[#DFF2EE] text-[#1F7A68] transition enabled:hover:bg-text-[#BE3663] disabled:opacity-40"
            >
              {submitting ? "Registrando…" : "Registrar merma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IngredientFields({ ingredient }: { ingredient?: IngredientDTO }) {
  return (
    <>
      <input
        type="hidden"
        name="id"
        value={ingredient?.id ?? ""}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-500">
          Nombre del insumo
          <input
            name="name"
            defaultValue={ingredient?.name}
            required
            placeholder="Ej: Helado Vainilla"
            className="mt-1 w-full rounded-lg border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#D5CECA]"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Unidad de medida
          <select
            name="unit"
            defaultValue={ingredient?.unit ?? "gramos"}
            className="mt-1 w-full rounded-lg border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#D5CECA]"
          >
            {INGREDIENT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Stock actual
          <input
            name="currentStock"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            defaultValue={ingredient?.currentStock ?? 0}
            required
            className="mt-1 w-full rounded-lg border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#D5CECA]"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Stock mínimo (alerta)
          <input
            name="minStock"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            defaultValue={ingredient?.minStock ?? 0}
            required
            className="mt-1 w-full rounded-lg border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#D5CECA]"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500 sm:col-span-2">
          Costo por unidad (COP por g / und / ml)
          <input
            name="costPerUnit"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            defaultValue={ingredient?.costPerUnit ?? 0}
            required
            className="mt-1 w-full rounded-lg border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-[#D5CECA]"
          />
        </label>
      </div>
    </>
  );
}

function IngredientRow({
  ingredient,
  products,
}: {
  ingredient: IngredientDTO;
  products: ProductDTO[];
}) {
  const [editing, setEditing] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [updateState, setUpdateState] = useState<ProductoActionState | null>(
    null,
  );
  const [deleteState, setDeleteState] = useState<ProductoActionState | null>(
    null,
  );
  const [updatePending, setUpdatePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  async function handleUpdate(formData: FormData) {
    setUpdatePending(true);
    try {
      const result = await updateIngredient(null, formData);
      setUpdateState(result);
      if (result.ok) setEditing(false);
    } catch {
      setUpdateState({
        ok: false,
        error: "Error de conexión con el servidor.",
      });
    } finally {
      setUpdatePending(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar el insumo "${ingredient.name}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setDeletePending(true);
    try {
      const formData = new FormData();
      formData.set("id", String(ingredient.id));
      const result = await deleteIngredient(null, formData);
      setDeleteState(result);
    } catch {
      setDeleteState({ ok: false, error: "Error de conexión con el servidor." });
    } finally {
      setDeletePending(false);
    }
  }

  const low = ingredient.currentStock <= ingredient.minStock;

  return (
    <>
      <li className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-slate-700">{ingredient.name}</p>
            <p className="text-xs text-slate-400">
              {formatQty(ingredient.currentStock, ingredient.unit)} en stock ·{" "}
              {formatMoney(ingredient.costPerUnit)} /{" "}
              {ingredient.unit === "gramos" ? "g" : ingredient.unit === "unidades" ? "und" : "ml"}
              {" · "}mínimo {formatQty(ingredient.minStock, ingredient.unit)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                low
                  ? "bg-[#F3E6EB] text-[#D64575]"
                  : "bg-[#F3E6EB] text-[#D64575]"
              }`}
            >
              {low ? "⚠ Stock bajo" : "OK"}
            </span>
            <button
              type="button"
              onClick={() => setShowWasteModal(true)}
              className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600"
            >
              🗑️ Merma
            </button>
            <button
              type="button"
              onClick={() => setEditing((prev) => !prev)}
              className="rounded-full bg-[#F3E6EB] px-3 py-1.5 text-xs font-bold text-[#D64575] transition hover:bg-[#DFF2EE] text-[#1F7A68]"
            >
              {editing ? "Cerrar" : "Editar"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePending}
              className="rounded-full bg-[#F3E6EB] px-3 py-1.5 text-xs font-bold text-[#D64575] transition hover:bg-[#DFF2EE] text-[#1F7A68] disabled:opacity-40"
            >
              Eliminar
            </button>
          </div>
        </div>

        {editing && (
          <form action={handleUpdate} className="mt-3 space-y-2">
            <IngredientFields ingredient={ingredient} />
            <Feedback state={updateState} />
            <button
              type="submit"
              disabled={updatePending}
              className="w-full rounded-xl bg-[#D64575] py-2 text-sm font-extrabold text-white transition enabled:hover:bg-text-[#D64575] disabled:opacity-40 sm:w-auto sm:px-6"
            >
              {updatePending ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        )}
        {!editing && deleteState && !deleteState.ok && (
          <div className="mt-2">
            <Feedback state={deleteState} />
          </div>
        )}
      </li>
      <WasteModal
        isOpen={showWasteModal}
        onClose={() => setShowWasteModal(false)}
        ingredient={ingredient}
        products={products}
      />
    </>
  );
}

export function IngredientsPanel({
  ingredients,
  products = [],
}: {
  ingredients: IngredientDTO[];
  products?: ProductDTO[];
}) {
  const [creating, setCreating] = useState(false);
  const [createState, setCreateState] = useState<ProductoActionState | null>(
    null,
  );
  const [createPending, setCreatePending] = useState(false);
  const [setAllStockState, setSetAllStockState] = useState<ProductoActionState | null>(
    null,
  );
  const [setAllStockPending, setSetAllStockPending] = useState(false);

  async function handleSetAllStock(formData: FormData) {
    setSetAllStockPending(true);
    try {
      formData.set("targetStock", "999");
      const result = await setAllIngredientsStock(null, formData);
      setSetAllStockState(result);
    } catch {
      setSetAllStockState({ ok: false, error: "Error de conexión con el servidor." });
    } finally {
      setSetAllStockPending(false);
    }
  }

  async function handleCreate(formData: FormData) {
    setCreatePending(true);
    try {
      const result = await createIngredient(null, formData);
      setCreateState(result);
      if (result.ok) setCreating(false);
    } catch {
      setCreateState({ ok: false, error: "Error de conexión con el servidor." });
    } finally {
      setCreatePending(false);
    }
  }

  const lowStockCount = ingredients.filter((i) => i.currentStock <= i.minStock).length;

  return (
    <section className="overflow-hidden rounded-3xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-bg-[#F3E6EB] px-5 py-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">
            🧪 Insumos / Materia Prima
          </h2>
          <p className="text-xs text-slate-400">
            Base del escandallo: helados en gramos, conos y vasos en unidades,
            salsas en ml.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <span className="rounded-full bg-[#F3E6EB] px-3 py-1.5 text-xs font-bold text-[#D64575]">
              ⚠ {lowStockCount} insumo(s) con stock bajo
            </span>
          )}
          <button
            type="button"
            onClick={() => setCreating((prev) => !prev)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              creating
                ? "bg-[#FDF8FC] text-slate-500 hover:bg-slate-200"
                : "bg-[#D64575] text-white shadow hover:bg-text-[#D64575]"
            }`}
          >
            {creating ? "Cancelar" : "+ Nuevo insumo"}
          </button>
        </div>
      </header>

      {creating && (
        <form action={handleCreate} className="space-y-2 border-b border-bg-[#F3E6EB] bg-[#F3E6EB]/30 px-5 py-4">
          <IngredientFields />
          <Feedback state={createState} />
          <button
            type="submit"
            disabled={createPending}
            className="w-full rounded-xl bg-[#D64575] py-2.5 text-sm font-extrabold text-white transition enabled:hover:bg-text-[#D64575] disabled:opacity-40 sm:w-auto sm:px-6"
          >
            {createPending ? "Creando…" : "Crear insumo"}
          </button>
        </form>
      )}

      {!creating && createState && (
        <div className="border-b border-bg-[#F3E6EB] px-5 pt-3">
          <Feedback state={createState} />
        </div>
      )}

      <form action={handleSetAllStock} className="border-b border-bg-[#F3E6EB] px-5 py-3">
        <button
          type="submit"
          disabled={setAllStockPending}
          className="w-full rounded-xl bg-rose-500 py-2 text-sm font-extrabold text-white transition enabled:hover:bg-rose-600 disabled:opacity-40 sm:w-auto sm:px-6"
        >
          {setAllStockPending ? "Actualizando…" : "🔧 Poner stock de todos los insumos a 999"}
        </button>
        <Feedback state={setAllStockState} />
      </form>

      {ingredients.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-400">
          Aún no hay insumos. Crea el primero para empezar a definir recetas.
        </p>
      ) : (
        <ul className="divide-y divide-bg-[#F3E6EB]">
          {ingredients.map((ingredient) => (
            <IngredientRow key={ingredient.id} ingredient={ingredient} products={products} />
          ))}
        </ul>
      )}
    </section>
  );
}
