import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "heladeria_session";
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production-min-32-chars"
);
const JWT_ISSUER = "heladeria-pos";
const JWT_AUDIENCE = "heladeria-pos-client";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type JWTPayload = {
  sub: string;
  name: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

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

export async function createSessionToken(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_MAX_AGE;

  const token = await new SignJWT({
    sub: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
  } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(exp)
    .sign(JWT_SECRET);

  return token;
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
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

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return verifySessionToken(token);
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
    
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await logAudit(user.id, "LOGIN_FAILED", "User", user.id, { 
      reason: "Invalid password", 
      attempts 
    }, ipAddress, userAgent);

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      return { success: false, error: `Demasiados intentos fallidos. Cuenta bloqueada por ${LOCKOUT_DURATION_MINUTES} minutos.` };
    }
    
    return { success: false, error: `Credenciales incorrectas. Intentos restantes: ${MAX_LOGIN_ATTEMPTS - attempts}` };
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

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) errors.push("Mínimo 8 caracteres");
  if (!/[A-Z]/.test(password)) errors.push("Al menos una mayúscula");
  if (!/[a-z]/.test(password)) errors.push("Al menos una minúscula");
  if (!/[0-9]/.test(password)) errors.push("Al menos un número");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push("Al menos un carácter especial");
  
  return { valid: errors.length === 0, errors };
}