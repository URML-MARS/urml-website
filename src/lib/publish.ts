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
import type { QueueItem, QueueRef, QueueVideo } from "./queue";
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
  sourceImages?: SourceImage[];
}

export interface SourceImage {
  refUrl: string;
  imageUrl: string;
  refTitle: string;
}

// ---------------------------------------------------------------------------
// Video embeds: post-process the markdown body so YouTube and Vimeo links
// turn into responsive inline iframes. Instagram / TikTok stay as plain
// links (their embeds require third-party JS, which would violate the
// zero-third-party-script stance).

function youtubeId(url: string): string | null {
  let m = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = url.match(/youtube(?:-nocookie)?\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  return null;
}

function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function videoEmbedHtml(url: string, title: string): string | null {
  const ytId = youtubeId(url);
  if (ytId) {
    // Lite-YouTube pattern: thumbnail + play button overlay, click
    // opens the video on YouTube in a new tab. We do NOT embed an
    // iframe at any point. This works for every YouTube video —
    // including ones whose uploaders disabled embedding entirely
    // (which surfaced previously as "Error 153" inside an iframe).
    //
    // Only the thumbnail loads from Google (i.ytimg.com) on page open;
    // YouTube proper is only loaded when the user clicks the link.
    // Disclosed in /privacy.
    const t = escapeHtmlAttr(title || "Video");
    const watchUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const thumbUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    return `<a class="lite-youtube" href="${watchUrl}" target="_blank" rel="noopener noreferrer" aria-label="Play \&quot;${t}\&quot; on YouTube">
<img class="lite-yt-thumb" src="${thumbUrl}" alt="${t}" loading="lazy" referrerpolicy="no-referrer" />
<span class="lite-yt-play" aria-hidden="true"></span>
<span class="lite-yt-meta"><span class="lite-yt-logo">YouTube</span> · ${t}</span>
</a>`;
  }
  const vmId = vimeoId(url);
  if (vmId) {
    const t = escapeHtmlAttr(title || "Video");
    return `<div class="video-embed"><iframe src="https://player.vimeo.com/video/${vmId}" title="${t}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }
  return null;
}

export function processVideoEmbeds(body: string, videos: QueueVideo[]): string {
  if (videos.length === 0) return body;

  // Map of platform-prefixed video ID to the supplied video record.
  const supplied = new Map<string, QueueVideo>();
  for (const v of videos) {
    const yt = youtubeId(v.url);
    if (yt) supplied.set(`yt:${yt}`, v);
    const vm = vimeoId(v.url);
    if (vm) supplied.set(`vm:${vm}`, v);
  }
  if (supplied.size === 0) return body;

  const embedded = new Set<string>();
  const linkRegex = /\[[^\]]*\]\(([^)\s]+)[^)]*\)/g;
  const paragraphs = body.split(/\n{2,}/);
  const result: string[] = [];

  for (const para of paragraphs) {
    result.push(para);
    for (const match of para.matchAll(linkRegex)) {
      const url = match[1];
      const yt = youtubeId(url);
      if (yt && supplied.has(`yt:${yt}`) && !embedded.has(`yt:${yt}`)) {
        const v = supplied.get(`yt:${yt}`)!;
        const html = videoEmbedHtml(v.url, v.title || "Video");
        if (html) {
          result.push(html);
          embedded.add(`yt:${yt}`);
        }
      }
      const vm = vimeoId(url);
      if (vm && supplied.has(`vm:${vm}`) && !embedded.has(`vm:${vm}`)) {
        const v = supplied.get(`vm:${vm}`)!;
        const html = videoEmbedHtml(v.url, v.title || "Video");
        if (html) {
          result.push(html);
          embedded.add(`vm:${vm}`);
        }
      }
    }
  }

  // Append any supplied YouTube/Vimeo video that the LLM forgot to link.
  const remaining: QueueVideo[] = [];
  for (const [key, v] of supplied) {
    if (!embedded.has(key)) remaining.push(v);
  }
  if (remaining.length > 0) {
    result.push("");
    result.push(`<p class="video-watch-label">Watch:</p>`);
    for (const v of remaining) {
      const html = videoEmbedHtml(v.url, v.title || "Video");
      if (html) result.push(html);
    }
  }

  return result.join("\n\n");
}

// ---------------------------------------------------------------------------
// Source images: at publish time, fetch each source URL and try to extract
// its og:image. Use the first one as a hero image at the top of the post.
// Best-effort: any fetch / parse failure just skips that image. Never
// blocks the publish.

async function fetchOgImage(refUrl: string, timeoutMs = 4000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(refUrl, {
      method: "GET",
      headers: {
        "User-Agent": "urml-admin/1.0 (+https://urml.dev/contact)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const html = (await resp.text()).slice(0, 200000); // cap to first 200 KB
    // Match og:image regardless of attribute order, single or double quotes.
    let m = html.match(
      /<meta\s+(?:[^>]*?\s+)?property\s*=\s*["']og:image(?::secure_url|:url)?["']\s+(?:[^>]*?\s+)?content\s*=\s*["']([^"']+)["']/i,
    );
    if (!m) {
      m = html.match(
        /<meta\s+(?:[^>]*?\s+)?content\s*=\s*["']([^"']+)["']\s+(?:[^>]*?\s+)?property\s*=\s*["']og:image(?::secure_url|:url)?["']/i,
      );
    }
    if (!m) return null;
    const url = m[1].trim();
    if (!url.startsWith("https://") && !url.startsWith("http://")) return null;
    return url;
  } catch {
    return null;
  }
}

export async function collectSourceImages(refs: QueueRef[]): Promise<SourceImage[]> {
  // Cap to the first 5 refs so we never block publish on a long ref list.
  const eligible = refs.slice(0, 5);
  const results = await Promise.all(
    eligible.map(async (r) => {
      const img = await fetchOgImage(r.url);
      return img ? { refUrl: r.url, imageUrl: img, refTitle: r.title || r.url } : null;
    }),
  );
  return results.filter((x): x is SourceImage => x !== null);
}

function heroImageHtml(image: SourceImage): string {
  return `<figure class="post-hero">
<img src="${escapeHtmlAttr(image.imageUrl)}" alt="${escapeHtmlAttr(image.refTitle)}" loading="lazy" referrerpolicy="no-referrer" />
<figcaption>Image: ${escapeHtmlAttr(image.refTitle)}</figcaption>
</figure>`;
}

export function serializeMarkdown(args: SerializeArgs): string {
  const { draft, queueItem, author, sourceImages = [] } = args;
  const date = todayIso();

  // Body transformations: videos inline, hero image at the top.
  let body = draft.body_markdown.trim();
  body = processVideoEmbeds(body, queueItem.videos);
  if (sourceImages.length > 0) {
    body = heroImageHtml(sourceImages[0]) + "\n\n" + body;
  }

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
  lines.push(body);
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
  // Use the slug as the Blob key (URL-safe, unique within a deploy).
  // The original entry.id is preserved inside the record for display.
  await publishedIndexStore().setJSON(entry.slug, entry);
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
