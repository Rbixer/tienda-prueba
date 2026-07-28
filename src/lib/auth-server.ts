import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Session, StoreData, User } from "@/lib/types";
import { normalizeAllowedBranchIds, normalizePermissions } from "@/lib/permissions";

export const SESSION_COOKIE = "tb_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

/** Intentos de login por IP (memoria del proceso). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_MAX = 12;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] SESSION_SECRET ausente o corto; usa un secreto fuerte en producción.",
    );
  }
  return secret || "tienda-barrio-dev-secret-change-me";
}

export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  if (!stored) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  // Migración: comparación legacy en claro (solo hasta hashear)
  return stored === plain;
}

export function validateNewPassword(password: string): string | null {
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

export { MIN_PASSWORD_LENGTH };

type TokenPayload = {
  userId: string;
  exp: number;
  iat: number;
};

function b64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(value: string): Buffer {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function signSessionToken(userId: string, ttlMs = SESSION_TTL_MS): string {
  const now = Date.now();
  const payload: TokenPayload = {
    userId,
    iat: now,
    exp: now + ttlMs,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest();
  return `${body}.${b64url(sig)}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest();
  let actual: Buffer;
  try {
    actual = fromB64url(sig);
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as TokenPayload;
    if (!payload?.userId || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSec = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(maxAgeSec),
  };
}

export async function setSessionCookie(userId: string): Promise<string> {
  const token = signSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  return token;
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
}

export async function readSessionTokenFromRequest(
  request?: Request,
): Promise<string | null> {
  const header = request?.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const t = header.slice(7).trim();
    if (t) return t;
  }
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export function sessionFromStoreUser(
  user: User,
  branchId?: string,
): Session {
  const permissions = normalizePermissions(user.role, user.permissions);
  const allowedBranchIds = normalizeAllowedBranchIds(
    user.role,
    user.branchId,
    user.allowedBranchIds,
  );
  let active = branchId ?? user.branchId;
  if (user.role === "administrador") {
    if (allowedBranchIds.length > 0 && !allowedBranchIds.includes(active)) {
      active = allowedBranchIds[0] ?? user.branchId;
    }
  } else if (!allowedBranchIds.includes(active)) {
    active = allowedBranchIds[0] ?? user.branchId;
  }
  return {
    userId: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    branchId: active,
    allowedBranchIds,
    permissions,
  };
}

export async function getAuthUser(
  store: StoreData,
  request?: Request,
): Promise<{ user: User; payload: TokenPayload } | null> {
  const token = await readSessionTokenFromRequest(request);
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = store.users.find((u) => u.id === payload.userId);
  if (!user) return null;
  return { user, payload };
}

export function checkLoginRateLimit(ip: string): string | null {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return null;
  }
  entry.count += 1;
  if (entry.count > LOGIN_MAX) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  return null;
}

export function clearLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}
