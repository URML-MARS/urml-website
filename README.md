# urml-website

Source for the URML public site at https://urml.dev.

This repository is a rendering layer. Canonical URML content (specs, manifesto, governance, the Compatible Runtimes registry, trademark policy) lives in [URML-MARS/URML](https://github.com/URML-MARS/URML). The build pipeline pulls the relevant files from that repo and renders them with [MkDocs](https://www.mkdocs.org/) and the [Material](https://squidfunk.github.io/mkdocs-material/) theme.

## Why a separate repo

Per [CLAUDE.md](https://github.com/URML-MARS/URML/blob/main/CLAUDE.md) in the core repo: web tooling lives in a separate repository, not in the core. This keeps the core focused on the specification and reference runtimes, and lets the website iterate independently without churning the standard's commit history.

## Design constraints

The site is deliberately minimal.

- No analytics, no telemetry, no third-party trackers.
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

`.github/workflows/deploy.yml` runs on:

- Push to `main` of this repo
- `repository_dispatch` events of type `core-content-changed` sent by the core repo
- Manual `workflow_dispatch`

It checks out the core URML repo, runs `scripts/sync_from_core.py` to pull and rewrite content, runs `mkdocs build --strict`, and deploys to GitHub Pages.

## Domain

The CNAME file pins `urml.dev`. DNS is managed outside this repo. If the domain changes, update CNAME and the `site_url` in `mkdocs.yml` together.

## License

Apache License 2.0, matching the core URML repository.
