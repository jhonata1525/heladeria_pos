import { prisma } from "@/lib/prisma";
import type { CategoryDTO, PendingOrderDTO } from "@/lib/types";
import { requireUser } from "@/lib/auth-server";
import { round2 } from "@/lib/format";
import { PedidoClient } from "./PedidoClient";

export const metadata = { title: "Tomar Pedidos · Heladitos Dani" };

export default async function PedidoPage() {
  const user = await requireUser();

  const [categories, pendingOrders, openRegister] = await Promise.all([
    prisma.category.findMany({
      orderBy: { id: "asc" },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.order.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { items: { include: { product: true } } },
    }),
    prisma.cashRegister.findFirst({ where: { status: "OPEN" } }),
  ]);

  const categoryData: CategoryDTO[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    products: category.products.map((product) => ({
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
    })),
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
      createdAt: item.createdAt.toISOString(),
    })),
  }));

  return (
    <PedidoClient
      categories={categoryData}
      pendingOrders={pendingData}
      hasOpenRegister={openRegister !== null}
      userName={user.name}
    />
  );
}