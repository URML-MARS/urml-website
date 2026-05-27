// Preact island for the Drafts subview. Loads /api/admin/drafts and
// renders each draft as a card. Clicking a card expands the editor:
// title, summary, body, tags, category, urml_angle. Publish commits
// to git (Netlify rebuild ~2 min). Discard deletes + queue returns
// to pending.

import { useEffect, useMemo, useState } from "preact/hooks";

type Category = "Vendor" | "Research" | "Regulation" | "Ecosystem" | "Engineering" | "URML";
type Angle = "explicit" | "implicit" | "none";
type Status = "fresh" | "edited" | "published" | "discarded";

interface Draft {
  id: string;
  queue_id: string;
  created_at: string;
  updated_at: string;
  model: string;
  prompt_version: string;
  title: string;
  summary: string;
  body_markdown: string;
  suggested_tags: string[];
  suggested_category: Category;
  urml_angle: Angle;
  confidence_notes?: string;
  status: Status;
  published_slug?: string;
  published_at?: string;
}

const CATEGORIES: Category[] = ["Vendor", "Research", "Regulation", "Ecosystem", "Engineering", "URML"];
const ANGLES: Angle[] = ["explicit", "implicit", "none"];

export default function DraftsIsland() {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [publishedMessage, setPublishedMessage] = useState<{ slug: string; url: string } | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const r = await fetch("/api/admin/drafts", { credentials: "same-origin" });
      if (!r.ok) throw new Error(`list ${r.status}`);
      const data = (await r.json()) as { drafts: Draft[] };
      setDrafts(data.drafts);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const visible = useMemo(() => {
    if (!drafts) return null;
    if (filter === "all") return drafts;
    return drafts.filter((d) => d.status === "fresh" || d.status === "edited");
  }, [drafts, filter]);

  async function save(id: string, patch: Partial<Draft>) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/drafts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `update ${r.status}`);
      }
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function discard(id: string, title: string) {
    if (!confirm(`Discard draft "${title}"? The queue item will go back to pending.`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/drafts/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `delete ${r.status}`);
      }
      setEditingId(null);
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function publish(id: string, edits: Partial<Draft>) {
    if (!confirm("Publish this draft? It will commit to git on main and trigger a Netlify rebuild. ~2 min to live.")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/publish/${encodeURIComponent(id)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `publish ${r.status}`);
      }
      const data = (await r.json()) as { slug: string; public_url: string };
      setPublishedMessage({ slug: data.slug, url: data.public_url });
      setEditingId(null);
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="drafts-root">
      {error && (
        <div class="drafts-error" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)} class="drafts-error-close">×</button>
        </div>
      )}
      {publishedMessage && (
        <div class="drafts-success" role="status">
          Published <code>{publishedMessage.slug}</code>. Netlify is rebuilding; live at{" "}
          <a href={publishedMessage.url} target="_blank" rel="noopener noreferrer">{publishedMessage.url}</a>{" "}
          in ~2 min.
          <button type="button" onClick={() => setPublishedMessage(null)} class="drafts-error-close">×</button>
        </div>
      )}

      <div class="drafts-filter">
        <button
          type="button"
          class={filter === "active" ? "active" : ""}
          onClick={() => setFilter("active")}
        >Active</button>
        <button
          type="button"
          class={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >All</button>
        {drafts && (
          <span class="drafts-count">
            {visible?.length ?? 0} of {drafts.length}
          </span>
        )}
      </div>

      {visible === null ? (
        <p class="drafts-loading">Loading…</p>
      ) : visible.length === 0 ? (
        <div class="drafts-empty">
          {filter === "active" ? (
            <>No active drafts. Generate one from the <a href="/admin">Queue</a>.</>
          ) : (
            <>No drafts yet.</>
          )}
        </div>
      ) : (
        <div class="drafts-list">
          {visible.map((d) =>
            editingId === d.id ? (
              <DraftEditor
                key={d.id}
                draft={d}
                busy={busy}
                onSave={(patch) => save(d.id, patch)}
                onPublish={(edits) => publish(d.id, edits)}
                onDiscard={() => discard(d.id, d.title)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <DraftCard key={d.id} draft={d} onEdit={() => setEditingId(d.id)} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function DraftCard(props: { draft: Draft; onEdit: () => void }) {
  const { draft } = props;
  const created = useMemo(() => fmt(draft.created_at), [draft.created_at]);
  return (
    <article class="draft-card">
      <div class="draft-card-head">
        <h3>{draft.title}</h3>
        <span class={`draft-pill draft-pill-${draft.status}`}>{draft.status}</span>
      </div>
      <p class="draft-summary">{draft.summary}</p>
      <div class="draft-meta">
        <span class="draft-cat">{draft.suggested_category}</span>
        <span>·</span>
        <span>angle: {draft.urml_angle}</span>
        <span>·</span>
        <span>Generated {created}</span>
        <span>·</span>
        <span>{draft.model}</span>
      </div>
      {draft.confidence_notes && (
        <p class="draft-confidence">
          <strong>LLM notes:</strong> {draft.confidence_notes}
        </p>
      )}
      <details class="draft-preview">
        <summary>Show body</summary>
        <pre class="draft-body-preview">{draft.body_markdown}</pre>
      </details>
      <div class="draft-card-actions">
        <button type="button" class="draft-primary" onClick={props.onEdit}>
          {draft.status === "published" ? "View" : "Edit & publish"}
        </button>
      </div>
    </article>
  );
}

function DraftEditor(props: {
  draft: Draft;
  busy: boolean;
  onSave: (patch: Partial<Draft>) => void;
  onPublish: (edits: Partial<Draft>) => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const { draft } = props;
  const isPublished = draft.status === "published";
  const [title, setTitle] = useState(draft.title);
  const [summary, setSummary] = useState(draft.summary);
  const [bodyMd, setBodyMd] = useState(draft.body_markdown);
  const [tags, setTags] = useState((draft.suggested_tags ?? []).join(", "));
  const [category, setCategory] = useState<Category>(draft.suggested_category);
  const [angle, setAngle] = useState<Angle>(draft.urml_angle);

  function patchObj(): Partial<Draft> {
    return {
      title: title.trim(),
      summary: summary.trim(),
      body_markdown: bodyMd,
      suggested_tags: tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8),
      suggested_category: category,
      urml_angle: angle,
    };
  }

  return (
    <article class="draft-editor">
      <div class="draft-editor-head">
        <span class={`draft-pill draft-pill-${draft.status}`}>{draft.status}</span>
        <span class="draft-editor-meta">
          {draft.model} · {fmt(draft.created_at)}
        </span>
      </div>

      <label class="draft-field">
        <span class="draft-label">Title</span>
        <input
          type="text"
          value={title}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          disabled={isPublished}
        />
      </label>

      <label class="draft-field">
        <span class="draft-label">Summary (used in /blog card + RSS, max 220 chars)</span>
        <input
          type="text"
          value={summary}
          maxLength={220}
          onInput={(e) => setSummary((e.target as HTMLInputElement).value)}
          disabled={isPublished}
        />
      </label>

      <div class="draft-row">
        <label class="draft-field">
          <span class="draft-label">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory((e.target as HTMLSelectElement).value as Category)}
            disabled={isPublished}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label class="draft-field">
          <span class="draft-label">URML angle</span>
          <select
            value={angle}
            onChange={(e) => setAngle((e.target as HTMLSelectElement).value as Angle)}
            disabled={isPublished}
          >
            {ANGLES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>

      <label class="draft-field">
        <span class="draft-label">Tags (comma-separated, lowercase)</span>
        <input
          type="text"
          value={tags}
          onInput={(e) => setTags((e.target as HTMLInputElement).value)}
          placeholder="figure, humanoid, deployment"
          disabled={isPublished}
        />
      </label>

      <label class="draft-field">
        <span class="draft-label">Body (markdown). Look for &lt;!-- TELL: --&gt; markers — these flag potential AI tells the LLM emitted.</span>
        <textarea
          value={bodyMd}
          rows={18}
          onInput={(e) => setBodyMd((e.target as HTMLTextAreaElement).value)}
          disabled={isPublished}
          spellcheck
        />
      </label>

      {draft.confidence_notes && (
        <p class="draft-confidence">
          <strong>LLM notes (not published):</strong> {draft.confidence_notes}
        </p>
      )}

      {isPublished ? (
        <div class="draft-editor-actions">
          <a
            class="draft-primary"
            href={`/blog/${draft.published_slug?.replace(/^\d{4}-\d{2}-\d{2}-/, "") ?? ""}/`}
            target="_blank"
            rel="noopener noreferrer"
          >Open on /blog</a>
          <button type="button" class="draft-secondary" onClick={props.onCancel}>Close</button>
        </div>
      ) : (
        <div class="draft-editor-actions">
          <button
            type="button"
            class="draft-primary"
            onClick={() => props.onPublish(patchObj())}
            disabled={props.busy || !title.trim()}
          >{props.busy ? "Publishing…" : "Publish (commits to git)"}</button>
          <button
            type="button"
            class="draft-secondary"
            onClick={() => props.onSave(patchObj())}
            disabled={props.busy}
          >Save as draft</button>
          <button
            type="button"
            class="draft-secondary"
            onClick={props.onCancel}
            disabled={props.busy}
          >Cancel</button>
          <button
            type="button"
            class="draft-secondary danger"
            onClick={props.onDiscard}
            disabled={props.busy}
          >Discard</button>
        </div>
      )}
    </article>
  );
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
