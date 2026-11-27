import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";
import { PRODUCT_KINDS } from "@/lib/constants";
import { requireAdminApi } from "@/lib/api-auth";

interface RecipeLineInput {
  ingredientId: number;
  quantity: number;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function parseRecipe(value: unknown): { items: RecipeLineInput[] } | { error: string } {
  if (value === undefined || value === null) return { items: [] };
  if (!Array.isArray(value)) return { error: "La receta debe ser una lista de insumos." };

  const seen = new Set<number>();
  const items: RecipeLineInput[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      return { error: "La receta contiene un insumo inválido." };
    }
    const entry = raw as { ingredientId?: unknown; quantity?: unknown };
    const ingredientId = asNumber(entry.ingredientId);
    const quantity = asNumber(entry.quantity);

    if (
      ingredientId === null ||
      !Number.isInteger(ingredientId) ||
      ingredientId <= 0
    ) {
      return { error: "La receta contiene un insumo inválido." };
    }
    if (quantity === null || quantity <= 0) {
      return { error: "Cada insumo de la receta debe tener cantidad mayor a 0." };
    }
    if (seen.has(ingredientId)) {
      return { error: "La receta tiene insumos repetidos." };
    }

    seen.add(ingredientId);
    items.push({ ingredientId, quantity: round2(quantity) });
  }

  return { items };
}

async function validateRecipeIngredients(items: RecipeLineInput[]): Promise<boolean> {
  if (items.length === 0) return true;
  const found = await prisma.ingredient.count({
    where: { id: { in: items.map((item) => item.ingredientId) } },
  });
  return found === items.length;
}

function refreshCatalog(): void {
  revalidatePath("/productos");
  revalidatePath("/pos");
}

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      category: true,
      recipeItems: { include: { ingredient: true } },
    },
  });

  return Response.json(products);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const name = asString(body.name) ?? "";
    const kind = asString(body.kind) ?? "BASE";
    const unit = asString(body.unit) ?? "unidad";
    const categoryId = asNumber(body.categoryId);
    const price = asNumber(body.price);
    const stockQuantity = asNumber(body.stockQuantity) ?? 0;
    const minStock = asNumber(body.minStock) ?? 0;
    const quickCodeValue = body.quickCode;
    const quickCode =
      quickCodeValue === null ? null : (asString(quickCodeValue) || null);

    if (name.length === 0) {
      return Response.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }
    if (!PRODUCT_KINDS.includes(kind as (typeof PRODUCT_KINDS)[number])) {
      return Response.json({ error: "Tipo de producto inválido." }, { status: 400 });
    }
    if (categoryId === null || !Number.isInteger(categoryId) || categoryId <= 0) {
      return Response.json({ error: "Categoría inválida." }, { status: 400 });
    }
    if (price === null || price <= 0) {
      return Response.json({ error: "El precio debe ser mayor a 0." }, { status: 400 });
    }
    if (stockQuantity < 0) {
      return Response.json({ error: "El stock no puede ser negativo." }, { status: 400 });
    }
    if (minStock < 0) {
      return Response.json({ error: "El stock mínimo no puede ser negativo." }, { status: 400 });
    }
    if (unit.length === 0) {
      return Response.json({ error: "La unidad es obligatoria." }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return Response.json({ error: "La categoría no existe." }, { status: 404 });
    }

    const parsedRecipe = parseRecipe(body.recipe);
    if ("error" in parsedRecipe) {
      return Response.json({ error: parsedRecipe.error }, { status: 400 });
    }
    const recipeItems = kind === "COMBO" ? parsedRecipe.items : [];
    if (!(await validateRecipeIngredients(recipeItems))) {
      return Response.json({ error: "Uno de los insumos no existe." }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
        kind,
        unit,
        price: round2(price),
        stockQuantity: round2(stockQuantity),
        minStock: round2(minStock),
        inStock: stockQuantity > 0,
        quickCode,
        ...(recipeItems.length > 0
          ? {
              recipeItems: {
                create: recipeItems.map((item) => ({
                  ingredientId: item.ingredientId,
                  quantity: item.quantity,
                })),
              },
            }
          : {}),
      },
      include: {
        category: true,
        recipeItems: { include: { ingredient: true } },
      },
    });

    refreshCatalog();
    return Response.json({ ok: true, product }, { status: 201 });
  } catch (error) {
    console.error("POST /api/productos failed:", error);
    return Response.json({ error: "No se pudo crear el producto." }, { status: 500 });
  }
}
