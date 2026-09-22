// Tek şifreli oturum. Token: `<issuedAtMs>.<base64url HMAC-SHA256(issuedAtMs)>`.
// Edge (middleware) ve Node'da çalışır → sadece Web Crypto (`crypto.subtle`), Node `crypto` yok.

export const SESSION_COOKIE = "lr_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 gün
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
// İleri tarihli token'lara saat kayması toleransı
const CLOCK_SKEW_MS = 60 * 1000;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Uzunluk dışında içerikten bağımsız süre ile karşılaştırır. */
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(sig);
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function signSession(secret: string, issuedAtMs: number = Date.now()): Promise<string> {
  const payload = String(Math.floor(issuedAtMs));
  const sig = await hmac(secret, payload);
  return `${payload}.${toBase64Url(sig)}`;
}

export async function verifySession(
  token: string | undefined | null,
  secret: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const payload = token.slice(0, dot);
  if (!/^\d{1,16}$/.test(payload)) return false;
  const provided = fromBase64Url(token.slice(dot + 1));
  if (!provided) return false;

  const expected = await hmac(secret, payload);
  if (!timingSafeEqualBytes(provided, expected)) return false;

  const issuedAt = Number(payload);
  if (issuedAt > nowMs + CLOCK_SKEW_MS) return false;
  return nowMs - issuedAt < SESSION_MAX_AGE_MS;
}

/** Şifreleri SHA-256 özetleri üzerinden sabit zamanlı karşılaştırır (uzunluk sızdırmaz). */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  return timingSafeEqualBytes(a, b);
}

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
}

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}
