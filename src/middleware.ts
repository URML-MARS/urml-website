// Auth gate for /admin/* and /api/admin/*. Astro middleware runs for
// every SSR request (static pages bypass it entirely). Whitelisted paths
// (the login page and the OAuth start/callback) skip the auth check.
//
// On valid session: sets `locals.adminUser`; downstream API routes use
// this to attribute audit entries.
//
// On invalid/missing session:
//   - HTML routes (/admin/*) → 302 to /admin/login
//   - API routes (/api/admin/*) → 401 JSON { error: "unauthorized" }

import { defineMiddleware } from "astro:middleware";
import { parseCookies, SESSION_COOKIE_NAME, verifySession } from "./lib/session";

const PUBLIC_AUTH_PATHS = [
  "/admin/login",
  "/api/admin/auth/start",
  "/api/admin/auth/callback",
];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const isAdminHtml = path.startsWith("/admin/") || path === "/admin";
  const isAdminApi = path.startsWith("/api/admin/");

  // Non-admin routes bypass entirely.
  if (!isAdminHtml && !isAdminApi) {
    return next();
  }

  // Login + OAuth start/callback pages: no auth required.
  if (PUBLIC_AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return next();
  }

  // Read and verify the session cookie.
  const cookieHeader = context.request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const raw = cookies.get(SESSION_COOKIE_NAME);
  const session = await verifySession(raw);

  if (!session) {
    if (isAdminApi) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }
    return context.redirect("/admin/login", 302);
  }

  context.locals.adminUser = { id: session.id, login: session.login };
  return next();
});
