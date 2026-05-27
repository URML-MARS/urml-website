// Subscribers — shared helpers for the public signup / confirm /
// unsubscribe endpoints. Lives in src/lib/ so the routes stay thin.
//
// Privacy posture (matches /privacy):
//   - Only what the user types: their email address
//   - No tracking pixels, no click tracking
//   - Resend is the email processor (third-party, disclosed)
//   - Retention: until they unsubscribe (or the project ends)
//
// Data shape per [project plan](../../../URML/MANIFESTO.md is not the
// right reference; the plan lives at C:\Users\Ido\.claude\plans\):
//
//   subscribers/<token>           — primary record
//   subscribers-by-email/<sha256> — secondary index for dedup
//
// Token is 32 random bytes, URL-safe base64. Used as both primary key
// and unsubscribe-link credential. Email is hashed (lowercase + trim)
// for the secondary index so the email itself does not become a key.

import { getStore } from "@netlify/blobs";

export interface Subscriber {
  token: string;
  email: string;
  created_at: string;
  confirmed_at?: string;
  unsubscribed_at?: string;
  status: "pending" | "confirmed" | "unsubscribed";
  source: "blog-form" | "manual";
  consent_text_version: string;
}

// Version this string whenever the signup CTA copy materially changes.
// Used to prove what a subscriber consented to at signup time.
export const CONSENT_TEXT_VERSION = "2026-05-27.v1";

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  // Pragmatic regex (no library). Catches obvious garbage; lets the
  // confirmation-email step weed out anything that survives.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // URL-safe base64 (RFC 4648 §5): replace +/= with -_ and strip pad.
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function subscribersStore() {
  return getStore("subscribers");
}

export function subscribersByEmailStore() {
  return getStore("subscribers-by-email");
}

export async function sendConfirmationEmail(
  email: string,
  token: string,
  siteUrl: string,
): Promise<boolean> {
  const confirmUrl = `${siteUrl}/api/subscribers/confirm?token=${encodeURIComponent(token)}`;
  const unsubscribeUrl = `${siteUrl}/api/subscribers/unsubscribe?token=${encodeURIComponent(token)}`;

  const text = [
    "Confirm your URML notes subscription.",
    "",
    `Click to confirm: ${confirmUrl}`,
    "",
    "If you did not sign up, ignore this email. No record stays without confirmation.",
    "",
    `To unsubscribe later: ${unsubscribeUrl}`,
  ].join("\n");

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:24px auto;padding:0 16px;line-height:1.6;color:#181715">
<p>Confirm your URML notes subscription.</p>
<p><a href="${confirmUrl}" style="color:#cc6b1f">Click here to confirm</a>.</p>
<p>If you did not sign up, ignore this email. No record stays without confirmation.</p>
<p style="font-size:13px;color:#8a857a;margin-top:24px">To unsubscribe later, use this link: <a href="${unsubscribeUrl}" style="color:#8a857a">${unsubscribeUrl}</a></p>
</body></html>`;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    console.error(
      "[subscribers] RESEND_API_KEY or RESEND_FROM not set; skipping email send. " +
      "This is expected before the operational prereqs in the plan are completed.",
    );
    return false;
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Confirm your URML notes subscription",
      text,
      html,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error(`[subscribers] Resend API ${resp.status}: ${body}`);
    return false;
  }
  return true;
}

// Shared minimal HTML response template for confirm / unsubscribe pages.
// Inline styles only; no external CSS so the page renders even if other
// asset routes fail. Robots meta noindex because these are token-bound.
export function htmlResponse(body: string): Response {
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>URML — Subscription</title>
<style>
body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 80px auto; padding: 0 24px; line-height: 1.6; color: #181715; background: #faf7f1; }
h1 { font-size: 28px; margin-bottom: 16px; color: #181715; }
a { color: #cc6b1f; }
.muted { margin-top: 32px; font-size: 14px; color: #8a857a; }
</style>
</head>
<body>
${body}
<p class="muted"><a href="/">urml.dev</a></p>
</body>
</html>`;
  return new Response(page, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
