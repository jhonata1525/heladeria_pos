import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "heladeria_session";
const BCRYPT_ROUNDS = 12;
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
    const { payload } = await jwtVerify<JWTPayload>(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;

    return { id: userId, name: payload.name, email: payload.email, role: payload.role };
  } catch {
    return null;
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