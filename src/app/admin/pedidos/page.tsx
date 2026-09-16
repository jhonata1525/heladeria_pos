import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-server";
import { PedidosClient } from "./PedidosClient";

type AdminOrder = {
  id: number;
  orderNumber: number;
  customerName: string | null;
  tableNumber: number | null;
  total: number;
  cogs: number;
  status: string;
  paymentMethod: string | null;
  cashReceived: number | null;
  changeGiven: number | null;
  createdAt: Date;
  items: { product: { name: string } }[];
};

export default async function PedidosPage() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  });

  const orderData: AdminOrder[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    tableNumber: order.tableNumber,
    total: order.total,
    cogs: order.cogs,
    status: order.status,
    paymentMethod: order.paymentMethod,
    cashReceived: order.cashReceived,
    changeGiven: order.changeGiven,
    createdAt: order.createdAt,
    items: order.items,
  }));

  return <PedidosClient orders={orderData} />;
}