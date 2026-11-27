import { prisma } from "@/lib/prisma";
import type { CategoryDTO, PendingOrderDTO, TicketConfigDTO } from "@/lib/types";
import { requireUser } from "@/lib/auth-server";
import { PosClient } from "./pos-client";
import { round2 } from "@/lib/format";

export const metadata = { title: "Punto de Venta · Heladería POS" };

function calculateComboStock(product: { id: number; kind: string; stockQuantity: number; recipeItems: { ingredient: { currentStock: number }; quantity: number }[] }) {
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

export default async function PosPage() {
  const user = await requireUser();

  const [categories, pendingOrders, openRegister, ticketConfig] = await Promise.all([
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
    prisma.order.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { items: { include: { product: true } } },
    }),
    prisma.cashRegister.findFirst({ where: { status: "OPEN" } }),
    prisma.ticketConfig.findUnique({ where: { id: "default" } }),
  ]);

  const categoryData: CategoryDTO[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    products: category.products.map((product) => {
      const effectiveStock = calculateComboStock(product as { id: number; kind: string; stockQuantity: number; recipeItems: { ingredient: { currentStock: number }; quantity: number }[] });
      const inStock = product.kind === "COMBO" ? effectiveStock > 0 : product.inStock;
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        categoryId: product.categoryId,
        inStock,
        stockQuantity: effectiveStock,
        minStock: product.minStock,
        isActive: product.isActive,
        image: product.image,
        unit: product.unit,
        kind: product.kind,
        quickCode: product.quickCode,
      };
    }),
  }));

  const pendingData: PendingOrderDTO[] = pendingOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    tableNumber: order.tableNumber,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      subtotal: round2(item.product.price * item.quantity),
      notes: item.notes,
      createdAt: (item.createdAt ?? order.createdAt).toISOString(),
    })),
  }));

  const ticketConfigData: TicketConfigDTO = ticketConfig ?? {
    businessName: "Heladería POS",
    nit: null,
    address: null,
    phone: "",
    footerMessage: "¡Gracias por su compra!",
    fontSize: 10,
    paperWidthMm: 58,
  };

  return (
    <PosClient
      categories={categoryData}
      pendingOrders={pendingData}
      hasOpenRegister={openRegister !== null}
      userRole={user.role}
      ticketConfig={ticketConfigData}
    />
  );
}
