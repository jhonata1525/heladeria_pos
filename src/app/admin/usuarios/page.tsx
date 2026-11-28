import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-server";
import { UsuariosClient } from "./UsuariosClient";

export const metadata = { title: "Usuarios · Heladitos Dani" };

export default async function UsuariosPage() {
  await requireAdmin();

  const [users, auditLogs] = await Promise.all([
    prisma.user.findMany({
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
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <UsuariosClient
      users={users.map((user) => ({
        ...user,
        lockedUntil: user.lockedUntil?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      }))}
      auditLogs={auditLogs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      }))}
    />
  );
}