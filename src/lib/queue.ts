// Queue — topic queue for the Blog tab. Each item is a topic the
// maintainer wants drafted; the LLM (Gemini) generates a draft post
// from the queue item's topic + reference links + video URLs.
//
// Storage: Netlify Blobs, store "queue", key = sortable ID.
//
// Status lifecycle:
//   pending → (Generate draft) → drafted → (Publish) → published
//                                     ↘ (Discard) → pending
//                                                  archived

import { getStore } from "@netlify/blobs";

export interface QueueRef {
  url: string;
  title?: string;
}

export type VideoPlatform = "youtube" | "instagram" | "tiktok" | "vimeo" | "other";

export interface QueueVideo {
  url: string;
  title?: string;
  platform?: VideoPlatform;
}

export type QueueStatus = "pending" | "drafted" | "published" | "archived";

export interface QueueItem {
  id: string;
  created_at: string;
  updated_at: string;
  topic: string;
  notes: string;
  refs: QueueRef[];
  videos: QueueVideo[];
  status: QueueStatus;
  draft_id?: string;
  published_slug?: string;
  created_by: string; // GitHub login
}

export function queueStore() {
  return getStore("queue");
}

// Sortable ID: base36 timestamp + 16 random hex chars. Sorts
// chronologically as a string; collisions are practically impossible
// at human-input rates. Not a strict ULID, but the same shape.
export function generateQueueId(): string {
  const ts = Date.now().toString(36).padStart(9, "0");
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const randHex = Array.from(rand)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${ts}-${randHex}`;
}

export async function listQueue(): Promise<QueueItem[]> {
  const store = queueStore();
  const listing = await store.list();
  const items: QueueItem[] = [];
  for (const blob of listing.blobs) {
    const item = (await store.get(blob.key, { type: "json" })) as QueueItem | null;
    if (item) items.push(item);
  }
  // Newest first.
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getQueueItem(id: string): Promise<QueueItem | null> {
  return (await queueStore().get(id, { type: "json" })) as QueueItem | null;
}

export interface CreateInput {
  topic: string;
  notes?: string;
  refs?: QueueRef[];
  videos?: QueueVideo[];
  created_by: string;
}

export async function createQueueItem(input: CreateInput): Promise<QueueItem> {
  const id = generateQueueId();
  const now = new Date().toISOString();
  const item: QueueItem = {
    id,
    created_at: now,
    updated_at: now,
    topic: input.topic,
    notes: input.notes ?? "",
    refs: input.refs ?? [],
    videos: input.videos ?? [],
    status: "pending",
    created_by: input.created_by,
  };
  await queueStore().setJSON(id, item);
  return item;
}

export type UpdatePatch = Partial<
  Pick<QueueItem, "topic" | "notes" | "refs" | "videos" | "status" | "draft_id" | "published_slug">
>;

export async function updateQueueItem(
  id: string,
  patch: UpdatePatch,
): Promise<QueueItem | null> {
  const existing = await getQueueItem(id);
  if (!existing) return null;
  const updated: QueueItem = {
    ...existing,
    ...patch,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };
  await queueStore().setJSON(id, updated);
  return updated;
}

export async function deleteQueueItem(id: string): Promise<QueueItem | null> {
  const existing = await getQueueItem(id);
  if (!existing) return null;
  await queueStore().delete(id);
  return existing;
}

export function detectVideoPlatform(url: string): VideoPlatform {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("vimeo.com")) return "vimeo";
  return "other";
}

// Server-side input sanitizer for the POST/PATCH endpoints. Tolerant
// of partially-shaped inputs; drops invalid entries silently rather
// than 400-ing the whole request.
export function sanitizeRefs(input: unknown): QueueRef[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (r): r is { url: string; title?: string } =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as { url?: unknown }).url === "string" &&
        (r as { url: string }).url.trim() !== "",
    )
    .map((r) => ({
      url: r.url.trim(),
      title: typeof r.title === "string" && r.title.trim() ? r.title.trim() : undefined,
    }))
    .slice(0, 20);
}

export function sanitizeVideos(input: unknown): QueueVideo[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (v): v is { url: string; title?: string } =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as { url?: unknown }).url === "string" &&
        (v as { url: string }).url.trim() !== "",
    )
    .map((v) => ({
      url: v.url.trim(),
      title: typeof v.title === "string" && v.title.trim() ? v.title.trim() : undefined,
      platform: detectVideoPlatform(v.url),
    }))
    .slice(0, 20);
}
