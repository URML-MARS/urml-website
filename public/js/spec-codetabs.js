// Spec page code-tabs island.
// Lives as an external file in /public so CSP `script-src 'self'`
// permits it (the previous inline <script> in spec.astro was
// silently inlined by Astro despite the no-inline-script policy).
// TypeScript type annotations stripped; runtime behaviour identical
// to the original .astro <script> block.

const root = document.getElementById("codetabs");
if (root) {
  const btns = root.querySelectorAll("button[data-tab]");
  const panels = document.querySelectorAll("[data-panel]");
  btns.forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.tab;
      btns.forEach((x) => {
        const on = x === b;
        x.setAttribute("aria-pressed", on ? "true" : "false");
        x.style.background = on ? "var(--bone)" : "transparent";
        x.style.color = on ? "var(--ink)" : "var(--ink-soft)";
        x.style.borderBottomColor = on ? "var(--accent)" : "transparent";
        x.style.fontWeight = on ? "500" : "400";
      });
      panels.forEach((p) => {
        p.style.display = p.dataset.panel === id ? "" : "none";
      });
    });
  });
}
