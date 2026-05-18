import { defineCollection, z } from "astro:content";

// Canonical docs synced from URML-MARS/URML by scripts/sync-from-core.mjs.
// The website is a rendering layer; these files are generated, and the
// committed copies are the snapshot fallback when core lacks the file.
const core = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    synced_from: z.string().optional(),
  }),
});

export const collections = { core };
