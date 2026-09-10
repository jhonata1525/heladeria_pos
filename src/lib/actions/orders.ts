import type { Prisma } from "@/generated/prisma/client";
import { round2 } from "@/lib/format";

export type OrderTx = Prisma.TransactionClient;

export interface OrderLineRef {
  productId: number;
  quantity: number;
}

interface IngredientUsage {
  name: string;
  unit: string;
  costPerUnit: number;
  quantity: number;
}

async function aggregateIngredientUsage(
  tx: OrderTx,
  lines: OrderLineRef[],
): Promise<Map<number, IngredientUsage>> {
  const productIds = [...new Set(lines.map((line) => line.productId))];
  if (productIds.length === 0) return new Map();

  const recipes = await tx.recipeItem.findMany({
    where: { productId: { in: productIds } },
    include: { ingredient: true },
  });
  if (recipes.length === 0) return new Map();

  const usage = new Map<number, IngredientUsage>();
  for (const line of lines) {
    for (const item of recipes) {
      if (item.productId !== line.productId) continue;
      const current = usage.get(item.ingredientId) ?? {
        name: item.ingredient.name,
        unit: item.ingredient.unit,
        costPerUnit: item.ingredient.costPerUnit,
        quantity: 0,
      };
      current.quantity += line.quantity * item.quantity;
      usage.set(item.ingredientId, current);
    }
  }
  return usage;
}

export async function consumeIngredientsForOrder(
  tx: OrderTx,
  lines: OrderLineRef[],
): Promise<number> {
  const usage = await aggregateIngredientUsage(tx, lines);

  let cogs = 0;
  for (const [ingredientId, consumed] of usage) {
    await tx.ingredient.update({
      where: { id: ingredientId },
      data: { currentStock: { decrement: round2(consumed.quantity) } },
    });
    cogs += round2(consumed.quantity) * consumed.costPerUnit;
  }

  return round2(cogs);
}

export async function restoreIngredientsForOrder(
  tx: OrderTx,
  lines: OrderLineRef[],
): Promise<void> {
  const usage = await aggregateIngredientUsage(tx, lines);

  for (const [ingredientId, consumed] of usage) {
    await tx.ingredient.update({
      where: { id: ingredientId },
      data: { currentStock: { increment: round2(consumed.quantity) } },
    });
  }
}
