import type { APIRoute } from "astro";
import { clearSessionCookieHeader } from "../../../../lib/session";

export const prerender = false;

// Logout. Clears the session cookie, redirects to /. POST only (a GET
// logout would be vulnerable to logout-CSRF via <img src> etc.; not a
// dangerous attack but easy to avoid).
export const POST: APIRoute = () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": clearSessionCookieHeader(),
      "Cache-Control": "no-store",
    },
  });
};
