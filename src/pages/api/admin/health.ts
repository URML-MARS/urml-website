import type { APIRoute } from "astro";

export const prerender = false;

// Eyeball test after each deploy: does the auth gate still work?
// Visit /api/admin/health while signed in → see your GitHub login.
// Hit it logged-out → middleware 401s before this handler runs.
export const GET: APIRoute = ({ locals }) => {
  const admin = locals.adminUser;
  if (!admin) {
    // Middleware should have blocked us already; defensive 401.
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(
    JSON.stringify({
      ok: true,
      authenticated_as: {
        github_id: admin.id,
        github_login: admin.login,
      },
      time: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
};
