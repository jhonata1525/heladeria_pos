"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";
import { getOpenRegisterSummary } from "@/lib/cash-register";
import { eventEmitter, SSE_EVENTS } from "@/lib/events";

export interface CajaActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

function readAmount(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").replace(",", ".").trim();
  if (raw.length === 0) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

async function requireOpenRegister() {
  return prisma.cashRegister.findFirst({ where: { status: "OPEN" } });
}

export async function openRegister(
  _prev: CajaActionState | null,
  formData: FormData,
): Promise<CajaActionState> {
  const initialAmount = readAmount(formData, "initialAmount");

  if (initialAmount === null || initialAmount < 0) {
    return { ok: false, error: "Ingresa un monto inicial válido." };
  }

  const existing = await requireOpenRegister();
  if (existing) {
    return { ok: false, error: "Ya existe un turno de caja abierto." };
  }

  await prisma.cashRegister.create({
    data: {
      openedAt: new Date(),
      initialAmount: round2(initialAmount),
      status: "OPEN",
    },
  });

  eventEmitter.emit(SSE_EVENTS.REGISTER_OPENED, {});

  revalidatePath("/caja");
  revalidatePath("/pos");
  return { ok: true, message: "Turno abierto correctamente. ¡Buen turno!" };
}

export async function addExpense(
  _prev: CajaActionState | null,
  formData: FormData,
): Promise<CajaActionState> {
  const description = String(formData.get("description") ?? "").trim();
  const amount = readAmount(formData, "amount");
  const category =
    String(formData.get("category") ?? "").trim() || "Otro";

  if (description.length === 0) {
    return { ok: false, error: "Describe el gasto." };
  }
  if (amount === null || amount <= 0) {
    return { ok: false, error: "Ingresa un monto válido para el gasto." };
  }

  const register = await requireOpenRegister();
  if (!register) {
    return { ok: false, error: "No hay un turno de caja abierto." };
  }

  await prisma.expense.create({
    data: {
      description,
      amount: round2(amount),
      category,
      cashRegisterId: register.id,
    },
  });

  revalidatePath("/caja");
  revalidatePath("/pos");
  return { ok: true, message: `Gasto registrado: ${description}` };
}

export async function closeRegister(
  _prev: CajaActionState | null,
  formData: FormData,
): Promise<CajaActionState> {
  const actualAmount = readAmount(formData, "actualAmount");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (actualAmount === null || actualAmount < 0) {
    return { ok: false, error: "Ingresa el efectivo contado en caja." };
  }

  const register = await requireOpenRegister();
  if (!register) {
    return { ok: false, error: "No hay un turno de caja abierto." };
  }

  const summary = await getOpenRegisterSummary();
  if (!summary || summary.id !== register.id) {
    return { ok: false, error: "No se pudo calcular el cierre. Intenta de nuevo." };
  }

  const difference = round2(actualAmount - summary.expectedCash);

  await prisma.cashRegister.update({
    where: { id: register.id },
    data: {
      closedAt: new Date(),
      expectedAmount: summary.expectedCash,
      actualAmount: round2(actualAmount),
      difference,
      status: "CLOSED",
      notes,
    },
  });

  eventEmitter.emit(SSE_EVENTS.REGISTER_CLOSED, {});

  revalidatePath("/caja");
  revalidatePath("/pos");

  if (difference === 0) {
    return { ok: true, message: "Cierre cuadrado. Caja exacta ✅" };
  }
  if (difference > 0) {
    return {
      ok: true,
      message: `Turno cerrado con SOBRANTE de ${difference.toFixed(2)}.`,
    };
  }
  return {
    ok: true,
    message: `Turno cerrado con FALTANTE de ${Math.abs(difference).toFixed(2)}.`,
  };
}
