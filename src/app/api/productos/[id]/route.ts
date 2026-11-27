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

interface ProductUpdateData {
  name?: string;
  categoryId?: number;
  kind?: string;
  unit?: string;
  price?: number;
  stockQuantity?: number;
  minStock?: number;
  inStock?: boolean;
  quickCode?: string | null;
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
  if (!Array.isArray(value)) {
    return { error: "La receta debe ser una lista de insumos." };
  }

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

async function parseProductId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params;
  const productId = Number(id);
  return Number.isInteger(productId) && productId > 0 ? productId : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const productId = await parseProductId(params);
  if (productId === null) {
    return Response.json({ error: "Producto inválido." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      recipeItems: { include: { ingredient: true } },
    },
  });

  if (!product) {
    return Response.json({ error: "Producto no encontrado." }, { status: 404 });
  }

  return Response.json(product);
}

async function handleUpdate(
  request: NextRequest,
  params: Promise<{ id: string }>,
  fullUpdate: boolean,
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const productId = await parseProductId(params);
  if (productId === null) {
    return Response.json({ error: "Producto inválido." }, { status: 400 });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return Response.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Cuerpo de petición inválido." }, { status: 400 });
    }

    if (!fullUpdate && body.action === "adjustStock") {
      const adjustment = asNumber(body.adjustment);
      const absoluteStock = asNumber(body.stockQuantity);

      if (adjustment === null && absoluteStock === null) {
        return Response.json(
          { error: "Indica cuánto stock sumar o el stock final." },
          { status: 400 },
        );
      }

      const nextStock =
        absoluteStock !== null
          ? absoluteStock
          : round2(product.stockQuantity + (adjustment ?? 0));

      if (nextStock < 0) {
        return Response.json(
          { error: "El stock resultante no puede ser negativo." },
          { status: 400 },
        );
      }

      const updated = await prisma.product.update({
        where: { id: productId },
        data: {
          stockQuantity: round2(nextStock),
          inStock: nextStock > 0,
        },
      });

      refreshCatalog();
      return Response.json({ ok: true, product: updated });
    }

    const data: ProductUpdateData = {};
    let recipeProvided = false;
    let recipeItems: RecipeLineInput[] = [];

    if (body.name !== undefined) {
      const name = asString(body.name);
      if (!name) {
        return Response.json({ error: "El nombre es obligatorio." }, { status: 400 });
      }
      data.name = name;
    } else if (fullUpdate) {
      return Response.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }

    if (body.categoryId !== undefined) {
      const categoryId = asNumber(body.categoryId);
      if (categoryId === null || !Number.isInteger(categoryId) || categoryId <= 0) {
        return Response.json({ error: "Categoría inválida." }, { status: 400 });
      }
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return Response.json({ error: "La categoría no existe." }, { status: 404 });
      }
      data.categoryId = categoryId;
    } else if (fullUpdate) {
      return Response.json({ error: "La categoría es obligatoria." }, { status: 400 });
    }

    if (body.kind !== undefined) {
      const kind = asString(body.kind);
      if (!kind || !PRODUCT_KINDS.includes(kind as (typeof PRODUCT_KINDS)[number])) {
        return Response.json({ error: "Tipo de producto inválido." }, { status: 400 });
      }
      data.kind = kind;
    } else if (fullUpdate) {
      return Response.json({ error: "El tipo de producto es obligatorio." }, { status: 400 });
    }

    if (body.unit !== undefined) {
      const unit = asString(body.unit);
      if (!unit) {
        return Response.json({ error: "La unidad es obligatoria." }, { status: 400 });
      }
      data.unit = unit;
    }

    if (body.price !== undefined) {
      const price = asNumber(body.price);
      if (price === null || price <= 0) {
        return Response.json({ error: "El precio debe ser mayor a 0." }, { status: 400 });
      }
      data.price = round2(price);
    } else if (fullUpdate) {
      return Response.json({ error: "El precio es obligatorio." }, { status: 400 });
    }

    if (body.stockQuantity !== undefined) {
      const stockQuantity = asNumber(body.stockQuantity);
      if (stockQuantity === null || stockQuantity < 0) {
        return Response.json({ error: "El stock no puede ser negativo." }, { status: 400 });
      }
      data.stockQuantity = round2(stockQuantity);
      data.inStock = stockQuantity > 0;
    }

    if (body.minStock !== undefined) {
      const minStock = asNumber(body.minStock);
      if (minStock === null || minStock < 0) {
        return Response.json(
          { error: "El stock mínimo no puede ser negativo." },
          { status: 400 },
        );
      }
      data.minStock = round2(minStock);
    }

    if ("quickCode" in body) {
      if (body.quickCode === null) {
        data.quickCode = null;
      } else {
        data.quickCode = asString(body.quickCode) || null;
      }
    }

    if (body.recipe !== undefined) {
      const parsedRecipe = parseRecipe(body.recipe);
      if ("error" in parsedRecipe) {
        return Response.json({ error: parsedRecipe.error }, { status: 400 });
      }
      recipeItems = parsedRecipe.items;
      recipeProvided = true;
      if (!(await validateRecipeIngredients(recipeItems))) {
        return Response.json({ error: "Uno de los insumos no existe." }, { status: 400 });
      }
    }

    const effectiveKind = data.kind ?? product.kind;
    if (effectiveKind === "BASE") {
      if (recipeItems.length > 0) {
        return Response.json(
          { error: "Los productos Base no pueden tener receta. Usa el tipo Combinación." },
          { status: 400 },
        );
      }
      if (data.kind === "BASE" || recipeProvided) {
        recipeProvided = true;
        recipeItems = [];
      }
    }

    if (Object.keys(data).length === 0 && !recipeProvided) {
      return Response.json({ error: "No hay cambios para guardar." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.product.update({
        where: { id: productId },
        data,
      });

      if (recipeProvided) {
        await tx.recipeItem.deleteMany({ where: { productId } });
        if (recipeItems.length > 0) {
          await tx.recipeItem.createMany({
            data: recipeItems.map((item) => ({
              productId,
              ingredientId: item.ingredientId,
              quantity: item.quantity,
            })),
          });
        }
      }

      return saved;
    });

    refreshCatalog();
    return Response.json({ ok: true, product: updated });
  } catch (error) {
    console.error("PATCH/PUT /api/productos/[id] failed:", error);
    return Response.json({ error: "No se pudo actualizar el producto." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, params, true);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, params, false);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const productId = await parseProductId(params);
  if (productId === null) {
    return Response.json({ error: "Producto inválido." }, { status: 400 });
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: {
          _count: {
            select: {
              orderItems: true,
              recipeItems: true,
            },
          },
        },
      });

      if (!product) return { kind: "missing" as const };

      const hasHistory =
        product._count.orderItems > 0 || product._count.recipeItems > 0;

      if (hasHistory) {
        await tx.product.update({
          where: { id: productId },
          data: { isActive: false, inStock: false },
        });
        return {
          kind: "soft" as const,
          body: {
            ok: true,
            softDeleted: true,
            message:
              "El producto tiene historial o receta asociada. Se desactivó y ya no aparece en el POS ni en el catálogo activo.",
          },
        };
      }

      await tx.product.delete({ where: { id: productId } });
      return {
        kind: "hard" as const,
        body: {
          ok: true,
          deleted: true,
          message: "Producto eliminado permanentemente.",
        },
      };
    });

    if (outcome.kind === "missing") {
      return Response.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    refreshCatalog();
    return Response.json(outcome.body);
  } catch (error) {
    console.error("DELETE /api/productos/[id] failed:", error);
    return Response.json({ error: "No se pudo eliminar el producto." }, { status: 500 });
  }
}
