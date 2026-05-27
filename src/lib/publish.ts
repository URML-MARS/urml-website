// Publish — serialize a draft to markdown frontmatter + body, and
// commit it to URML-MARS/urml-website via the GitHub REST API.
//
// Source of truth for published posts is git, not Blobs: every post is
// a file at src/content/blog/YYYY-MM-DD-<slug>.md, committed to main.
// The published-index Blobs store keeps a lightweight pointer for the
// admin "Published" subview without re-reading git on every visit.
//
// Slug collisions (same date + same kebab-title): retry with -2, -3,
// etc. up to -10. After that, fail loudly.

import type { Draft } from "./drafts";
import type { QueueItem } from "./queue";
import { getStore } from "@netlify/blobs";

export interface PublishedIndexEntry {
  id: string;
  draft_id: string;
  queue_id: string;
  slug: string;
  filename: string;
  title: string;
  category: string;
  published_at: string;
  github_commit_url?: string;
  github_html_url?: string;
}

export function publishedIndexStore() {
  return getStore("published-index");
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function todayIso(): string {
  // YYYY-MM-DD in UTC.
  return new Date().toISOString().slice(0, 10);
}

interface SerializeArgs {
  draft: Draft;
  queueItem: QueueItem;
  author: string;
}

export function serializeMarkdown(args: SerializeArgs): string {
  const { draft, queueItem, author } = args;
  const date = todayIso();

  const sources = queueItem.refs
    .filter((r) => r.url)
    .map((r) => ({
      title: r.title || r.url,
      url: r.url,
      accessed: queueItem.created_at.slice(0, 10),
    }));

  const lines: string[] = [];
  lines.push("---");
  lines.push(`title: ${yamlString(draft.title)}`);
  lines.push(`date: ${date}`);
  lines.push(`summary: ${yamlString(draft.summary)}`);
  lines.push(`category: ${draft.suggested_category}`);
  lines.push(`tags: [${draft.suggested_tags.map(yamlString).join(", ")}]`);
  if (sources.length > 0) {
    lines.push("sources:");
    for (const s of sources) {
      lines.push(`  - title: ${yamlString(s.title)}`);
      lines.push(`    url: ${yamlString(s.url)}`);
      lines.push(`    accessed: ${s.accessed}`);
    }
  } else {
    lines.push("sources: []");
  }
  lines.push(`urml_angle: ${draft.urml_angle}`);
  lines.push(`author: ${yamlString(author)}`);
  lines.push("draft: false");
  lines.push("---");
  lines.push("");
  lines.push(draft.body_markdown.trim());
  lines.push("");

  return lines.join("\n");
}

function yamlString(s: string): string {
  // Always quote, with escaping for safety. Avoids ambiguity at the
  // cost of slight verbosity. The content collection parser handles
  // quoted scalars fine.
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export interface CommitResult {
  ok: true;
  slug: string;
  filename: string;
  commit_url: string;
  html_url: string;
}

export interface CommitError {
  ok: false;
  status?: number;
  error: string;
}

export async function commitPostToGitHub(args: SerializeArgs): Promise<CommitResult | CommitError> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      ok: false,
      error:
        "GITHUB_TOKEN is not set. Create a fine-grained PAT scoped to URML-MARS/urml-website with contents:write, and add it to Netlify env vars.",
    };
  }

  // Allow overriding the target repo via env (handy for testing on a
  // fork). Default is the live repo.
  const repo = process.env.GITHUB_REPO || "URML-MARS/urml-website";
  const branch = process.env.GITHUB_BRANCH || "main";

  const date = todayIso();
  const baseSlug = slugify(args.draft.title);
  if (!baseSlug) {
    return { ok: false, error: "Title produces an empty slug. Use printable characters." };
  }

  const content = serializeMarkdown(args);
  const contentB64 = Buffer.from(content, "utf8").toString("base64");

  // Try base slug; on 409 (file exists) try -2..-10.
  for (let suffix = 0; suffix <= 10; suffix++) {
    const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    const filename = `src/content/blog/${date}-${slug}.md`;
    const url = `https://api.github.com/repos/${repo}/contents/${filename}`;

    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "urml-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `chore(blog): publish ${date}-${slug}`,
        content: contentB64,
        branch,
      }),
    });

    if (resp.status === 422 || resp.status === 409) {
      // File exists. Try the next suffix.
      const text = await resp.text().catch(() => "");
      if (!/sha/i.test(text) && !/already exists/i.test(text)) {
        // 422 might be for a different reason; bail.
        return { ok: false, status: resp.status, error: `GitHub ${resp.status}: ${text.slice(0, 400)}` };
      }
      continue;
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, status: resp.status, error: `GitHub ${resp.status}: ${text.slice(0, 400)}` };
    }

    const json = (await resp.json()) as {
      content?: { html_url?: string };
      commit?: { html_url?: string; sha?: string };
    };

    return {
      ok: true,
      slug: `${date}-${slug}`,
      filename,
      commit_url: json.commit?.html_url ?? "",
      html_url: json.content?.html_url ?? "",
    };
  }

  return {
    ok: false,
    error: "Slug collision after 10 attempts. Pick a different title.",
  };
}

export async function recordPublishedIndex(entry: PublishedIndexEntry): Promise<void> {
  await publishedIndexStore().setJSON(entry.id, entry);
}

export async function listPublishedIndex(): Promise<PublishedIndexEntry[]> {
  const store = publishedIndexStore();
  const listing = await store.list();
  const entries: PublishedIndexEntry[] = [];
  for (const blob of listing.blobs) {
    const item = (await store.get(blob.key, { type: "json" })) as PublishedIndexEntry | null;
    if (item) entries.push(item);
  }
  return entries.sort((a, b) => b.published_at.localeCompare(a.published_at));
}
