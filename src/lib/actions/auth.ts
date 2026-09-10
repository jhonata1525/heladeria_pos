"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureDefaultUsers, loginUser, createSession, destroySession } from "@/lib/auth";

export interface LoginActionState {
  ok: boolean;
  error?: string;
}

const MAX_LOGIN_ATTEMPTS_PER_IP = 5;
const LOGIN_WINDOW_MS = 60 * 1000;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

interface IpAttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number;
}

const ipAttempts = new Map<string, IpAttemptRecord>();

function cleanupIpAttempts(): void {
  const now = Date.now();
  for (const [ip, record] of ipAttempts.entries()) {
    if (record.lockedUntil > 0 && record.lockedUntil < now) {
      ipAttempts.delete(ip);
    } else if (record.lockedUntil === 0 && now - record.firstAttempt > LOGIN_WINDOW_MS) {
      ipAttempts.delete(ip);
    }
  }
}

function getClientIp(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for");
  let ip = "unknown";
  
  if (forwarded) {
    ip = forwarded.split(",")[0].trim();
  } else {
    ip = headersList.get("x-real-ip") ?? "unknown";
  }
  
  // Normalize local IPs to a single value for consistent rate limiting
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") {
    return "local";
  }
  
  return ip;
}

function checkRateLimit(ip: string): { allowed: boolean; error?: string; retryAfter?: number } {
  cleanupIpAttempts();
  
  const now = Date.now();
  const record = ipAttempts.get(ip);
  
  if (!record) {
    ipAttempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return { allowed: true };
  }
  
  if (record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return { 
      allowed: false, 
      error: "Demasiados intentos de inicio de sesión. Inténtalo más tarde.",
      retryAfter 
    };
  }
  
  if (now - record.firstAttempt > LOGIN_WINDOW_MS) {
    ipAttempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return { allowed: true };
  }
  
  if (record.count >= MAX_LOGIN_ATTEMPTS_PER_IP) {
    const lockedUntil = now + LOCKOUT_DURATION_MS;
    ipAttempts.set(ip, { ...record, lockedUntil });
    return { 
      allowed: false, 
      error: "Demasiados intentos de inicio de sesión. Inténtalo más tarde.",
      retryAfter: LOCKOUT_DURATION_MS / 1000 
    };
  }
  
  record.count++;
  return { allowed: true };
}

function resetRateLimit(ip: string): void {
  ipAttempts.delete(ip);
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
