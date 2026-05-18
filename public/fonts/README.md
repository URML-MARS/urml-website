# Self-hosted fonts

This repo enforces **zero third-party network requests at runtime**
(see `mkdocs.yml` and the `Content-Security-Policy` in `netlify.toml`:
`font-src 'self'`). The design handoff specified Google Fonts; that is
incompatible with that rule, so the three brand faces are **self-hosted**
here instead. Both families are SIL Open Font License 1.1, which permits
redistribution and self-hosting.

Drop these `.woff2` files in this directory (filenames must match the
`@font-face` rules in `src/styles/global.css` exactly):

| File | Family / weight | Source (OFL 1.1) |
|---|---|---|
| `InstrumentSerif-Regular.woff2` | Instrument Serif 400 | https://github.com/google/fonts/tree/main/ofl/instrumentserif |
| `IBMPlexSans-Regular.woff2` | IBM Plex Sans 400 | https://github.com/IBM/plex |
| `IBMPlexSans-Medium.woff2` | IBM Plex Sans 500 | https://github.com/IBM/plex |
| `IBMPlexMono-Regular.woff2` | IBM Plex Mono 400 | https://github.com/IBM/plex |
| `IBMPlexMono-Medium.woff2` | IBM Plex Mono 500 | https://github.com/IBM/plex |

Convert TTF→WOFF2 with `woff2_compress` (or `fonttools`) if a source
only ships TTF. Subsetting to Latin is encouraged to keep payload small;
not required for correctness.

Until the files are present the site still builds and renders: the
`--serif/--sans/--mono` stacks fall back to Source Serif/Georgia,
system-ui, and ui-monospace respectively. The layout is metric-tuned
for the real faces, so add them before any visual-fidelity review.

These binaries are intentionally **not committed by the migration
branch** (licensing/provenance should be a deliberate, reviewed commit,
and binary fonts do not belong in an automated change). Adding them is a
one-step, explicitly-tracked follow-up.
