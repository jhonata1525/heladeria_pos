"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { INGREDIENT_UNITS } from "@/lib/constants";
import type { IngredientDTO } from "@/lib/types";
import {
  createIngredient,
  deleteIngredient,
  updateIngredient,
  type ProductoActionState,
} from "./actions";

function formatQty(quantity: number, unit: string): string {
  const short = unit === "gramos" ? "g" : unit === "unidades" ? "und" : "ml";
  return `${quantity} ${short}`;
}

function Feedback({ state }: { state: ProductoActionState | null }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
        {state.error}
      </p>
    );
  }
  if (state.message && state.ok) {
    return (
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
        {state.message}
      </p>
    );
  }
  return null;
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
            className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Unidad de medida
          <select
            name="unit"
            defaultValue={ingredient?.unit ?? "gramos"}
            className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
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
            className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
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
            className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
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
            className="mt-1 w-full rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-pink-300"
          />
        </label>
      </div>
    </>
  );
}

function IngredientRow({ ingredient }: { ingredient: IngredientDTO }) {
  const [editing, setEditing] = useState(false);
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
                ? "bg-rose-50 text-rose-500"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {low ? "⚠ Stock bajo" : "OK"}
          </span>
          <button
            type="button"
            onClick={() => setEditing((prev) => !prev)}
            className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-bold text-pink-600 transition hover:bg-pink-100"
          >
            {editing ? "Cerrar" : "Editar"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deletePending}
            className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-500 transition hover:bg-rose-100 disabled:opacity-40"
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
            className="w-full rounded-xl bg-pink-500 py-2 text-sm font-extrabold text-white transition enabled:hover:bg-pink-600 disabled:opacity-40 sm:w-auto sm:px-6"
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
  );
}

export function IngredientsPanel({
  ingredients,
}: {
  ingredients: IngredientDTO[];
}) {
  const [creating, setCreating] = useState(false);
  const [createState, setCreateState] = useState<ProductoActionState | null>(
    null,
  );
  const [createPending, setCreatePending] = useState(false);

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

  return (
    <section className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-50 px-5 py-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">
            🧪 Insumos / Materia Prima
          </h2>
          <p className="text-xs text-slate-400">
            Base del escandallo: helados en gramos, conos y vasos en unidades,
            salsas en ml.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((prev) => !prev)}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            creating
              ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
              : "bg-pink-500 text-white shadow hover:bg-pink-600"
          }`}
        >
          {creating ? "Cancelar" : "+ Nuevo insumo"}
        </button>
      </header>

      {creating && (
        <form action={handleCreate} className="space-y-2 border-b border-pink-50 bg-pink-50/30 px-5 py-4">
          <IngredientFields />
          <Feedback state={createState} />
          <button
            type="submit"
            disabled={createPending}
            className="w-full rounded-xl bg-pink-500 py-2.5 text-sm font-extrabold text-white transition enabled:hover:bg-pink-600 disabled:opacity-40 sm:w-auto sm:px-6"
          >
            {createPending ? "Creando…" : "Crear insumo"}
          </button>
        </form>
      )}

      {!creating && createState && (
        <div className="border-b border-pink-50 px-5 pt-3">
          <Feedback state={createState} />
        </div>
      )}

      {ingredients.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-400">
          Aún no hay insumos. Crea el primero para empezar a definir recetas.
        </p>
      ) : (
        <ul className="divide-y divide-pink-50">
          {ingredients.map((ingredient) => (
            <IngredientRow key={ingredient.id} ingredient={ingredient} />
          ))}
        </ul>
      )}
    </section>
  );
}
