import type { APIRoute } from "astro";
import { writeAudit } from "../../../../lib/audit";
import { getDraft, updateDraft } from "../../../../lib/drafts";
import {
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
    return json({ error: "draft is already published" }, 409);
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

  const commit = await commitPostToGitHub({
    draft: toPublish,
    queueItem,
    author: admin.login === "idoco2003" ? "Ido Yahalomi" : admin.login,
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

  // Update draft → published.
  await updateDraft(id, {
    status: "published",
    published_slug: commit.slug,
    published_at: publishedAt,
    title: toPublish.title,
    summary: toPublish.summary,
    body_markdown: toPublish.body_markdown,
    suggested_tags: toPublish.suggested_tags,
    suggested_category: toPublish.suggested_category,
    urml_angle: toPublish.urml_angle,
  });

  // Update queue item.
  await updateQueueItem(draft.queue_id, {
    status: "published",
    published_slug: commit.slug,
  });

  // Record published-index pointer.
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
  await recordPublishedIndex(entry);

  await writeAudit({
    actor: admin.login,
    actor_id: admin.id,
    action: "publish",
    target: id,
    meta: {
      slug: commit.slug,
      filename: commit.filename,
      commit_url: commit.commit_url,
    },
  }).catch(() => {});

  return json({
    ok: true,
    slug: commit.slug,
    filename: commit.filename,
    commit_url: commit.commit_url,
    html_url: commit.html_url,
    public_url: `/blog/${commit.slug.replace(/^\d{4}-\d{2}-\d{2}-/, "")}/`,
  });
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
