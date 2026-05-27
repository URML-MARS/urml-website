import type { APIRoute } from "astro";
import {
  CONSENT_TEXT_VERSION,
  generateToken,
  hashEmail,
  sendConfirmationEmail,
  subscribersByEmailStore,
  subscribersStore,
  validateEmail,
  type Subscriber,
} from "../../../lib/subscribers";

// SSR endpoint. Hybrid mode default is prerender for endpoints — making
// explicit here for clarity.
export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  const siteUrl = process.env.SITE_URL || url.origin;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("invalid form data", { status: 400 });
  }

  // Honeypot — silently 303 to the thank-you page so a bot can't tell
  // it was filtered. Real users never fill `bot-field` because it's
  // hidden via CSS in SignupForm.astro.
  const honeypot = form.get("bot-field");
  if (honeypot && String(honeypot).trim() !== "") {
    return Response.redirect(`${siteUrl}/subscribed`, 303);
  }

  // Origin check (defensive depth). Same-origin form posts have an
  // Origin header on modern browsers; cross-origin attempts get 403.
  // Tolerate missing Origin (some old browsers / direct curl tests).
  const origin = request.headers.get("Origin");
  if (origin && origin !== siteUrl) {
    return new Response("forbidden origin", { status: 403 });
  }

  const email = String(form.get("email") || "").trim();
  if (!validateEmail(email)) {
    return new Response("invalid email", { status: 400 });
  }

  // Dedupe via the by-email secondary index. If the user is already in
  // the system (any status), we silently 303 to /subscribed without
  // creating a new token. Avoids leaking the fact that we know this
  // email and prevents the unsubscribe-link from being re-issued.
  const emailHash = await hashEmail(email);
  const byEmail = subscribersByEmailStore();
  const existing = (await byEmail.get(emailHash, { type: "json" })) as
    | { token: string }
    | null;

  if (existing) {
    return Response.redirect(`${siteUrl}/subscribed`, 303);
  }

  const token = generateToken();
  const now = new Date().toISOString();

  const subscriber: Subscriber = {
    token,
    email,
    created_at: now,
    status: "pending",
    source: "blog-form",
    consent_text_version: CONSENT_TEXT_VERSION,
  };

  const subs = subscribersStore();
  await subs.setJSON(token, subscriber);
  await byEmail.setJSON(emailHash, { token });

  const sent = await sendConfirmationEmail(email, token, siteUrl);
  if (!sent) {
    // Don't expose internal failure. The record exists; if the email
    // didn't send the founder will see it in Function logs and can
    // resend. During PR-B's stand-up phase (before RESEND_API_KEY is
    // configured) every signup will hit this branch.
    console.warn(`[subscribers] confirmation email failed for ${email}`);
  }

  return Response.redirect(`${siteUrl}/subscribed`, 303);
};
