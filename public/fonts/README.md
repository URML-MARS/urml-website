# Self-hosted fonts

This repo enforces **zero third-party network requests at runtime**
(`mkdocs.yml` history + the `Content-Security-Policy` in `netlify.toml`:
`font-src 'self'`). The design handoff specified Google Fonts; that is
incompatible with that rule, so the three brand faces are **self-hosted
here**, present in this directory:

| File | Family / weight |
|---|---|
| `InstrumentSerif-Regular.woff2` | Instrument Serif 400 |
| `IBMPlexSans-Regular.woff2` | IBM Plex Sans 400 |
| `IBMPlexSans-Medium.woff2` | IBM Plex Sans 500 |
| `IBMPlexMono-Regular.woff2` | IBM Plex Mono 400 |
| `IBMPlexMono-Medium.woff2` | IBM Plex Mono 500 |

The `@font-face` rules in `src/styles/global.css` reference these exact
filenames.

## Provenance & license

Both families are **SIL Open Font License 1.1**, which explicitly
permits redistribution and bundling. They are sourced reproducibly from
[Fontsource](https://fontsource.org) (latin subset, woff2), pinned as
devDependencies in `package.json` / `package-lock.json`:

- `@fontsource/instrument-serif` → Instrument Serif (OFL-1.1, Google Fonts)
- `@fontsource/ibm-plex-sans` → IBM Plex Sans (OFL-1.1, IBM)
- `@fontsource/ibm-plex-mono` → IBM Plex Mono (OFL-1.1, IBM)

To refresh: `npm i` then copy
`node_modules/@fontsource/<family>/files/<family>-latin-<weight>-normal.woff2`
over the matching file here.

> An earlier revision of this note said the binaries were deliberately
> left out for a "reviewed licensing commit." That was over-cautious:
> OFL-1.1 is a redistribution license, self-hosting OFL fonts is the
> standard practice, and the source is now reproducible and pinned via
> Fontsource. So the binaries are committed. The latin-subset woff2 are
> ~15–24 KB each.
