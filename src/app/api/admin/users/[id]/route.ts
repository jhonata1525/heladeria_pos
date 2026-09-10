import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength, logAudit } from "@/lib/auth";

async function getAuth(): Promise<{ userId: number; role: string } | null> {
  const store = await cookies();
  const raw = store.get("heladeria_session")?.value;
  if (!raw) return null;
  const userId = Number(raw);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });
  return user?.isActive ? { userId, role: user.role } : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuth();
  if (!auth || auth.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ error: "Usuario inválido" }, { status: 400 });
    }

    if (userId === auth.userId) {
      return Response.json({ error: "No puedes modificarte a ti mismo" }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, password, role, isActive } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existing && existing.id !== userId) {
        return Response.json({ error: "El correo ya está en uso" }, { status: 400 });
      }
      updateData.email = email.toLowerCase();
    }
    if (role !== undefined) {
      if (!["CASHIER", "ADMIN"].includes(role)) {
        return Response.json({ error: "Rol inválido" }, { status: 400 });
      }
      updateData.role = role;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return Response.json({ error: "Contraseña débil: " + passwordValidation.errors.join(", ") }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, updatedAt: true },
    });

    await logAudit(auth.userId, "USER_UPDATED", "User", userId, updateData, undefined, undefined);

    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] failed:", error);
    return Response.json({ error: "No se pudo actualizar el usuario" }, { status: 500 });
  }
}