import type { APIRoute } from "astro";
import { generateNonce, stateCookieHeader } from "../../../../lib/session";

export const prerender = false;

// Step 1 of the OAuth flow. Generates a random state nonce, stores it
// in a short-lived HttpOnly cookie, and 302s the user to GitHub's
// authorize URL. The callback rejects if state doesn't match — CSRF
// protection on the OAuth flow itself.
export const GET: APIRoute = ({ url }) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response(
      "Misconfigured: GITHUB_OAUTH_CLIENT_ID is not set. " +
        "Configure on Netlify and redeploy.",
      { status: 500 },
    );
  }

  const siteUrl = process.env.SITE_URL || url.origin;
  const redirectUri = `${siteUrl}/api/admin/auth/callback`;
  const state = generateNonce();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user",
    state,
    allow_signup: "false",
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      "Set-Cookie": stateCookieHeader(state),
      "Cache-Control": "no-store",
    },
  });
};
