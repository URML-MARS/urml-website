// Preact island. Loaded only on /admin (Queue subview). Public bundle
// is unaffected; this code only runs after the user is signed in.
//
// Behavior:
//   - Loads /api/admin/queue on mount
//   - "+ Add topic" reveals an inline form
//   - Each item card has Edit + Delete buttons
//   - Edit replaces the card with the form pre-filled
//   - Refs and videos are dynamic lists (add/remove rows)
//   - "Generate draft" button is rendered but disabled until PR-E

import { useEffect, useMemo, useState } from "preact/hooks";

type Ref = { url: string; title?: string };
type Video = { url: string; title?: string; platform?: string };
type Status = "pending" | "drafted" | "published" | "archived";

interface Item {
  id: string;
  created_at: string;
  updated_at: string;
  topic: string;
  notes: string;
  refs: Ref[];
  videos: Video[];
  status: Status;
  draft_id?: string;
  published_slug?: string;
  created_by: string;
}

const EMPTY_FORM = { topic: "", notes: "", refs: [] as Ref[], videos: [] as Video[] };

export default function QueueIsland() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // item id, or "new", or null
  const [busy, setBusy] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const r = await fetch("/api/admin/queue", { credentials: "same-origin" });
      if (!r.ok) throw new Error(`list ${r.status}`);
      const data = (await r.json()) as { items: Item[] };
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function create(form: typeof EMPTY_FORM) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/queue", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `create ${r.status}`);
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, form: typeof EMPTY_FORM) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/queue/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `update ${r.status}`);
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function generate(id: string) {
    setGeneratingId(id);
    setGeneratedMessage(null);
    try {
      const r = await fetch(`/api/admin/generate/${encodeURIComponent(id)}`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `generate ${r.status}`);
      }
      setGeneratedMessage("Draft generated. Open the Drafts tab to review and publish.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGeneratingId(null);
    }
  }

  async function remove(id: string, topic: string) {
    if (!confirm(`Delete "${topic}"?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/queue/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!r.ok) throw new Error(`delete ${r.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="queue-root">
      {error && (
        <div class="queue-error" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)} class="queue-error-close">×</button>
        </div>
      )}
      {generatedMessage && (
        <div class="queue-success" role="status">
          {generatedMessage}{" "}
          <a href="/admin/drafts" class="queue-success-link">Open Drafts →</a>
          <button type="button" onClick={() => setGeneratedMessage(null)} class="queue-error-close">×</button>
        </div>
      )}

      {editing === "new" ? (
        <QueueForm
          initial={null}
          busy={busy}
          onSave={(form) => create(form)}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          class="queue-add"
          onClick={() => setEditing("new")}
          disabled={busy}
        >+ Add topic</button>
      )}

      {items === null ? (
        <p class="queue-loading">Loading…</p>
      ) : items.length === 0 && editing !== "new" ? (
        <div class="queue-empty">
          No topics yet. Click <strong>+ Add topic</strong> above to seed the first one.
        </div>
      ) : (
        <div class="queue-list">
          {items.map((it) =>
            editing === it.id ? (
              <QueueForm
                key={it.id}
                initial={it}
                busy={busy}
                onSave={(form) => update(it.id, form)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <QueueCard
                key={it.id}
                item={it}
                generating={generatingId === it.id}
                onEdit={() => setEditing(it.id)}
                onDelete={() => remove(it.id, it.topic)}
                onGenerate={() => generate(it.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function QueueForm(props: {
  initial: Item | null;
  busy: boolean;
  onSave: (form: typeof EMPTY_FORM) => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState(props.initial?.topic ?? "");
  const [notes, setNotes] = useState(props.initial?.notes ?? "");
  const [refs, setRefs] = useState<Ref[]>(props.initial?.refs ?? []);
  const [videos, setVideos] = useState<Video[]>(props.initial?.videos ?? []);

  function addRef() {
    setRefs([...refs, { url: "", title: "" }]);
  }
  function updateRef(idx: number, patch: Partial<Ref>) {
    setRefs(refs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeRef(idx: number) {
    setRefs(refs.filter((_, i) => i !== idx));
  }

  function addVideo() {
    setVideos([...videos, { url: "", title: "" }]);
  }
  function updateVideo(idx: number, patch: Partial<Video>) {
    setVideos(videos.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  function removeVideo(idx: number) {
    setVideos(videos.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!topic.trim()) return;
    props.onSave({
      topic: topic.trim(),
      notes,
      refs: refs.filter((r) => r.url.trim()).map((r) => ({
        url: r.url.trim(),
        title: r.title?.trim() || undefined,
      })),
      videos: videos.filter((v) => v.url.trim()).map((v) => ({
        url: v.url.trim(),
        title: v.title?.trim() || undefined,
      })),
    });
  }

  return (
    <form class="queue-form" onSubmit={handleSubmit}>
      <h3>{props.initial ? "Edit topic" : "New topic"}</h3>

      <label class="queue-field">
        <span class="queue-label">Topic</span>
        <input
          type="text"
          value={topic}
          onInput={(e) => setTopic((e.target as HTMLInputElement).value)}
          maxLength={200}
          required
          placeholder="What's the post about?"
        />
      </label>

      <label class="queue-field">
        <span class="queue-label">Notes (optional)</span>
        <textarea
          value={notes}
          onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
          maxLength={4000}
          rows={3}
          placeholder="Angle, framing, anything the LLM should know."
        />
      </label>

      <div class="queue-field">
        <div class="queue-list-head">
          <span class="queue-label">Reference links (articles, news)</span>
          <button type="button" class="queue-tiny" onClick={addRef}>+ add reference</button>
        </div>
        {refs.length === 0 && <p class="queue-hint">No references yet.</p>}
        {refs.map((r, i) => (
          <div class="queue-row" key={i}>
            <input
              type="url"
              placeholder="https://..."
              value={r.url}
              onInput={(e) => updateRef(i, { url: (e.target as HTMLInputElement).value })}
            />
            <input
              type="text"
              placeholder="Title (optional)"
              value={r.title ?? ""}
              onInput={(e) => updateRef(i, { title: (e.target as HTMLInputElement).value })}
            />
            <button type="button" class="queue-remove" onClick={() => removeRef(i)} aria-label="Remove reference">×</button>
          </div>
        ))}
      </div>

      <div class="queue-field">
        <div class="queue-list-head">
          <span class="queue-label">Video links (YouTube, Instagram, TikTok…)</span>
          <button type="button" class="queue-tiny" onClick={addVideo}>+ add video</button>
        </div>
        {videos.length === 0 && <p class="queue-hint">No videos yet.</p>}
        {videos.map((v, i) => (
          <div class="queue-row" key={i}>
            <input
              type="url"
              placeholder="https://..."
              value={v.url}
              onInput={(e) => updateVideo(i, { url: (e.target as HTMLInputElement).value })}
            />
            <input
              type="text"
              placeholder="Title (optional)"
              value={v.title ?? ""}
              onInput={(e) => updateVideo(i, { title: (e.target as HTMLInputElement).value })}
            />
            <button type="button" class="queue-remove" onClick={() => removeVideo(i)} aria-label="Remove video">×</button>
          </div>
        ))}
      </div>

      <div class="queue-actions">
        <button type="submit" class="queue-primary" disabled={props.busy || !topic.trim()}>
          {props.busy ? "Saving…" : props.initial ? "Save" : "Add to queue"}
        </button>
        <button type="button" class="queue-secondary" onClick={props.onCancel} disabled={props.busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function QueueCard(props: {
  item: Item;
  generating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onGenerate: () => void;
}) {
  const { item } = props;
  const created = useMemo(() => fmt(item.created_at), [item.created_at]);
  const canGenerate = item.status === "pending" || item.status === "drafted";
  const generateLabel = item.status === "drafted" ? "Re-generate draft" : "Generate draft";
  return (
    <article class="queue-card">
      <div class="queue-card-head">
        <h3>{item.topic}</h3>
        <span class={`queue-pill queue-pill-${item.status}`}>{item.status}</span>
      </div>
      {item.notes && <p class="queue-notes">{item.notes}</p>}
      <div class="queue-meta">
        <span>{item.refs.length} ref{item.refs.length === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>{item.videos.length} video{item.videos.length === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>Added {created} by {item.created_by}</span>
      </div>
      {(item.refs.length > 0 || item.videos.length > 0) && (
        <details class="queue-details">
          <summary>Show references & videos</summary>
          {item.refs.length > 0 && (
            <ul class="queue-link-list">
              {item.refs.map((r, i) => (
                <li key={i}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title || r.url}</a></li>
              ))}
            </ul>
          )}
          {item.videos.length > 0 && (
            <ul class="queue-link-list">
              {item.videos.map((v, i) => (
                <li key={i}>
                  <a href={v.url} target="_blank" rel="noopener noreferrer">{v.title || v.url}</a>
                  {v.platform && v.platform !== "other" && <span class="queue-platform"> · {v.platform}</span>}
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
      <div class="queue-card-actions">
        <button type="button" class="queue-secondary" onClick={props.onEdit}>Edit</button>
        <button type="button" class="queue-secondary danger" onClick={props.onDelete}>Delete</button>
        {item.status === "drafted" && (
          <a class="queue-secondary" href="/admin/drafts">View draft →</a>
        )}
        <button
          type="button"
          class="queue-primary"
          onClick={props.onGenerate}
          disabled={!canGenerate || props.generating}
          title={!canGenerate ? `Status ${item.status} — cannot regenerate.` : undefined}
        >
          {props.generating ? "Generating…" : generateLabel}
        </button>
      </div>
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
