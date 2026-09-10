"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";
import { INGREDIENT_UNITS, PRODUCT_KINDS } from "@/lib/constants";

export interface ProductoActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

export interface RecipeLineInput {
  ingredientId: number;
  quantity: number;
}

export interface SaveRecipePayload {
  productId: number;
  items: RecipeLineInput[];
}

function readNumber(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").replace(",", ".").trim();
  if (raw.length === 0) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function refreshCatalog(): void {
  revalidatePath("/productos");
  revalidatePath("/pos");
}

function validateIngredientFields(formData: FormData): {
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
} | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();

  if (name.length === 0) return { error: "Ingresa el nombre del insumo." };
  if (!INGREDIENT_UNITS.includes(unit as (typeof INGREDIENT_UNITS)[number])) {
    return { error: "Unidad inválida. Usa gramos, unidades o ml." };
  }

  const currentStock = readNumber(formData, "currentStock");
  const minStock = readNumber(formData, "minStock");
  const costPerUnit = readNumber(formData, "costPerUnit");

  if (currentStock === null || currentStock < 0) {
    return { error: "Ingresa un stock actual válido (≥ 0)." };
  }
  if (minStock === null || minStock < 0) {
    return { error: "Ingresa un stock mínimo válido (≥ 0)." };
  }
  if (costPerUnit === null || costPerUnit < 0) {
    return { error: "Ingresa un costo por unidad válido (≥ 0)." };
  }

  return {
    name,
    unit,
    currentStock: round2(currentStock),
    minStock: round2(minStock),
    costPerUnit: round2(costPerUnit),
  };
}

export async function createIngredient(
  _prev: ProductoActionState | null,
  formData: FormData,
): Promise<ProductoActionState> {
  const fields = validateIngredientFields(formData);
  if ("error" in fields) return { ok: false, error: fields.error };

  const existing = await prisma.ingredient.findUnique({
    where: { name: fields.name },
  });
  if (existing) {
    return { ok: false, error: `Ya existe un insumo llamado "${fields.name}".` };
  }

  await prisma.ingredient.create({ data: fields });

  refreshCatalog();
  return { ok: true, message: `Insumo creado: ${fields.name}` };
}

export async function updateIngredient(
  _prev: ProductoActionState | null,
  formData: FormData,
): Promise<ProductoActionState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "Insumo inválido." };
  }

  const fields = validateIngredientFields(formData);
  if ("error" in fields) return { ok: false, error: fields.error };

  const current = await prisma.ingredient.findUnique({ where: { id } });
  if (!current) return { ok: false, error: "El insumo ya no existe." };

  const duplicate = await prisma.ingredient.findUnique({
    where: { name: fields.name },
  });
  if (duplicate && duplicate.id !== id) {
    return { ok: false, error: `Ya existe otro insumo llamado "${fields.name}".` };
  }

  await prisma.ingredient.update({ where: { id }, data: fields });

  refreshCatalog();
  return { ok: true, message: `Insumo actualizado: ${fields.name}` };
}

export async function deleteIngredient(
  _prev: ProductoActionState | null,
  formData: FormData,
): Promise<ProductoActionState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "Insumo inválido." };
  }

  const usedBy = await prisma.recipeItem.count({ where: { ingredientId: id } });
  if (usedBy > 0) {
    return {
      ok: false,
      error: `No se puede borrar: el insumo está usado en ${usedBy} receta(s). Quítalo de las recetas primero.`,
    };
  }

  const current = await prisma.ingredient.findUnique({ where: { id } });
  if (!current) return { ok: false, error: "El insumo ya no existe." };

  await prisma.ingredient.delete({ where: { id } });

  refreshCatalog();
  return { ok: true, message: `Insumo eliminado: ${current.name}` };
}

export async function saveRecipe(
  payload: SaveRecipePayload,
): Promise<ProductoActionState> {
  const productId = Number(payload?.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return { ok: false, error: "Producto inválido." };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, error: "El producto no existe." };

  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const seen = new Set<number>();
  const items: RecipeLineInput[] = [];

  for (const entry of rawItems) {
    const ingredientId = Number(entry?.ingredientId);
    const quantity = Number(entry?.quantity);
    if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
      return { ok: false, error: "Selecciona un insumo válido en cada línea." };
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, error: "Cada línea necesita una cantidad mayor a 0." };
    }
    if (seen.has(ingredientId)) {
      return { ok: false, error: "Hay insumos repetidos en la receta." };
    }
    seen.add(ingredientId);
    items.push({ ingredientId, quantity: round2(quantity) });
  }

  if (items.length > 0) {
    const found = await prisma.ingredient.count({
      where: { id: { in: items.map((item) => item.ingredientId) } },
    });
    if (found !== items.length) {
      return { ok: false, error: "Uno de los insumos ya no existe." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.recipeItem.deleteMany({ where: { productId } });
    if (items.length > 0) {
      await tx.recipeItem.createMany({
        data: items.map((item) => ({ ...item, productId })),
      });
    }
  });

  refreshCatalog();
  return {
    ok: true,
    message:
      items.length > 0
        ? `Receta guardada para ${product.name} (${items.length} insumos).`
        : `Receta vaciada para ${product.name}.`,
  };
}

export async function createProduct(
  _prev: ProductoActionState | null,
  formData: FormData,
): Promise<ProductoActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "BASE").trim();
  const unit = String(formData.get("unit") ?? "").trim() || "unidad";
  const categoryId = Number(formData.get("categoryId"));
  const price = readNumber(formData, "price");
  const stockQuantity = readNumber(formData, "stockQuantity");

  if (name.length === 0) return { ok: false, error: "Ingresa el nombre del producto." };
  if (!PRODUCT_KINDS.includes(kind as (typeof PRODUCT_KINDS)[number])) {
    return { ok: false, error: "Tipo de producto inválido." };
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { ok: false, error: "Selecciona una categoría válida." };
  }
  if (price === null || price <= 0) {
    return { ok: false, error: "Ingresa un precio de venta válido (> 0)." };
  }
  if (stockQuantity === null || stockQuantity < 0) {
    return { ok: false, error: "Ingresa un stock inicial válido (≥ 0)." };
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return { ok: false, error: "La categoría no existe." };

  const product = await prisma.product.create({
    data: {
      name,
      price: round2(price),
      categoryId,
      unit,
      kind,
      stockQuantity: round2(stockQuantity),
      inStock: stockQuantity > 0,
    },
  });

  refreshCatalog();
  return { ok: true, message: `Producto creado: ${product.name}` };
}
