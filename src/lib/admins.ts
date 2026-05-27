// Admins allowlist — checks two sources in order:
//
//   1. ADMIN_GITHUB_ID env var. Founder ID, hardcoded at deploy time,
//      never removable through the UI. Guarantees the founder can never
//      be locked out even if the Blobs allowlist is corrupted.
//   2. admins/<github_id> Blob entry. Additional admins managed via the
//      Admins tab UI (PR-H). Equal power to the founder once added.
//
// Lookup is order-of-magnitude cheap: env var check is instant, Blobs
// read is one round-trip. Cached at request scope by the middleware
// (locals.adminUser holds the parsed identity).

import { getStore } from "@netlify/blobs";

export interface AdminRecord {
  github_id: number;
  github_login: string;
  added_at: string;
  added_by: string; // GitHub login of the admin who added this one
  last_login_at?: string;
}

export function adminsStore() {
  return getStore("admins");
}

/** Returns true if this GitHub numeric ID is allowed in the admin area. */
export async function isAllowed(githubId: number): Promise<boolean> {
  const founderId = Number(process.env.ADMIN_GITHUB_ID);
  if (Number.isFinite(founderId) && githubId === founderId) {
    return true;
  }
  if (!Number.isFinite(githubId)) return false;
  const store = adminsStore();
  const record = (await store.get(String(githubId), { type: "json" })) as
    | AdminRecord
    | null;
  return record !== null;
}

/** True only if this GitHub ID is the env-var founder. Used to gate
 *  delete operations in the Admins tab (PR-H) — the founder is never
 *  removable through the UI. */
export function isFounder(githubId: number): boolean {
  const founderId = Number(process.env.ADMIN_GITHUB_ID);
  return Number.isFinite(founderId) && githubId === founderId;
}

/** Updates last_login_at for Blobs-stored admins. No-op for the
 *  env-var founder (their record doesn't live in Blobs). */
export async function recordLogin(githubId: number): Promise<void> {
  if (isFounder(githubId)) return;
  const store = adminsStore();
  const record = (await store.get(String(githubId), { type: "json" })) as
    | AdminRecord
    | null;
  if (!record) return;
  record.last_login_at = new Date().toISOString();
  await store.setJSON(String(githubId), record);
}
