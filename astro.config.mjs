// @ts-check
import { defineConfig } from "astro/config";

// Static output. urml.dev is a content site: every page in this
// foundation slice is static HTML with zero client JS. The five
// documented interactive pieces (Spec tabs, Partners/Blog filters,
// Join form, logo animation) become small islands in a later pass and
// will add @astrojs/react then. Keeping the dependency surface minimal
// now keeps the build fast and the no-third-party-request property
// trivial to hold.
export default defineConfig({
  site: "https://urml.dev",
  output: "static",
  build: { format: "directory" },
  // No telemetry, no external anything. The strict CSP that enforces
  // "zero third-party network requests" lives in netlify.toml; nothing
  // here may load a remote font, script, or tracker.
  devToolbar: { enabled: false },
});
