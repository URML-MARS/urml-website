import type { APIRoute } from "astro";
import { writeAudit } from "../../../../lib/audit";
import { getDraft, updateDraft } from "../../../../lib/drafts";
import {
  collectSourceImages,
  commitPostToGitHub,
  recordPublishedIndex,
  type PublishedIndexEntry,
} from "../../../../lib/publish";
import { getQueueItem, updateQueueItem } from "../../../../lib/queue";

export const prerender = false;

// POST /api/admin/publish/[draft_id]
//
// 1. Load draft + linked queue item.
// 2. Commit a markdown file to URML-MARS/urml-website/main via the
//    GitHub Contents API. Triggers a Netlify rebuild ~2 min later.
// 3. Update draft.status = "published" + published_slug.
// 4. Update queue item status = "published" + published_slug.
// 5. Write a published-index pointer Blob.
// 6. Audit.
//
// The POST body may optionally contain edited title/summary/body/etc.
// to use instead of the stored draft (handles "edit in place then
// publish" without a separate PATCH round-trip).
export const POST: APIRoute = async ({ params, request, locals }) => {
  const admin = locals.adminUser;
  if (!admin) return json({ error: "unauthorized" }, 401);

  const id = String(params.draft_id || "");
  const draft = await getDraft(id);
  if (!draft) return json({ error: "draft not found" }, 404);
  if (draft.status === "published") {
    // Idempotent re-publish: the post is already live, so return its
    // existing slug as success rather than a 409. Handles stale editors,
    // a second tab, or a retry after a dropped response. (Editing a
    // published draft is disabled in the UI, so there is nothing to
    // re-commit.)
    if (draft.published_slug) {
      return json({
        ok: true,
        slug: draft.published_slug,
        public_url: publicUrlFor(draft.published_slug),
        already_published: true,
      });
    }
    // Marked published but no slug recorded: a genuinely inconsistent
    // state we should not paper over by re-committing.
    return json({ error: "draft is marked published but has no slug; inspect the draft record" }, 409);
  }
  if (draft.status === "discarded") {
    return json({ error: "cannot publish a discarded draft" }, 409);
  }

  // Optional in-place edits supplied in the POST body. Mirror the
  // fields the PATCH endpoint accepts.
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // Empty/no-body publish is fine.
  }

  const toPublish = {
    ...draft,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : draft.title,
    summary:
      typeof body.summary === "string" ? body.summary.trim().slice(0, 220) : draft.summary,
    body_markdown:
      typeof body.body_markdown === "string" ? body.body_markdown : draft.body_markdown,
    suggested_tags: Array.isArray(body.suggested_tags)
      ? (body.suggested_tags as unknown[])
          .filter((t): t is string => typeof t === "string" && t.trim() !== "")
          .map((t) => t.trim().toLowerCase())
          .slice(0, 8)
      : draft.suggested_tags,
    suggested_category:
      typeof body.suggested_category === "string"
        ? (body.suggested_category as typeof draft.suggested_category)
        : draft.suggested_category,
    urml_angle:
      typeof body.urml_angle === "string"
        ? (body.urml_angle as typeof draft.urml_angle)
        : draft.urml_angle,
  };

  const queueItem = await getQueueItem(draft.queue_id);
  if (!queueItem) {
    return json({ error: "linked queue item not found" }, 409);
  }

  // Fetch og:image from each source URL in parallel. Best-effort:
  // any fetch failure just drops that image; never blocks publish.
  // Capped to 5 refs internally so worst-case adds ~4s to publish.
  const sourceImages = await collectSourceImages(queueItem.refs).catch((err) => {
    console.warn("[publish] collectSourceImages failed (non-fatal):", err);
    return [];
  });

  const commit = await commitPostToGitHub({
    draft: toPublish,
    queueItem,
    author: admin.login === "idoco2003" ? "Ido Yahalomi" : admin.login,
    sourceImages,
  });

  if (!commit.ok) {
    await writeAudit({
      actor: admin.login,
      actor_id: admin.id,
      action: "publish.failed",
      target: id,
      meta: { error: commit.error, status: commit.status },
    }).catch(() => {});
    const status = commit.status && commit.status >= 400 ? commit.status : 502;
    return json({ error: commit.error }, status);
  }

  const publishedAt = new Date().toISOString();

  // Reconcile the draft store with the committed post. This is the
  // load-bearing post-commit write: its silent failure used to leave the
  // draft as "edited" while the post was live, so a re-click re-committed
  // a duplicate -N file. Retry it; if it still fails we flag the response
  // `degraded` (below) instead of pretending a clean success. (Even if it
  // fails, the draft_id marker in the committed file now stops a re-click
  // from duplicating — see commitPostToGitHub.)
  const draftReconciled = await tryWithRetry(() =>
    updateDraft(id, {
      status: "published",
      published_slug: commit.slug,
      published_at: publishedAt,
      title: toPublish.title,
      summary: toPublish.summary,
      body_markdown: toPublish.body_markdown,
      suggested_tags: toPublish.suggested_tags,
      suggested_category: toPublish.suggested_category,
      urml_angle: toPublish.urml_angle,
    }),
  );
  if (!draftReconciled) {
    console.warn(`[publish] updateDraft failed after retries (post-commit) for ${id}`);
  }

  // Queue + published-index are best-effort: they only feed admin views,
  // and the marker guard no longer depends on them for dedup.
  await updateQueueItem(draft.queue_id, {
    status: "published",
    published_slug: commit.slug,
  }).catch((err) =>
    console.warn(`[publish] updateQueueItem failed (post-commit) for ${draft.queue_id}:`, err),
  );

  const entry: PublishedIndexEntry = {
    id: `${publishedAt}-${commit.slug}`,
    draft_id: id,
    queue_id: draft.queue_id,
    slug: commit.slug,
    filename: commit.filename,
    title: toPublish.title,
    category: toPublish.suggested_category,
    published_at: publishedAt,
    github_commit_url: commit.commit_url,
    github_html_url: commit.html_url,
  };
  await recordPublishedIndex(entry).catch((err) =>
    console.warn(`[publish] recordPublishedIndex failed (post-commit):`, err),
  );

  await writeAudit({
    actor: admin.login,
    actor_id: admin.id,
    action: "publish",
    target: id,
    meta: {
      slug: commit.slug,
      filename: commit.filename,
      commit_url: commit.commit_url,
      already_existed: commit.already_existed ?? false,
      degraded: !draftReconciled,
    },
  }).catch((err) => console.warn(`[publish] writeAudit failed:`, err));

  const response: Record<string, unknown> = {
    ok: true,
    slug: commit.slug,
    filename: commit.filename,
    commit_url: commit.commit_url,
    html_url: commit.html_url,
    public_url: publicUrlFor(commit.slug),
  };
  if (commit.already_existed) response.already_existed = true;
  if (!draftReconciled) {
    response.degraded = true;
    response.warning = `Post committed to git as ${commit.slug} and is going live, but the admin draft record did not update. Refresh in a moment; do not re-publish.`;
  }
  return json(response);
};

// Public blog URL from a dated slug: strip the YYYY-MM-DD- prefix.
function publicUrlFor(slug: string): string {
  return `/blog/${slug.replace(/^\d{4}-\d{2}-\d{2}-/, "")}/`;
}

// Run an async write up to `attempts` times, swallowing throws. Returns
// true on the first success, false if every attempt threw. Used for the
// load-bearing draft-store reconciliation after a successful git commit.
async function tryWithRetry(fn: () => Promise<unknown>, attempts = 3): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      await fn();
      return true;
    } catch (err) {
      console.warn(`[publish] write attempt ${i + 1}/${attempts} failed:`, err);
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  return false;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
