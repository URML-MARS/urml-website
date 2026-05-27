import type { APIRoute } from "astro";
import { writeAudit } from "../../../../lib/audit";
import {
  createQueueItem,
  listQueue,
  sanitizeRefs,
  sanitizeVideos,
} from "../../../../lib/queue";

export const prerender = false;

// GET /api/admin/queue → list all queue items.
export const GET: APIRoute = async () => {
  const items = await listQueue();
  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};

// POST /api/admin/queue → create a new queue item.
export const POST: APIRoute = async ({ request, locals }) => {
  const admin = locals.adminUser;
  if (!admin) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid JSON body");
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic) return badRequest("topic is required");
  if (topic.length > 200) return badRequest("topic exceeds 200 characters");

  const notes = typeof body.notes === "string" ? body.notes.slice(0, 4000) : "";
  const refs = sanitizeRefs(body.refs);
  const videos = sanitizeVideos(body.videos);

  const item = await createQueueItem({
    topic,
    notes,
    refs,
    videos,
    created_by: admin.login,
  });

  await writeAudit({
    actor: admin.login,
    actor_id: admin.id,
    action: "queue.create",
    target: item.id,
    after: item,
  }).catch((err) => console.warn("[queue] audit write failed:", err));

  return new Response(JSON.stringify({ item }), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
