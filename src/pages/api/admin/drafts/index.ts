import type { APIRoute } from "astro";
import { listDrafts } from "../../../../lib/drafts";

export const prerender = false;

// GET /api/admin/drafts → list all drafts (any status), newest first.
export const GET: APIRoute = async () => {
  const drafts = await listDrafts();
  return new Response(JSON.stringify({ drafts }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
