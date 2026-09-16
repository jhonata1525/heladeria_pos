import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSessionToken, type SessionUser } from "@/lib/auth";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "heladeria_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production-min-32-chars"
);
const JWT_ISSUER = "heladeria-pos";
const JWT_AUDIENCE = "heladeria-pos-client";

export async function ensureDefaultUsers(): Promise<void> {
  const count = await prisma.user.count();
  if (count > 0) return;

  const adminHash = await hashPassword("admin123");
  const cashierHash = await hashPassword("cajera123");

  await prisma.user.createMany({
    data: [
      {
        name: "Administrador",
        email: "admin@heladeria.com",
        passwordHash: adminHash,
        role: "ADMIN",
      },
      {
        name: "Cajera",
        email: "cajera@heladeria.com",
        passwordHash: cashierHash,
        role: "CASHIER",
      },
    ],
  });
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return verifySessionTokenWithDb(token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/pos");
  return user;
}

async function verifySessionTokenWithDb(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) return null;

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: SessionUser;
}

export async function loginUser(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    await logAudit(null, "LOGIN_FAILED", "User", null, { email: normalizedEmail, reason: "User not found" }, ipAddress, userAgent);
    return { success: false, error: "Credenciales incorrectas" };
  }

  if (!user.isActive) {
    await logAudit(user.id, "LOGIN_FAILED", "User", user.id, { reason: "Account disabled" }, ipAddress, userAgent);
    return { success: false, error: "Cuenta desactivada" };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await logAudit(user.id, "LOGIN_FAILED", "User", user.id, { reason: "Account locked" }, ipAddress, userAgent);
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { success: false, error: `Cuenta bloqueada. Intenta en ${minutesLeft} minutos.` };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    const attempts = user.failedLoginAttempts + 1;
    const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };
    
    if (attempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await logAudit(user.id, "LOGIN_FAILED", "User", user.id, { 
      reason: "Invalid password", 
      attempts 
    }, ipAddress, userAgent);

    if (attempts >= 5) {
      return { success: false, error: `Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.` };
    }
    
    return { success: false, error: `Credenciales incorrectas. Intentos restantes: ${5 - attempts}` };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  await logAudit(user.id, "LOGIN_SUCCESS", "User", user.id, {}, ipAddress, userAgent);

  return { 
    success: true, 
    user: { id: user.id, name: user.name, email: user.email, role: user.role } 
  };
}

export async function logAudit(
  userId: number | null,
  action: string,
  entity: string,
  entityId: number | null,
  details: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? 0,
        action,
        entity,
        entityId,
        details: JSON.stringify(details),
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
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

export function getClientIp(headersList: Headers): string {
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

export function checkRateLimit(ip: string): { allowed: boolean; error?: string; retryAfter?: number } {
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

export function resetRateLimit(ip: string): void {
  ipAttempts.delete(ip);
}