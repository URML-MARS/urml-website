// Drafts — LLM-generated post drafts. A draft is created from a queue
// item via Gemini (see lib/gemini.ts). The maintainer reviews and
// optionally edits the draft, then publishes (commits to git) or
// discards (queue returns to pending).
//
// Storage: Netlify Blobs, store "drafts", key = draft id.

import { getStore } from "@netlify/blobs";
import { generateQueueId } from "./queue";

export type DraftCategory =
  | "Vendor"
  | "Research"
  | "Regulation"
  | "Ecosystem"
  | "Engineering"
  | "URML";

export type DraftAngle = "explicit" | "implicit" | "none";

export type DraftStatus = "fresh" | "edited" | "published" | "discarded";

export interface Draft {
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
  suggested_category: DraftCategory;
  urml_angle: DraftAngle;
  confidence_notes?: string;
  rejected_reasons?: string[];
  status: DraftStatus;
  // Set when published:
  published_slug?: string;
  published_at?: string;
}

export function draftsStore() {
  return getStore("drafts");
}

export function generateDraftId(): string {
  // Same shape as queue ids (sortable, no collisions).
  return generateQueueId();
}

export async function createDraft(input: Omit<Draft, "id" | "created_at" | "updated_at" | "status">): Promise<Draft> {
  const id = generateDraftId();
  const now = new Date().toISOString();
  const draft: Draft = {
    id,
    created_at: now,
    updated_at: now,
    status: "fresh",
    ...input,
  };
  await draftsStore().setJSON(id, draft);
  return draft;
}

export async function getDraft(id: string): Promise<Draft | null> {
  return (await draftsStore().get(id, { type: "json" })) as Draft | null;
}

export async function listDrafts(): Promise<Draft[]> {
  const store = draftsStore();
  const listing = await store.list();
  const items: Draft[] = [];
  for (const blob of listing.blobs) {
    const item = (await store.get(blob.key, { type: "json" })) as Draft | null;
    if (item) items.push(item);
  }
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export type DraftPatch = Partial<
  Pick<
    Draft,
    | "title"
    | "summary"
    | "body_markdown"
    | "suggested_tags"
    | "suggested_category"
    | "urml_angle"
    | "status"
    | "published_slug"
    | "published_at"
    | "rejected_reasons"
  >
>;

export async function updateDraft(id: string, patch: DraftPatch): Promise<Draft | null> {
  const existing = await getDraft(id);
  if (!existing) return null;
  const updated: Draft = {
    ...existing,
    ...patch,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };
  await draftsStore().setJSON(id, updated);
  return updated;
}

export async function deleteDraft(id: string): Promise<Draft | null> {
  const existing = await getDraft(id);
  if (!existing) return null;
  await draftsStore().delete(id);
  return existing;
}
