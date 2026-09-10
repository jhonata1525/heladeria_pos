import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";
import { restoreIngredientsForOrder } from "@/lib/actions/orders";
import { eventEmitter, SSE_EVENTS } from "@/lib/events";

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return Response.json({ error: "Pedido inválido" }, { status: 400 });
    }

    const body = await request.json();
    const action = body?.action;

    if (action !== "pay" && action !== "cancel") {
      return Response.json({ error: "Acción inválida" }, { status: 400 });
    }

    const auth = await getUserRole();
    if (!auth) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    if (action === "cancel" && auth.role !== "ADMIN") {
      return Response.json({ error: "Solo los administradores pueden cancelar pedidos" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        return { status: 404 as const, body: { error: "Pedido no encontrado" } };
      }
      if (order.status !== "PENDING") {
        return {
          status: 409 as const,
          body: { error: "El pedido ya no está pendiente" },
        };
      }

      if (action === "cancel") {
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

        await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });

        await tx.auditLog.create({
          data: {
            userId: auth.userId,
            action: "ORDER_CANCELLED",
            entity: "Order",
            entityId: order.id,
            details: JSON.stringify({ orderNumber: order.orderNumber, total: order.total }),
          },
        });

        eventEmitter.emit(SSE_EVENTS.ORDER_CANCELLED, {
          id: order.id,
          orderNumber: order.orderNumber,
        });
        eventEmitter.emit(SSE_EVENTS.STOCK_UPDATED, {});

        return { status: 200 as const, body: { ok: true, cancelled: true } };
      }

      const paymentMethod: PaymentMethod | null = PAYMENT_METHODS.includes(
        body?.paymentMethod,
      )
        ? body.paymentMethod
        : null;
      if (!paymentMethod) {
        return {
          status: 400 as const,
          body: { error: "Método de pago inválido" },
        };
      }

      if (paymentMethod === "CASH") {
        const cashReceived = Number(body?.cashReceived);
        if (!Number.isFinite(cashReceived) || cashReceived < order.total) {
          return {
            status: 400 as const,
            body: { error: "El efectivo recibido es menor que el total" },
          };
        }

        const openRegister = await tx.cashRegister.findFirst({
          where: { status: "OPEN" },
        });
        if (!openRegister) {
          return {
            status: 409 as const,
            body: {
              error:
                "No hay un turno de caja abierto. Ábrelo en el módulo de Caja antes de cobrar.",
            },
          };
        }

        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            paymentMethod,
            cashReceived: round2(cashReceived),
            changeGiven: round2(cashReceived - order.total),
          },
          select: { id: true, orderNumber: true, changeGiven: true },
        });

        await tx.auditLog.create({
          data: {
            userId: auth.userId,
            action: "ORDER_PAID",
            entity: "Order",
            entityId: order.id,
            details: JSON.stringify({ orderNumber: order.orderNumber, total: order.total, paymentMethod }),
          },
        });

        eventEmitter.emit(SSE_EVENTS.ORDER_UPDATED, {
          id: updated.id,
          orderNumber: updated.orderNumber,
          status: "PAID",
          paymentMethod,
        });

        return { status: 200 as const, body: { ok: true, order: updated } };
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", paymentMethod },
        select: { id: true, orderNumber: true, changeGiven: true },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          action: "ORDER_PAID",
          entity: "Order",
          entityId: order.id,
          details: JSON.stringify({ orderNumber: order.orderNumber, total: order.total, paymentMethod }),
        },
      });

      eventEmitter.emit(SSE_EVENTS.ORDER_UPDATED, {
        id: updated.id,
        orderNumber: updated.orderNumber,
        status: "PAID",
        paymentMethod,
      });

      return { status: 200 as const, body: { ok: true, order: updated } };
    });

    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error("PATCH /api/orders/[id] failed:", error);
    return Response.json(
      { error: "No se pudo actualizar el pedido" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
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
    console.error("DELETE /api/orders/[id] failed:", error);
    return Response.json(
      { error: "No se pudo eliminar el pedido" },
      { status: 500 },
    );
  }
}