// Blog index category-filter island.
// Lives as an external file in /public so CSP `script-src 'self'`
// permits it (the previous inline <script> in blog.astro was
// silently inlined by Astro despite the no-inline-script policy).
// TypeScript type annotations stripped; runtime behaviour identical
// to the original .astro <script> block.

const chips = document.querySelectorAll("#bfilter button[data-bcat]");
const rows = document.querySelectorAll("[data-bcat-row]");
const empty = document.querySelector("[data-bempty]");

chips.forEach((c) => c.addEventListener("click", () => {
  const want = c.dataset.bcat;
  chips.forEach((x) => {
    const on = x === c;
    x.style.background = on ? "var(--ink)" : "var(--bone)";
    x.style.color = on ? "var(--bone)" : "var(--ink-soft)";
    x.style.borderColor = on ? "var(--ink)" : "var(--rule)";
  });
  let shown = 0;
  rows.forEach((r) => {
    const vis = want === "all" || r.dataset.bcatRow === want;
    r.style.display = vis ? "" : "none";
    if (vis) shown++;
  });
  if (empty) empty.style.display = shown === 0 ? "" : "none";
}));
