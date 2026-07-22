# urml-website

Source for the URML public site at https://urml.dev.

This repository is a rendering layer. Canonical URML content (specs, manifesto, governance, the Compatible Runtimes registry, trademark policy) lives in [URML-MARS/URML](https://github.com/URML-MARS/URML). The build pipeline pulls the relevant files from that repo and renders them with [MkDocs](https://www.mkdocs.org/) and the [Material](https://squidfunk.github.io/mkdocs-material/) theme.

## Why a separate repo

Per [CLAUDE.md](https://github.com/URML-MARS/URML/blob/main/CLAUDE.md) in the core repo: web tooling lives in a separate repository, not in the core. This keeps the core focused on the specification and reference runtimes, and lets the website iterate independently without churning the standard's commit history.

## Design constraints

The site is deliberately minimal.

- No third-party analytics, no telemetry, no trackers. Page views are counted by a self-hosted, cookieless Umami instance on our own subdomain, described in full at [urml.dev/privacy](https://urml.dev/privacy).
- No newsletter signup, no contact form, no email collection.
- No JavaScript beyond what the Material theme ships natively (client-side search index, dark-mode toggle, both stay on-device).
- No blog, no team page, no customer logos, no marketing copy.
- Google Fonts disabled (`theme.font: false` in `mkdocs.yml`); the site uses system sans-serif.

If a feature would compromise any of the above, it does not ship.

## Local development

```bash
git clone https://github.com/URML-MARS/URML.git ../URML   # if not already cloned
git clone https://github.com/URML-MARS/urml-website.git
cd urml-website

python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install "mkdocs==1.6.*" "mkdocs-material==9.7.*"

python scripts/sync_from_core.py ../URML
mkdocs serve
```

`mkdocs serve` runs on http://127.0.0.1:8000. Edits to files under `docs/` reload automatically.

## Build pipeline

Netlify is connected to this GitHub repository. Every push to the default branch triggers a build defined in `netlify.toml`:

1. Clone the public core repo (`URML-MARS/URML`) into `urml-core/`.
2. Install MkDocs + Material.
3. Run `scripts/sync_from_core.py urml-core` to pull and link-rewrite canonical content.
4. `mkdocs build --strict` into `site/`.
5. Netlify publishes `site/`.

When canonical content changes in the core repo (registry, trademark policy), the website does not rebuild automatically yet. Trigger a rebuild by pushing to this repo, or wire a Netlify build hook to the core repo (follow-up; see the core repo's `.github/workflows/dispatch-to-website.yml`).

`netlify.toml` also sets a strict Content-Security-Policy that blocks any third-party origin at the browser level, enforcing the no-trackers design constraint.

## Domain

`urml.dev` is configured in the Netlify dashboard (Domain management), not via a repo file. DNS is at the registrar. If the domain changes, update it in Netlify and update `site_url` in `mkdocs.yml`.

## License

Apache License 2.0, matching the core URML repository.
