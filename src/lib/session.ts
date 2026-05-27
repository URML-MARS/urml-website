// Session — HMAC-signed cookie for the admin area.
//
// Format: <base64url(JSON payload)> "." <base64url(HMAC-SHA256(payload))>
//
// Payload: { id: number, login: string, exp: number } where `exp` is
// Unix seconds. The MAC is verified before the JSON is trusted. Tampering
// breaks the signature; an expired session is rejected even with a valid
// signature.
//
// All crypto via Web Crypto API. No `jose` dep. Same code runs on Node
// (Netlify Functions) and Deno (Netlify Edge Functions); if we ever move
// the guard to an edge function, this module ports cleanly.

const TEXT = new TextEncoder();
const SECRET_ENV = "SESSION_SECRET";

export const SESSION_COOKIE_NAME = "urml_session";
export const STATE_COOKIE_NAME = "urml_oauth_state";
export const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export interface SessionPayload {
  id: number;
  login: string;
  exp: number;
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env[SECRET_ENV];
  if (!secret) {
    throw new Error(
      `[session] ${SECRET_ENV} not set in environment. Generate with ` +
        `\`openssl rand -base64 32\` and set on Netlify.`,
    );
  }
  return crypto.subtle.importKey(
    "raw",
    TEXT.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const json = JSON.stringify(full);
  const body = base64url(TEXT.encode(json));
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, TEXT.encode(body));
  return `${body}.${base64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  value: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const body = value.slice(0, dot);
  const sigB64 = value.slice(dot + 1);

  let sig: Uint8Array;
  try {
    sig = base64urlDecode(sigB64);
  } catch {
    return null;
  }

  let key: CryptoKey;
  try {
    key = await getKey();
  } catch {
    return null;
  }

  const ok = await crypto.subtle.verify("HMAC", key, sig, TEXT.encode(body));
  if (!ok) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
    return null;
  }
  if (typeof payload.id !== "number" || typeof payload.login !== "string") {
    return null;
  }
  return payload;
}

// Cookie helpers — build Set-Cookie header values. HttpOnly, Secure,
// SameSite=Lax (allows top-level GET nav after OAuth redirect; CSRF
// protection still holds for POST). Path=/ so the session is valid on
// all admin and API routes.

export function sessionCookieHeader(
  value: string,
  maxAgeSeconds: number = SESSION_TTL_SECONDS,
): string {
  return [
    `${SESSION_COOKIE_NAME}=${value}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

export function clearSessionCookieHeader(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

export function stateCookieHeader(value: string, maxAgeSeconds: number = 600): string {
  return [
    `${STATE_COOKIE_NAME}=${value}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/api/admin/auth",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

export function clearStateCookieHeader(): string {
  return [
    `${STATE_COOKIE_NAME}=`,
    "Max-Age=0",
    "Path=/api/admin/auth",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

// Parse a cookie header into a Map. Tolerates missing/malformed headers.
export function parseCookies(header: string | null | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) out.set(name, value);
  }
  return out;
}
