import type { APIRoute } from "astro";
import { writeAudit } from "../../../../lib/audit";
import {
  deleteQueueItem,
  getQueueItem,
  sanitizeRefs,
  sanitizeVideos,
  updateQueueItem,
  type QueueStatus,
  type UpdatePatch,
} from "../../../../lib/queue";

export const prerender = false;

const VALID_STATUS: ReadonlySet<QueueStatus> = new Set([
  "pending",
  "drafted",
  "published",
  "archived",
]);

// GET /api/admin/queue/[id] → return one item.
export const GET: APIRoute = async ({ params }) => {
  const id = String(params.id || "");
  const item = await getQueueItem(id);
  if (!item) return notFound();
  return json({ item });
};

// PATCH /api/admin/queue/[id] → update.
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const admin = locals.adminUser;
  if (!admin) return unauthorized();

  const id = String(params.id || "");
  const before = await getQueueItem(id);
  if (!before) return notFound();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid JSON body");
  }

  const patch: UpdatePatch = {};

  if (typeof body.topic === "string") {
    const t = body.topic.trim();
    if (!t) return badRequest("topic cannot be empty");
    if (t.length > 200) return badRequest("topic exceeds 200 characters");
    patch.topic = t;
  }
  if (typeof body.notes === "string") {
    patch.notes = body.notes.slice(0, 4000);
  }
  if (body.refs !== undefined) {
    patch.refs = sanitizeRefs(body.refs);
  }
  if (body.videos !== undefined) {
    patch.videos = sanitizeVideos(body.videos);
  }
  if (typeof body.status === "string") {
    if (!VALID_STATUS.has(body.status as QueueStatus)) {
      return badRequest(`invalid status: ${body.status}`);
    }
    patch.status = body.status as QueueStatus;
  }

  const updated = await updateQueueItem(id, patch);
  if (!updated) return notFound();

  await writeAudit({
    actor: admin.login,
    actor_id: admin.id,
    action: "queue.update",
    target: id,
    before,
    after: updated,
  }).catch((err) => console.warn("[queue] audit write failed:", err));

  return json({ item: updated });
};

// DELETE /api/admin/queue/[id].
export const DELETE: APIRoute = async ({ params, locals }) => {
  const admin = locals.adminUser;
  if (!admin) return unauthorized();

  const id = String(params.id || "");
  const before = await deleteQueueItem(id);
  if (!before) return notFound();

  await writeAudit({
    actor: admin.login,
    actor_id: admin.id,
    action: "queue.delete",
    target: id,
    before,
  }).catch((err) => console.warn("[queue] audit write failed:", err));

  return json({ deleted: true, id });
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function notFound(): Response {
  return json({ error: "not found" }, 404);
}

function unauthorized(): Response {
  return json({ error: "unauthorized" }, 401);
}

function badRequest(message: string): Response {
  return json({ error: message }, 400);
}
