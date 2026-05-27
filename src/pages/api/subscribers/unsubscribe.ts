import type { APIRoute } from "astro";
import {
  hashEmail,
  htmlResponse,
  subscribersByEmailStore,
  subscribersStore,
  type Subscriber,
} from "../../../lib/subscribers";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token");
  if (!token) {
    return htmlResponse(
      `<h1>Missing token</h1><p>This unsubscribe link is incomplete.</p>`,
    );
  }

  const subs = subscribersStore();
  const sub = (await subs.get(token, { type: "json" })) as Subscriber | null;

  if (!sub) {
    // Idempotent — re-clicking the link after success works.
    return htmlResponse(
      `<h1>Already unsubscribed</h1><p>No record of this token exists. Nothing more to do.</p>`,
    );
  }

  const emailHash = await hashEmail(sub.email);
  const byEmail = subscribersByEmailStore();

  // Delete both the primary record and the by-email index in lockstep.
  // If either deletion fails, the other is left in place — manual
  // cleanup via the admin UI (PR-G).
  await subs.delete(token);
  await byEmail.delete(emailHash);

  return htmlResponse(
    `<h1>Unsubscribed</h1><p>Your record has been removed. No future emails will be sent. If you change your mind, sign up again at <a href="/blog">/blog</a>.</p>`,
  );
};
