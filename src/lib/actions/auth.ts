"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureDefaultUsers, loginUser, createSession, destroySession, getClientIp, checkRateLimit, resetRateLimit } from "@/lib/auth-server";

export interface LoginActionState {
  ok: boolean;
  error?: string;
}

export async function login(
  _prev: LoginActionState | null,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (email.length === 0 || password.length === 0) {
    return { ok: false, error: "Ingresa tu correo y contraseña." };
  }

  await ensureDefaultUsers();

  const headersList = await headers();
  const ipAddress = getClientIp(headersList);
  const userAgent = headersList.get("user-agent") ?? "unknown";

  const rateLimit = checkRateLimit(ipAddress);
  if (!rateLimit.allowed) {
    return { ok: false, error: rateLimit.error };
  }

  const result = await loginUser(email, password, ipAddress, userAgent);
  
  if (!result.success || !result.user) {
    return { ok: false, error: result.error ?? "Error de autenticación" };
  }

  resetRateLimit(ipAddress);
  
  await createSession(result.user);
  redirect("/pos");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
