import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { hashPassword, validatePasswordStrength, logAudit } from "@/lib/auth";

async function getAuth(): Promise<{ userId: number; role: string } | null> {
  const store = await cookies();
  const token = store.get("heladeria_session")?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const userId = payload.id;
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });

  return user?.isActive ? { userId, role: user.role } : null;
}

export async function GET() {
  const auth = await getAuth();
  if (!auth || auth.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return Response.json(users);
}

export async function POST(request: NextRequest) {
  const auth = await getAuth();
  if (!auth || auth.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role, isActive } = body;

    if (!name || !email || !password) {
      return Response.json({ error: "Nombre, correo y contraseña son obligatorios" }, { status: 400 });
    }

    if (!["CASHIER", "ADMIN"].includes(role)) {
      return Response.json({ error: "Rol inválido" }, { status: 400 });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return Response.json({ error: "Contraseña débil: " + passwordValidation.errors.join(", ") }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return Response.json({ error: "El correo ya está registrado" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        isActive: isActive ?? true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await logAudit(auth.userId, "USER_CREATED", "User", user.id, { name, email, role }, undefined, undefined);

    return Response.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/users failed:", error);
    return Response.json({ error: "No se pudo crear el usuario" }, { status: 500 });
  }
}