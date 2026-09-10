import { prisma } from "@/lib/prisma";
import { formatMoney, round2 } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import type { IngredientDTO, RecipeEntryDTO } from "@/lib/types";
import { IngredientsPanel } from "./ingredients-panel";
import { RecipeDialog } from "./recipe-dialog";
import { ProductCreateForm } from "./product-create-form";

export const metadata = { title: "Productos · Heladería POS" };

const CATEGORY_EMOJI: Record<string, string> = {
  Helados: "🍨",
  "Vasos/Conos": "🍧",
  Especialidades: "🍌",
  Toppings: "🍒",
  Bebidas: "🥤",
};

export default async function ProductosPage() {
  await requireAdmin();

  const [categories, ingredientsRaw, recipeItems] = await Promise.all([
    prisma.category.findMany({
      orderBy: { id: "asc" },
      include: { products: { orderBy: { name: "asc" } } },
    }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
    prisma.recipeItem.findMany({
      orderBy: { id: "asc" },
      include: { ingredient: true },
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

  const lowStockCount = ingredients.filter(
    (ingredient) => ingredient.currentStock <= ingredient.minStock,
  ).length;

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
        {lowStockCount > 0 && (
          <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-500">
            ⚠ {lowStockCount} insumo(s) con stock bajo
          </span>
        )}
      </header>

      <IngredientsPanel ingredients={ingredients} />

      <ProductCreateForm
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
      />

      {categories.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-pink-200 bg-white/70 p-10 text-center text-slate-500">
          Aún no hay categorías ni productos registrados.
        </p>
      ) : (
        categories.map((category) => (
          <section
            key={category.id}
            className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm"
          >
            <h2 className="border-b border-pink-50 px-5 py-4 text-base font-extrabold text-slate-800">
              {CATEGORY_EMOJI[category.name] ?? "🍽️"} {category.name}
              <span className="ml-2 rounded-full bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-500">
                {category.products.length} productos
              </span>
            </h2>
            {category.products.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">
                Sin productos en esta categoría.
              </p>
            ) : (
              <ul className="divide-y divide-pink-50">
                {category.products.map((product) => {
                  const soldOut = !product.inStock || product.stockQuantity <= 0;
                  const low = !soldOut && product.stockQuantity <= 5;
                  const recipe = recipesByProduct.get(product.id) ?? [];
                  const cost = costByProduct.get(product.id);
                  return (
                    <li
                      key={product.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 font-bold text-slate-700">
                          {product.name}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              product.kind === "COMBO"
                                ? "bg-violet-50 text-violet-600"
                                : "bg-sky-50 text-sky-600"
                            }`}
                          >
                            {product.kind === "COMBO" ? "Combinación" : "Base"}
                          </span>
                        </p>
                        <p className="text-xs text-slate-400">
                          Se vende por {product.unit}
                          {recipe.length > 0 && cost !== undefined
                            ? ` · Costo ${formatMoney(cost)} · Utilidad ${formatMoney(round2(product.price - cost))}`
                            : ' · sin receta definida'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <RecipeDialog
                          product={{
                            id: product.id,
                            name: product.name,
                            price: product.price,
                          }}
                          ingredients={ingredients}
                          recipe={recipe}
                        />
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            soldOut
                              ? "bg-rose-50 text-rose-500"
                              : low
                                ? "bg-amber-50 text-amber-600"
                                : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {soldOut
                            ? "Agotado"
                            : `${product.stockQuantity} ${product.unit}`}
                        </span>
                        <span className="w-24 text-right font-extrabold text-pink-600">
                          {formatMoney(product.price)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
