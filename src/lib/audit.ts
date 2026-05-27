// Audit log — append-only record of every admin mutation. Used by all
// /api/admin/* write endpoints (queue CRUD, drafts, publish, manual
// unsubscribe, admin allowlist changes, denied logins).
//
// Storage: Netlify Blobs, store "audit", key = sortable ISO timestamp.
// Never auto-delete; storage is cheap and the trail is the trail.

import { getStore } from "@netlify/blobs";

export interface AuditEntry {
  ts: string;
  actor: string; // GitHub login, or "anonymous" for failed-login attempts
  actor_id?: number; // GitHub numeric id (omitted for unknown actors)
  action: string; // e.g., "queue.create", "queue.update", "auth.denied"
  target?: string; // resource id (queue item, draft, subscriber token, etc.)
  before?: unknown;
  after?: unknown;
  ip?: string;
  meta?: Record<string, unknown>;
}

export function auditStore() {
  return getStore("audit");
}

export async function writeAudit(entry: Omit<AuditEntry, "ts">): Promise<void> {
  const ts = new Date().toISOString();
  // Suffix prevents key collisions for two writes in the same millisecond.
  const rand = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(rand)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Netlify Blobs keys must be URL-safe. The ISO timestamp contains
  // colons, which are not valid. Replace them; the value field still
  // holds the original ISO timestamp for display.
  const safeTs = ts.replace(/:/g, "_");
  const key = `${safeTs}-${suffix}`;
  await auditStore().setJSON(key, { ts, ...entry });
}
