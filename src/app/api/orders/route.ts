import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";
import { consumeIngredientsForOrder } from "@/lib/actions/orders";
import { eventEmitter, SSE_EVENTS } from "@/lib/events";

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface ParsedItem {
  productId: number;
  quantity: number;
  notes: string | null;
}

function parseItems(raw: unknown): ParsedItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ApiError(400, "El pedido no tiene productos");
  }

  const merged = new Map<number, ParsedItem>();

  for (const entry of raw) {
    const productId = Number(entry?.productId);
    const quantity = Number(entry?.quantity);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ApiError(400, "Producto inválido en el pedido");
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(400, "Cantidad inválida en el pedido");
    }

    const existing = merged.get(productId);
    const notes =
      typeof entry?.notes === "string" && entry.notes.trim().length > 0
        ? entry.notes.trim()
        : null;

    if (existing) {
      existing.quantity += quantity;
      existing.notes = notes ?? existing.notes;
    } else {
      merged.set(productId, { productId, quantity, notes });
    }
  }

  return [...merged.values()];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = parseItems(body?.items);

    const isPaid = body?.status === "PAID";
    const paymentMethod: PaymentMethod | null = PAYMENT_METHODS.includes(
      body?.paymentMethod,
    )
      ? body.paymentMethod
      : null;

    if (isPaid && !paymentMethod) {
      throw new ApiError(400, "Método de pago inválido");
    }

    let cashReceived: number | null = null;
    if (isPaid && paymentMethod === "CASH") {
      cashReceived = Number(body?.cashReceived);
      if (!Number.isFinite(cashReceived)) {
        throw new ApiError(400, "Debes indicar el efectivo recibido");
      }
    }

    const customerName = body?.customerName?.trim() || null;
    const tableNumber = body?.tableNumber ? Number(body.tableNumber) : null;
    if (tableNumber !== null && (!Number.isInteger(tableNumber) || tableNumber <= 0)) {
      throw new ApiError(400, "Número de mesa inválido");
    }

    if (isPaid) {
      const openRegister = await prisma.cashRegister.findFirst({
        where: { status: "OPEN" },
      });
      if (!openRegister) {
        throw new ApiError(
          409,
          "No hay un turno de caja abierto. Ábrelo en el módulo de Caja antes de cobrar.",
        );
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const [{ _max }] = await Promise.all([
        tx.order.aggregate({ _max: { orderNumber: true } }),
      ]);
      const orderNumber = (_max.orderNumber ?? 0) + 1;

      let total = 0;
      const lines: {
        productId: number;
        quantity: number;
        price: number;
        notes: string | null;
      }[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new ApiError(400, `El producto ${item.productId} no existe`);
        }
        if (!product.inStock || product.stockQuantity < item.quantity) {
          throw new ApiError(
            409,
            `Stock insuficiente de "${product.name}" (disponible: ${product.stockQuantity} ${product.unit})`,
          );
        }

        const remaining = round2(product.stockQuantity - item.quantity);
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: { decrement: item.quantity },
            ...(remaining <= 0 ? { inStock: false } : {}),
          },
        });

        total += product.price * item.quantity;
        lines.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
          notes: item.notes,
        });
      }

      total = round2(total);
      const cogs = await consumeIngredientsForOrder(tx, lines);

      let changeGiven: number | null = null;
      if (isPaid && paymentMethod === "CASH" && cashReceived !== null) {
        if (cashReceived < total) {
          throw new ApiError(400, "El efectivo recibido es menor que el total");
        }
        changeGiven = round2(cashReceived - total);
      }

      return tx.order.create({
        data: {
          orderNumber,
          customerName,
          tableNumber,
          total,
          cogs,
          status: isPaid ? "PAID" : "PENDING",
          paymentMethod,
          cashReceived,
          changeGiven,
          items: { create: lines },
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          tableNumber: true,
          total: true,
          status: true,
          changeGiven: true,
          paymentMethod: true,
        },
      });
    });

    eventEmitter.emit(SSE_EVENTS.ORDER_CREATED, {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      tableNumber: order.tableNumber,
      total: order.total,
      status: order.status,
      changeGiven: order.changeGiven,
      createdAt: new Date().toISOString(),
    });

    if (order.status !== "PENDING") {
      eventEmitter.emit(SSE_EVENTS.ORDER_UPDATED, {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
      });
    }

    return Response.json({ ok: true, order }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/orders failed:", error);
    return Response.json(
      { error: "No se pudo guardar el pedido" },
      { status: 500 },
    );
  }
}
