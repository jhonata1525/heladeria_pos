import { getCurrentUser } from "@/lib/auth-server";
import type { SessionUser } from "@/lib/auth";

export type AdminApiResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: Response };

export async function requireAdminApi(): Promise<AdminApiResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      ok: false,
      response: Response.json({ error: "No autorizado" }, { status: 403 }),
    };
  }

  return { ok: true, user };
}
