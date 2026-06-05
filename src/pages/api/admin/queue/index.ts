import type { APIRoute } from "astro";
import { writeAudit } from "../../../../lib/audit";
import { getDraft } from "../../../../lib/drafts";
import {
  createQueueItem,
  listQueue,
  sanitizeRefs,
  sanitizeVideos,
  updateQueueItem,
  type QueueItem,
  type UpdatePatch,
} from "../../../../lib/queue";

export const prerender = false;

// A queue item's status + draft_id is denormalized from the drafts store
// and written in a separate step on generate / discard / publish. Any
// partial failure (a dropped Blob write, the best-effort post-commit queue
// update on publish, a throw between deleteDraft and the queue reset on
// discard) strands the queue item as "drafted" while its draft is gone,
// discarded, or already published. The result is a topic that shows a
// "View draft →" link to a draft that the Drafts list does not contain.
//
// Treat the drafts store as the source of truth on read: for any "drafted"
// item, look up its draft and correct the queue item to match. The write
// is best-effort — even if it fails we hand the corrected view to the
// client so the UI is honest this request, and the next load retries.
async function reconcileDrafted(item: QueueItem): Promise<QueueItem> {
  if (item.status !== "drafted") return item;

  const draft = item.draft_id ? await getDraft(item.draft_id) : null;

  // Draft exists and is still reviewable: the "drafted" status is correct.
  if (draft && (draft.status === "fresh" || draft.status === "edited")) {
    return item;
  }

  let patch: UpdatePatch;
  if (draft && draft.status === "published") {
    // Publish committed the post and flipped the draft, but the queue
    // update was lost. A published draft with no slug is a genuinely
    // inconsistent record we should surface, not mask, so leave it.
    if (!draft.published_slug) return item;
    patch = { status: "published", published_slug: draft.published_slug };
  } else {
    // Draft missing or discarded: there is nothing to approve. Return the
    // topic to pending so the card offers "Generate draft" instead of a
    // dead "View draft →" link.
    patch = { status: "pending", draft_id: undefined };
  }

  const updated = await updateQueueItem(item.id, patch).catch((err) => {
    console.warn(`[queue] reconcile persist failed for ${item.id}:`, err);
    return null;
  });
  return updated ?? { ...item, ...patch };
}

// GET /api/admin/queue → list all queue items (reconciled against drafts).
export const GET: APIRoute = async () => {
  const items = await listQueue();
  const reconciled = await Promise.all(items.map(reconcileDrafted));
  return new Response(JSON.stringify({ items: reconciled }), {
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
