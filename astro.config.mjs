// @ts-check
import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import preact from "@astrojs/preact";

// Hybrid output. Public pages stay static (the no-third-party-request
// property, the strict CSP, the audit-honest "what you see is what's
// in the repo" stance — all preserved by default). Specific routes opt
// into server-side rendering with `export const prerender = false`:
//
//   - /admin/*       (admin area, PR-C+)
//   - /api/admin/*   (admin Functions: queue, drafts, publish, etc.)
//   - /api/subscribers/{signup, confirm, unsubscribe}  (PR-B)
//
// No route opts in yet at this PR (PR-B0 is pure prep). The adapter
// is registered, hybrid mode is on; the public output is byte-identical
// to the previous static build until PR-B adds the first SSR endpoint.
//
// CSP is unchanged. Browser-side traffic still hits same-origin only;
// server-side calls from Functions to Resend / Gemini / GitHub do not
// traverse the browser CSP.
export default defineConfig({
  site: "https://urml.dev",
  output: "hybrid",
  adapter: netlify(),
  // Preact for admin-only interactive islands (Queue CRUD, Drafts
  // editor, Subscribers table). Bundle is ~4 kB, loaded only on
  // /admin/* pages that mount an island. Public bundle is unaffected.
  integrations: [preact()],
  build: { format: "directory" },
  // No telemetry, no external anything. The strict CSP that enforces
  // "zero third-party network requests" lives in netlify.toml; nothing
  // here may load a remote font, script, or tracker on the public site.
  devToolbar: { enabled: false },
});
