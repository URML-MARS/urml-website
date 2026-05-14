"""Sync content from the URML-MARS/URML core repo into this website's docs/.

The website is a rendering layer; canonical content lives in the core repo.
This script copies three files from a local core checkout, rewriting their
internal links so they resolve on the deployed site.

Usage:
    python scripts/sync_from_core.py <path-to-core-checkout>

Examples:
    python scripts/sync_from_core.py ../URML        # local dev (sibling clone)
    python scripts/sync_from_core.py ./urml-core    # CI checkout into subdir

The CI workflow calls this script after checking out the core repo. Local dev
can call it once after cloning, then rely on `mkdocs serve` for the inner loop.
"""

from __future__ import annotations

import sys
from pathlib import Path

# (source_in_core_repo, destination_in_website_docs)
FILES: list[tuple[str, str]] = [
    ("docs/compatible-runtimes.md", "compatible-runtimes.md"),
    ("docs/registry/SUBMISSION.md", "submit.md"),
    ("TRADEMARK.md", "trademark.md"),
]

# Link rewrites: each (pattern, replacement) is applied with str.replace.
# Order matters. Longer patterns must come before shorter prefixes of them,
# so that "../../conformance/README.md" is rewritten before "../conformance/"
# would match a substring of it. The applied set of patterns covers every
# relative link emitted by the three source files; new links require new
# entries here. CI's --strict build will catch misses.
LINK_REWRITES: list[tuple[str, str]] = [
    # Conformance: longest paths first.
    ("../../conformance/README.md", "https://github.com/URML-MARS/URML/blob/main/conformance/README.md"),
    ("../../conformance/", "https://github.com/URML-MARS/URML/tree/main/conformance/"),
    ("../conformance/README.md", "https://github.com/URML-MARS/URML/blob/main/conformance/README.md"),
    ("../conformance/", "https://github.com/URML-MARS/URML/tree/main/conformance/"),
    ("(conformance/)", "(https://github.com/URML-MARS/URML/tree/main/conformance/)"),

    # Trademark: longest first.
    ("../../TRADEMARK.md", "trademark.md"),
    ("../TRADEMARK.md", "trademark.md"),
    ("(TRADEMARK.md)", "(trademark.md)"),

    # Submission: longest first.
    ("../../docs/registry/SUBMISSION.md", "submit.md"),
    ("../docs/registry/SUBMISSION.md", "submit.md"),
    ("(docs/registry/SUBMISSION.md)", "(submit.md)"),
    ("../registry/SUBMISSION.md", "submit.md"),
    ("(registry/SUBMISSION.md)", "(submit.md)"),

    # Compatible Runtimes: longest first.
    ("../../docs/compatible-runtimes.md", "compatible-runtimes.md"),
    ("../docs/compatible-runtimes.md", "compatible-runtimes.md"),
    ("(docs/compatible-runtimes.md)", "(compatible-runtimes.md)"),
    ("../compatible-runtimes.md", "compatible-runtimes.md"),

    # GOVERNANCE.md anchor + plain link.
    ("GOVERNANCE.md#trademark-policy", "https://github.com/URML-MARS/URML/blob/main/GOVERNANCE.md#trademark-policy"),
    ("../GOVERNANCE.md", "https://github.com/URML-MARS/URML/blob/main/GOVERNANCE.md"),
    ("(GOVERNANCE.md)", "(https://github.com/URML-MARS/URML/blob/main/GOVERNANCE.md)"),

    # CORE_COMMITMENT, MANIFESTO, CONTRIBUTING.
    ("../CORE_COMMITMENT.md", "https://github.com/URML-MARS/URML/blob/main/CORE_COMMITMENT.md"),
    ("(CORE_COMMITMENT.md)", "(https://github.com/URML-MARS/URML/blob/main/CORE_COMMITMENT.md)"),
    ("../MANIFESTO.md", "manifesto.md"),
    ("(MANIFESTO.md)", "(manifesto.md)"),
    ("../CONTRIBUTING.md", "https://github.com/URML-MARS/URML/blob/main/CONTRIBUTING.md"),
    ("(CONTRIBUTING.md)", "(https://github.com/URML-MARS/URML/blob/main/CONTRIBUTING.md)"),

    # RFC links.
    ("../../docs/rfcs/0001-rfc-process.md", "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0001-rfc-process.md"),
    ("../docs/rfcs/0001-rfc-process.md", "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0001-rfc-process.md"),
    ("(docs/rfcs/0001-rfc-process.md)", "(https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0001-rfc-process.md)"),
]


def rewrite_links(text: str) -> str:
    for pattern, replacement in LINK_REWRITES:
        text = text.replace(pattern, replacement)
    return text


def sync(core_root: Path, website_docs: Path) -> None:
    if not core_root.is_dir():
        sys.exit(f"sync_from_core: core checkout not found at {core_root}")
    if not website_docs.is_dir():
        sys.exit(f"sync_from_core: website docs/ not found at {website_docs}")

    for relative_source, relative_target in FILES:
        source = core_root / relative_source
        target = website_docs / relative_target
        if not source.is_file():
            sys.exit(f"sync_from_core: source missing: {source}")
        text = source.read_text(encoding="utf-8")
        text = rewrite_links(text)
        target.write_text(text, encoding="utf-8")
        print(f"  {source} -> {target}")


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("usage: sync_from_core.py <path-to-core-checkout>", file=sys.stderr)
        return 2
    core_root = Path(argv[0]).resolve()
    website_docs = Path(__file__).resolve().parent.parent / "docs"
    print(f"syncing from {core_root} -> {website_docs}")
    sync(core_root, website_docs)
    print("done")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
