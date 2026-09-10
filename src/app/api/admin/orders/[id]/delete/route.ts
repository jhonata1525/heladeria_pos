import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";
import { restoreIngredientsForOrder } from "@/lib/actions/orders";
import { eventEmitter, SSE_EVENTS } from "@/lib/events";

async function getUserRole(): Promise<{ role: string; userId: number } | null> {
  const store = await cookies();
  const raw = store.get("heladeria_session")?.value;
  if (!raw) return null;
  const userId = Number(raw);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });
  return user?.isActive ? { role: user.role, userId } : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return Response.json({ error: "Pedido inválido" }, { status: 400 });
    }

    const auth = await getUserRole();
    if (!auth || auth.role !== "ADMIN") {
      return Response.json({ error: "Solo administradores pueden eliminar pedidos" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        return { status: 404 as const, body: { error: "Pedido no encontrado" } };
      }

      if (order.status !== "CANCELLED" && order.status !== "PENDING") {
        return {
          status: 409 as const,
          body: { error: "Solo se pueden eliminar pedidos cancelados o pendientes" },
        };
      }

      if (order.status === "PENDING") {
        await restoreIngredientsForOrder(
          tx,
          order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        );

        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (product) {
            const restored = round2(product.stockQuantity + item.quantity);
            await tx.product.update({
              where: { id: product.id },
              data: {
                stockQuantity: { increment: item.quantity },
                ...(restored > 0 && !product.inStock ? { inStock: true } : {}),
              },
            });
          }
        }
      }

      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
      await tx.order.delete({ where: { id: order.id } });

      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          action: "ORDER_DELETED",
          entity: "Order",
          entityId: order.id,
          details: JSON.stringify({ orderNumber: order.orderNumber, total: order.total, status: order.status }),
        },
      });

      eventEmitter.emit(SSE_EVENTS.ORDER_CANCELLED, {
        id: order.id,
        orderNumber: order.orderNumber,
      });
      eventEmitter.emit(SSE_EVENTS.STOCK_UPDATED, {});

      return { status: 200 as const, body: { ok: true, deleted: true } };
    });

    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/delete failed:", error);
    return Response.json(
      { error: "No se pudo eliminar el pedido" },
      { status: 500 },
    );
  }
}