import type { APIRoute } from "astro";
import { writeAudit } from "../../../../lib/audit";
import { deleteDraft, getDraft, updateDraft, type DraftPatch } from "../../../../lib/drafts";
import { getQueueItem, updateQueueItem } from "../../../../lib/queue";

export const prerender = false;

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  "Vendor",
  "Research",
  "Regulation",
  "Ecosystem",
  "Engineering",
  "URML",
]);

const VALID_ANGLES: ReadonlySet<string> = new Set(["explicit", "implicit", "none"]);

// GET /api/admin/drafts/[id]
export const GET: APIRoute = async ({ params }) => {
  const id = String(params.id || "");
  const draft = await getDraft(id);
  if (!draft) return json({ error: "not found" }, 404);
  return json({ draft });
};

// PATCH /api/admin/drafts/[id] — edit title / summary / body / tags /
// category / angle. Marks status "edited" if currently "fresh".
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const admin = locals.adminUser;
  if (!admin) return json({ error: "unauthorized" }, 401);

  const id = String(params.id || "");
  const before = await getDraft(id);
  if (!before) return json({ error: "not found" }, 404);
  if (before.status === "published") {
    return json({ error: "cannot edit a published draft" }, 409);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const patch: DraftPatch = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return json({ error: "title cannot be empty" }, 400);
    patch.title = t;
  }
  if (typeof body.summary === "string") {
    patch.summary = body.summary.trim().slice(0, 220);
  }
  if (typeof body.body_markdown === "string") {
    patch.body_markdown = body.body_markdown;
  }
  if (Array.isArray(body.suggested_tags)) {
    patch.suggested_tags = body.suggested_tags
      .filter((t): t is string => typeof t === "string" && t.trim() !== "")
      .map((t) => t.trim().toLowerCase())
      .slice(0, 8);
  }
  if (typeof body.suggested_category === "string") {
    if (!VALID_CATEGORIES.has(body.suggested_category)) {
      return json({ error: `invalid category: ${body.suggested_category}` }, 400);
    }
    patch.suggested_category = body.suggested_category as DraftPatch["suggested_category"];
  }
  if (typeof body.urml_angle === "string") {
    if (!VALID_ANGLES.has(body.urml_angle)) {
      return json({ error: `invalid urml_angle: ${body.urml_angle}` }, 400);
    }
    patch.urml_angle = body.urml_angle as DraftPatch["urml_angle"];
  }

  if (before.status === "fresh") {
    patch.status = "edited";
  }

  const updated = await updateDraft(id, patch);
  if (!updated) return json({ error: "not found" }, 404);

  await writeAudit({
    actor: admin.login,
    actor_id: admin.id,
    action: "draft.update",
    target: id,
    before,
    after: updated,
  }).catch(() => {});

  return json({ draft: updated });
};

// DELETE /api/admin/drafts/[id] — discard. If the queue item still
// points at this draft, flip it back to "pending" and clear draft_id.
export const DELETE: APIRoute = async ({ params, locals }) => {
  const admin = locals.adminUser;
  if (!admin) return json({ error: "unauthorized" }, 401);

  const id = String(params.id || "");
  const draft = await getDraft(id);
  if (!draft) return json({ error: "not found" }, 404);
  if (draft.status === "published") {
    return json({ error: "cannot delete a published draft" }, 409);
  }

  await deleteDraft(id);

  // Unlink the queue item if it still references this draft.
  if (draft.queue_id) {
    const queueItem = await getQueueItem(draft.queue_id);
    if (queueItem && queueItem.draft_id === id) {
      await updateQueueItem(draft.queue_id, { status: "pending", draft_id: undefined });
    }
  }

  await writeAudit({
    actor: admin.login,
    actor_id: admin.id,
    action: "draft.discard",
    target: id,
    before: draft,
  }).catch(() => {});

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
