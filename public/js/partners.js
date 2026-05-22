// Partners page interactivity: tab + profile-filter island.
// Lives as an external file in /public so CSP `script-src 'self'`
// permits it (the previous inline <script> in partners.astro was
// silently inlined by Astro despite the no-inline-script policy).
// TypeScript type annotations stripped; runtime behaviour is identical
// to the original .astro <script> block.

const tabs = document.querySelectorAll("#ptabs button[data-ptab]");
const panes = document.querySelectorAll("[data-pane]");
tabs.forEach((b) => b.addEventListener("click", () => {
  const id = b.dataset.ptab;
  tabs.forEach((x) => {
    const on = x === b;
    x.setAttribute("aria-pressed", on ? "true" : "false");
    x.style.color = on ? "var(--ink)" : "var(--ink-soft)";
    x.style.borderBottomColor = on ? "var(--accent)" : "transparent";
  });
  panes.forEach((p) => { p.style.display = p.dataset.pane === id ? "" : "none"; });
}));

const chips = document.querySelectorAll("#pfilter button[data-prof]");
const rows = document.querySelectorAll("[data-prof-row]");
const empty = document.querySelector("[data-empty]");
chips.forEach((c) => c.addEventListener("click", () => {
  const want = c.dataset.prof;
  chips.forEach((x) => {
    const on = x === c;
    x.style.background = on ? "var(--ink)" : "";
    x.style.color = on ? "var(--bone)" : "";
    x.style.borderColor = on ? "var(--ink)" : "";
  });
  let shown = 0;
  rows.forEach((r) => {
    const profs = (r.dataset.profRow || "").split(",");
    const vis = want === "all" || profs.includes(want);
    r.style.display = vis ? "" : "none";
    if (vis) shown++;
  });
  if (empty) empty.style.display = shown === 0 ? "" : "none";
}));
