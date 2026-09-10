import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { UsuariosClient } from "./UsuariosClient";

export const metadata = { title: "Usuarios · Heladería POS" };

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
      users={users as any}
      auditLogs={auditLogs as any}
    />
  );
}