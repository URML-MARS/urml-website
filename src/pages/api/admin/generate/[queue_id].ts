import type { APIRoute } from "astro";
import { writeAudit } from "../../../../lib/audit";
import { createDraft } from "../../../../lib/drafts";
import { generateFromQueueItem, GEMINI_MODEL, PROMPT_VERSION } from "../../../../lib/gemini";
import { getQueueItem, updateQueueItem } from "../../../../lib/queue";

export const prerender = false;

// POST /api/admin/generate/[queue_id]
//
// Load the queue item, call Gemini, store the result as a fresh
// draft, flip the queue item's status to "drafted" and link
// draft_id. Returns the new draft (the UI shows a toast "Generated
// — view in Drafts" and refreshes the queue list).
//
// Failure modes:
//   - GEMINI_API_KEY missing                 → 500 with actionable message
//   - Gemini 429 (rate-limited)              → 429 with retry hint
//   - Gemini 5xx / timeout / network         → 502
//   - Output fails JSON parse / shape check  → 502 (rare with structured output)
//
// On any failure, the queue item is NOT modified (no orphan "drafted"
// status). Audit log captures the attempt either way.
export const POST: APIRoute = async ({ params, locals }) => {
  const admin = locals.adminUser;
  if (!admin) return json({ error: "unauthorized" }, 401);

  const queueId = String(params.queue_id || "");
  const item = await getQueueItem(queueId);
  if (!item) return json({ error: "queue item not found" }, 404);

  if (item.status !== "pending" && item.status !== "drafted") {
    return json(
      { error: `cannot generate from queue item in status "${item.status}"` },
      409,
    );
  }

  const result = await generateFromQueueItem(item);

  if (!result.ok) {
    await writeAudit({
      actor: admin.login,
      actor_id: admin.id,
      action: "draft.generate.failed",
      target: queueId,
      meta: { error: result.error, status: result.status },
    }).catch(() => {});

    const status =
      result.status === 429 ? 429 : result.status && result.status >= 500 ? 502 : 500;
    return json({ error: result.error }, status);
  }

  const draft = await createDraft({
    queue_id: queueId,
    model: GEMINI_MODEL,
    prompt_version: PROMPT_VERSION,
    title: result.output.title,
    summary: result.output.summary,
    body_markdown: result.output.body_markdown,
    suggested_tags: result.output.suggested_tags,
    suggested_category: result.output.suggested_category,
    urml_angle: result.output.urml_angle,
    confidence_notes: result.output.confidence_notes,
  });

  // Link draft → queue (replaces any previous draft pointer).
  await updateQueueItem(queueId, { status: "drafted", draft_id: draft.id });

  await writeAudit({
    actor: admin.login,
    actor_id: admin.id,
    action: "draft.generate",
    target: draft.id,
    meta: { queue_id: queueId, model: GEMINI_MODEL, prompt_version: PROMPT_VERSION },
  }).catch(() => {});

  return json({ draft }, 201);
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
