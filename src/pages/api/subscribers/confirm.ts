import type { APIRoute } from "astro";
import {
  htmlResponse,
  subscribersStore,
  type Subscriber,
} from "../../../lib/subscribers";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token");
  if (!token) {
    return htmlResponse(
      `<h1>Missing token</h1><p>This confirmation link is incomplete. If you signed up recently, check the email and click the full link.</p>`,
    );
  }

  const subs = subscribersStore();
  const sub = (await subs.get(token, { type: "json" })) as Subscriber | null;

  if (!sub) {
    return htmlResponse(
      `<h1>Token not found</h1><p>This confirmation link is no longer valid. If you signed up recently, sign up again at <a href="/blog">/blog</a> and use the fresh link.</p>`,
    );
  }

  if (sub.status === "confirmed") {
    return htmlResponse(
      `<h1>Already confirmed</h1><p>You're on the list. Nothing more to do.</p>`,
    );
  }

  if (sub.status === "unsubscribed") {
    return htmlResponse(
      `<h1>Previously unsubscribed</h1><p>This token's subscription was unsubscribed earlier. Sign up again at <a href="/blog">/blog</a> to confirm a fresh subscription.</p>`,
    );
  }

  const updated: Subscriber = {
    ...sub,
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
  };
  await subs.setJSON(token, updated);

  return htmlResponse(
    `<h1>Confirmed</h1><p>You're on the list. The digest will arrive when there are posts to summarize, and not before. Cadence is irregular while the project is small. To unsubscribe at any time, the link is in every email.</p>`,
  );
};
