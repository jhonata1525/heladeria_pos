"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { IngredientDTO, RecipeEntryDTO } from "@/lib/types";
import { RecipeDialog } from "./recipe-dialog";

export interface CatalogProductDTO {
  id: number;
  name: string;
  price: number;
  kind: string;
  unit: string;
  effectiveStock: number;
  soldOut: boolean;
  recipe: RecipeEntryDTO[];
  cost: number | null;
}

export interface CatalogCategoryDTO {
  id: number;
  name: string;
  products: CatalogProductDTO[];
}

const CATEGORY_EMOJI: Array<[RegExp, string]> = [
  [/copa/i, "🍷"],
  [/emplatad/i, "🍽️"],
  [/infantil|niñ/i, "🧒"],
  [/cono/i, "🍦"],
  [/canasta/i, "🧺"],
  [/bebida/i, "🥤"],
  [/helado/i, "🍨"],
  [/vaso/i, "🍧"],
  [/especialidad/i, "🍌"],
  [/topping/i, "🍒"],
];

function categoryEmoji(name: string): string {
  for (const [pattern, emoji] of CATEGORY_EMOJI) {
    if (pattern.test(name)) return emoji;
  }
  return "🍽️";
}

function categoryUnits(products: CatalogProductDTO[]): number {
  return products.reduce((sum, product) => sum + Math.max(0, product.effectiveStock), 0);
}

export function CatalogManager({
  categories,
  ingredients,
}: {
  categories: CatalogCategoryDTO[];
  ingredients: IngredientDTO[];
}) {
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());

  const query = search.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!query) return categories;
    return categories
      .map((category) => {
        const categoryMatches = category.name.toLowerCase().includes(query);
        const products = categoryMatches
          ? category.products
          : category.products.filter((product) =>
              product.name.toLowerCase().includes(query),
            );
        return { ...category, products };
      })
      .filter(
        (category) =>
          category.name.toLowerCase().includes(query) || category.products.length > 0,
      );
  }, [categories, query]);

  const toggleCategory = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenIds(new Set(categories.map((category) => category.id)));
  const collapseAll = () => setOpenIds(new Set());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#FF9CEE]/50 bg-[#FAF7F5] p-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="🔍 Buscar producto por nombre o categoría..."
          className="min-w-0 flex-1 rounded-xl border border-[#E4C7D2] bg-white px-4 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#85E3FF]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-xl bg-[#85E3FF] px-3 py-2 text-xs font-bold text-[#1F1B24] transition hover:bg-[#6FD3F2]"
          >
            Expandir todas
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-xl bg-[#FF9CEE] px-3 py-2 text-xs font-bold text-[#2B1424] transition hover:bg-[#F282DF]"
          >
            Colapsar todas
          </button>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-[#E4C7D2] bg-[#FAF7F5]/70 p-10 text-center text-slate-500">
          No se encontraron productos que coincidan con “{search.trim()}”.
        </p>
      ) : (
        filteredCategories.map((category) => {
          const isOpen = query ? true : openIds.has(category.id);
          const units = categoryUnits(category.products);

          return (
            <section
              key={category.id}
              className="overflow-hidden rounded-2xl border border-[#FF9CEE]/50 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 bg-[#FAF7F5] px-4 py-3 text-left transition hover:bg-[#FF9CEE]/10"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {categoryEmoji(category.name)}
                  </span>
                  <span className="truncate text-sm font-extrabold uppercase tracking-wide text-slate-800">
                    {category.name}
                  </span>
                  <span className="rounded-full bg-[#F3E6EB] px-2 py-0.5 text-[11px] font-bold text-[#D64575]">
                    {category.products.length} productos
                  </span>
                  <span className="hidden rounded-full bg-[#DFF2EE] px-2 py-0.5 text-[11px] font-bold text-[#1F7A68] sm:inline">
                    {units} uds disp.
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-[#D64575]" aria-hidden>
                  {isOpen ? "▾" : "▸"}
                </span>
              </button>

              {isOpen && (
                <div className="overflow-x-auto">
                  {category.products.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-slate-400">
                      Sin productos en esta categoría.
                    </p>
                  ) : (
                    <table className="w-full min-w-[560px] border-collapse text-sm">
                      <thead>
                        <tr className="border-y border-[#FF9CEE]/30 bg-[#FDF8FC] text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-2 text-left">Producto y tipo</th>
                          <th className="px-3 py-2 text-center">Receta</th>
                          <th className="px-3 py-2 text-center">Stock</th>
                          <th className="px-4 py-2 text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.products.map((product) => {
                          const low =
                            !product.soldOut &&
                            product.effectiveStock > 0 &&
                            product.effectiveStock <= 5;

                          return (
                            <tr
                              key={product.id}
                              className="border-b border-[#E4C7D2]/30 last:border-b-0 hover:bg-[#FDF8FC]"
                            >
                              <td className="px-4 py-3">
                                <p className="flex flex-wrap items-center gap-1.5 font-bold text-slate-700">
                                  {product.name}
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                      product.kind === "COMBO"
                                        ? "bg-rose-50 text-rose-600"
                                        : "bg-sky-50 text-sky-600"
                                    }`}
                                  >
                                    {product.kind === "COMBO" ? "Combinación" : "Base"}
                                  </span>
                                </p>
                                <p className="text-xs text-slate-400">
                                  Se vende por {product.unit}
                                  {product.recipe.length > 0 && product.cost !== null
                                    ? ` · Costo ${formatMoney(product.cost)} · Utilidad ${formatMoney(
                                        product.price - product.cost,
                                      )}`
                                    : " · sin receta definida"}
                                </p>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <RecipeDialog
                                  product={{
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                  }}
                                  ingredients={ingredients}
                                  recipe={product.recipe}
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                                    product.soldOut
                                      ? "bg-[#F3E6EB] text-[#D64575]"
                                      : low
                                        ? "bg-amber-50 text-amber-600"
                                        : "bg-[#DFF2EE] text-[#1F7A68]"
                                  }`}
                                >
                                  {product.soldOut
                                    ? "Agotado"
                                    : `${product.effectiveStock} ${product.unit}`}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-extrabold text-[#D64575]">
                                {formatMoney(product.price)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
