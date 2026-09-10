import { prisma } from "@/lib/prisma";
import type { CategoryDTO, PendingOrderDTO } from "@/lib/types";
import { requireUser } from "@/lib/auth";
import { PedidoClient } from "./PedidoClient";

export const metadata = { title: "Tomar Pedidos · Heladería POS" };

export default async function PedidoPage() {
  const user = await requireUser();

  const [categories, pendingOrders, openRegister] = await Promise.all([
    prisma.category.findMany({
      orderBy: { id: "asc" },
      include: { products: { orderBy: { name: "asc" } } },
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
      image: product.image,
      unit: product.unit,
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
      price: item.price,
      notes: item.notes,
    })),
  }));

  return (
    <PedidoClient
      categories={categoryData}
      pendingOrders={pendingData}
      hasOpenRegister={openRegister !== null}
      userRole={user.role}
      userName={user.name}
    />
  );
}