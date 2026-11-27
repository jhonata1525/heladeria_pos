import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";
import { requireAdmin } from "@/lib/auth-server";
import type { IngredientDTO, RecipeEntryDTO, ProductDTO } from "@/lib/types";
import { IngredientsPanel } from "./ingredients-panel";
import { ProductCreateForm } from "./product-create-form";
import { CatalogManager, type CatalogCategoryDTO } from "./catalog-manager";

export const metadata = { title: "Productos · Heladería POS" };

function calculateComboStock(product: { kind: string; stockQuantity: number; recipeItems: { ingredient: { currentStock: number }; quantity: number }[] }) {
  if (product.kind !== "COMBO") {
    return product.stockQuantity;
  }
  if (product.recipeItems.length === 0) {
    return 0;
  }
  let maxUnits = Infinity;
  for (const item of product.recipeItems) {
    const ingredientStock = item.ingredient.currentStock;
    const unitsPossible = Math.floor(ingredientStock / item.quantity);
    if (unitsPossible < maxUnits) {
      maxUnits = unitsPossible;
    }
  }
  return maxUnits === Infinity ? 0 : maxUnits;
}

export default async function ProductosPage() {
  await requireAdmin();

  const [categories, ingredientsRaw, recipeItems, productsRaw] = await Promise.all([
    prisma.category.findMany({
      orderBy: { id: "asc" },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: { recipeItems: { include: { ingredient: true } } },
        },
      },
    }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
    prisma.recipeItem.findMany({
      orderBy: { id: "asc" },
      include: { ingredient: true },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      where: { kind: "COMBO", isActive: true },
    }),
  ]);

  const ingredients: IngredientDTO[] = ingredientsRaw.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    currentStock: ingredient.currentStock,
    minStock: ingredient.minStock,
    costPerUnit: ingredient.costPerUnit,
  }));

  const recipesByProduct = new Map<number, RecipeEntryDTO[]>();
  const costByProduct = new Map<number, number>();
  for (const item of recipeItems) {
    const lines = recipesByProduct.get(item.productId) ?? [];
    lines.push({ ingredientId: item.ingredientId, quantity: item.quantity });
    recipesByProduct.set(item.productId, lines);
    costByProduct.set(
      item.productId,
      round2((costByProduct.get(item.productId) ?? 0) + item.quantity * item.ingredient.costPerUnit),
    );
  }

  const products: ProductDTO[] = productsRaw.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    categoryId: product.categoryId,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    minStock: product.minStock,
    isActive: product.isActive,
    image: product.image,
    unit: product.unit,
    kind: product.kind,
    quickCode: product.quickCode,
  }));

  const lowStockCount = ingredients.filter(
    (ingredient) => ingredient.currentStock <= ingredient.minStock,
  ).length;

  const catalogCategories: CatalogCategoryDTO[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    products: category.products.map((product) => {
      const effectiveStock = calculateComboStock(
        product as {
          kind: string;
          stockQuantity: number;
          recipeItems: { ingredient: { currentStock: number }; quantity: number }[];
        },
      );
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        categoryId: product.categoryId,
        kind: product.kind,
        unit: product.unit,
        effectiveStock,
        stockQuantity: product.stockQuantity,
        minStock: product.minStock,
        soldOut:
          product.kind === "COMBO"
            ? effectiveStock <= 0
            : !product.inStock || effectiveStock <= 0,
        quickCode: product.quickCode,
        recipe: recipesByProduct.get(product.id) ?? [],
        cost: costByProduct.get(product.id) ?? null,
      };
    }),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            🍦 Productos e Inventario
          </h1>
          <p className="text-sm text-slate-500">
            Catálogo, insumos y recetas (escandallos). Cada venta descuenta
            gramos/unidades del stock de insumos y registra el costo real de
            producción.
          </p>
        </div>
      </header>

{lowStockCount > 0 && (
        <span className="rounded-full bg-[#F3E6EB] px-3 py-1.5 text-xs font-bold text-[#D64575]">
          ⚠ {lowStockCount} insumo(s) con stock bajo
        </span>
      )}

      <IngredientsPanel ingredients={ingredients} products={products} />

      <ProductCreateForm
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
      />

      {categories.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-[#E4C7D2] bg-[#FAF7F5]/70 p-10 text-center text-slate-500">
          Aún no hay categorías ni productos registrados.
        </p>
      ) : (
        <CatalogManager categories={catalogCategories} ingredients={ingredients} />
      )}
    </div>
  );
}