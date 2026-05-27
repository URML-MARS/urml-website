import type { APIRoute } from "astro";
import { isAllowed, recordLogin } from "../../../../lib/admins";
import {
  clearStateCookieHeader,
  parseCookies,
  sessionCookieHeader,
  signSession,
  STATE_COOKIE_NAME,
} from "../../../../lib/session";

export const prerender = false;

// Step 2 of the OAuth flow. GitHub redirects here with ?code=...&state=...
// after the user authorizes. We:
//   1. Compare state from URL to state cookie (CSRF check).
//   2. Exchange the code for a GitHub access token.
//   3. Fetch /user to get numeric id + login.
//   4. Check allowlist (ADMIN_GITHUB_ID env var OR admins/<id> Blob).
//   5. Mint a session cookie and redirect to /admin.
//
// On any failure, render a plain 403 page; never leak which step failed.

export const GET: APIRoute = async ({ url, request }) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response(
      "Misconfigured: GITHUB_OAUTH_CLIENT_ID or GITHUB_OAUTH_CLIENT_SECRET not set.",
      { status: 500 },
    );
  }
  const siteUrl = process.env.SITE_URL || url.origin;

  // 1. State check (CSRF).
  const cookies = parseCookies(request.headers.get("cookie"));
  const expectedState = cookies.get(STATE_COOKIE_NAME);
  const givenState = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  if (!code || !givenState || !expectedState || givenState !== expectedState) {
    return forbidden("State check failed. Restart from /admin/login.");
  }

  // 2. Exchange code for access token.
  const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${siteUrl}/api/admin/auth/callback`,
    }),
  });
  if (!tokenResp.ok) {
    return forbidden("Token exchange failed.");
  }
  const tokenBody = (await tokenResp.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenBody.access_token) {
    return forbidden("Token exchange returned no access_token.");
  }

  // 3. Fetch /user.
  const userResp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenBody.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "urml-admin",
    },
  });
  if (!userResp.ok) {
    return forbidden("GitHub /user fetch failed.");
  }
  const userBody = (await userResp.json()) as { id?: number; login?: string };
  if (typeof userBody.id !== "number" || typeof userBody.login !== "string") {
    return forbidden("GitHub /user response malformed.");
  }

  // 4. Allowlist check.
  if (!(await isAllowed(userBody.id))) {
    // TODO PR-D: write an audit/<timestamp> Blob entry capturing this attempt.
    console.warn(
      `[admin-auth] denied: github_id=${userBody.id} login=${userBody.login}`,
    );
    return forbidden(
      `Access denied for GitHub user "${userBody.login}". ` +
        `Only the maintainer's allowlisted GitHub account can sign in.`,
    );
  }

  // 5. Mint session, record login, redirect to /admin.
  await recordLogin(userBody.id).catch((err) => {
    console.warn("[admin-auth] recordLogin failed (non-fatal):", err);
  });
  const session = await signSession({ id: userBody.id, login: userBody.login });

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin",
      "Set-Cookie": [sessionCookieHeader(session), clearStateCookieHeader()].join(", "),
      "Cache-Control": "no-store",
    },
  });
};

function forbidden(message: string): Response {
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>URML — Access denied</title>
<style>
body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 80px auto; padding: 0 24px; line-height: 1.6; color: #181715; background: #faf7f1; }
h1 { font-size: 28px; margin-bottom: 16px; }
a { color: #cc6b1f; }
code { background: #f0ece0; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
.muted { margin-top: 32px; font-size: 14px; color: #8a857a; }
</style>
</head>
<body>
<h1>Access denied</h1>
<p>${message}</p>
<p class="muted"><a href="/admin/login">Try again</a> · <a href="/">urml.dev</a></p>
</body>
</html>`;
  return new Response(page, {
    status: 403,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": clearStateCookieHeader(),
    },
  });
}
