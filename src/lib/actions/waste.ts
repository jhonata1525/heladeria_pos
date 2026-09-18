"use server";

import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";
import { requireUser } from "@/lib/auth-server";
import { wasteSchema, type WasteFormValues } from "@/lib/validations/zod";

export interface WasteActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

function validateWaste(data: WasteFormValues): { ok: true; data: WasteFormValues } | { ok: false; error: string } {
  const result = wasteSchema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return { ok: false, error: firstError.message };
  }
  return { ok: true, data: result.data };
}

export async function registerWaste(
  _prev: WasteActionState | null,
  formData: FormData,
): Promise<WasteActionState> {
  const user = await requireUser();

  const ingredientIdRaw = formData.get("ingredientId");
  const productIdRaw = formData.get("productId");
  const quantityRaw = formData.get("quantity");
  const reason = String(formData.get("reason") ?? "") as "EXPIRED" | "DAMAGED" | "QUALITY" | "OTHER";
  const note = String(formData.get("note") ?? "").trim() || null;

  const ingredientId = ingredientIdRaw ? Number(ingredientIdRaw) : undefined;
  const productId = productIdRaw ? Number(productIdRaw) : undefined;
  const quantity = Number(quantityRaw);

  const validation = validateWaste({ ingredientId, productId, quantity, reason, note });
  if (!validation.ok) return { ok: false, error: validation.error };

  const { ingredientId: validIngredientId, productId: validProductId, quantity: validQuantity, reason: validReason, note: validNote } = validation.data;

  try {
    await prisma.$transaction(async (tx) => {
      if (validIngredientId) {
        const ingredient = await tx.ingredient.findUnique({ where: { id: validIngredientId } });
        if (!ingredient) throw new Error("Insumo no encontrado");

        const newStock = round2(ingredient.currentStock - validQuantity);
        if (newStock < 0) throw new Error("Stock insuficiente para registrar la merma");

        await tx.ingredient.update({
          where: { id: validIngredientId },
          data: { currentStock: newStock },
        });
      }

      if (validProductId) {
        const product = await tx.product.findUnique({
          where: { id: validProductId },
          include: { recipeItems: { include: { ingredient: true } } },
        });
        if (!product) throw new Error("Producto no encontrado");
        if (product.kind !== "COMBO" || product.recipeItems.length === 0) {
          throw new Error("El producto no tiene receta definida para descontar ingredientes");
        }

        for (const item of product.recipeItems) {
          const amountToDeduct = round2(item.quantity * validQuantity);
          const newStock = round2(item.ingredient.currentStock - amountToDeduct);
          if (newStock < 0) throw new Error(`Stock insuficiente de ${item.ingredient.name} para registrar la merma`);

          await tx.ingredient.update({
            where: { id: item.ingredientId },
            data: { currentStock: newStock },
          });
        }
      }

      await tx.wasteLog.create({
        data: {
          ingredientId: validIngredientId,
          productId: validProductId,
          quantity: validQuantity,
          reason: validReason,
          note: validNote,
          registeredById: user.id,
        },
      });
    });

    return { ok: true, message: "Merma registrada correctamente" };
  } catch (error) {
    console.error("Error registrando merma:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Error al registrar la merma" };
  }
}

export async function getWasteLogs(
  options: { limit?: number; offset?: number; ingredientId?: number; productId?: number; reason?: string } = {}
) {
  const { limit = 50, offset = 0, ingredientId, productId, reason } = options;

  const where: Record<string, unknown> = {};
  if (ingredientId) where.ingredientId = ingredientId;
  if (productId) where.productId = productId;
  if (reason) where.reason = reason;

  const [logs, total] = await Promise.all([
    prisma.wasteLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
        product: { select: { id: true, name: true } },
        registeredBy: { select: { id: true, name: true } },
      },
    }),
    prisma.wasteLog.count({ where }),
  ]);

  return { logs, total };
}

export async function getLowStockIngredients() {
  const ingredients = await prisma.ingredient.findMany({
    where: {
      currentStock: { lte: prisma.ingredient.fields.minStock },
    },
    orderBy: { currentStock: "asc" },
  });
  return ingredients;
}