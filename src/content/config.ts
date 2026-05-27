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

// Blog posts live as markdown in src/content/blog/ with filename
// YYYY-MM-DD-slug.md. The date prefix sorts chronologically on disk; the
// URL slug strips the prefix (see src/pages/blog/[slug].astro). The
// `urml_angle` field is auditable: periodic grep for implicit-angle posts
// catches formulaic content-farm drift. The `sources[].accessed` date
// timestamps the founder's claim because robotics-vendor links rot.
const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string().max(220),
    category: z.enum([
      "Vendor",
      "Research",
      "Regulation",
      "Ecosystem",
      "Engineering",
      "URML",
    ]),
    tags: z.array(z.string()).default([]),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string().url(),
      accessed: z.date(),
    })).default([]),
    urml_angle: z.enum(["explicit", "implicit", "none"]),
    author: z.string().default("Ido Yahalomi"),
    draft: z.boolean().default(false),
    updated: z.date().optional(),
    cover_note: z.string().optional(),
  }),
});

export const collections = { core, blog };
