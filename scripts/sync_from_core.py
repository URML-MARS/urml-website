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
#
# The manufacturer pages are flattened to docs-root filenames (not kept in a
# manufacturers/ subdir) on purpose: the link-rewrite rules below resolve
# relative paths assuming every rendered page sits at the docs root, exactly
# as submit.md does. Keeping these at the root means the existing
# ../../TRADEMARK.md and ../compatible-runtimes.md rules keep working for them
# without per-file path math.
FILES: list[tuple[str, str]] = [
    ("docs/compatible-runtimes.md", "compatible-runtimes.md"),
    ("docs/registry/SUBMISSION.md", "submit.md"),
    ("TRADEMARK.md", "trademark.md"),
    ("docs/manufacturers/README.md", "manufacturers.md"),
    ("docs/manufacturers/directory.md", "manufacturer-directory.md"),
    ("docs/manufacturers/SUBMISSION.md", "list-your-product.md"),
    ("docs/manufacturers/FEDERAL-VALIDATION-SELF-REPORT.md", "manufacturer-federal-validation.md"),
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
    # The ../../ form (used by the manufacturer pages, which live one level
    # deeper in core) must precede the ../ form, or str.replace would leave a
    # dangling "../" prefix in front of the rewritten GitHub URL.
    ("../../CORE_COMMITMENT.md", "https://github.com/URML-MARS/URML/blob/main/CORE_COMMITMENT.md"),
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

    # Manufacturer pages. Inbound links (trademark.md uses docs/manufacturers/;
    # compatible-runtimes.md uses manufacturers/), sibling links among the four
    # flattened pages, and the core-only paths they reference. Most-qualified
    # forms first so a shorter pattern never pre-empts a longer one.
    ("(docs/manufacturers/directory.md)", "(manufacturer-directory.md)"),
    ("(docs/manufacturers/SUBMISSION.md)", "(list-your-product.md)"),
    ("(docs/manufacturers/FEDERAL-VALIDATION-SELF-REPORT.md)", "(manufacturer-federal-validation.md)"),
    ("(manufacturers/directory.md)", "(manufacturer-directory.md)"),
    ("(FEDERAL-VALIDATION-SELF-REPORT.md)", "(manufacturer-federal-validation.md)"),
    ("(directory.md)", "(manufacturer-directory.md)"),
    ("(SUBMISSION.md)", "(list-your-product.md)"),
    ("(README.md)", "(manufacturers.md)"),
    ("../../examples/", "https://github.com/URML-MARS/URML/tree/main/examples/"),
    ("../../reference/validator/src/urml_validator/policies/us_federal_default.yaml", "https://github.com/URML-MARS/URML/blob/main/reference/validator/src/urml_validator/policies/us_federal_default.yaml"),
    ("../../reference/validator/", "https://github.com/URML-MARS/URML/tree/main/reference/validator/"),
    ("../rfcs/0005-hbom-parsing.md", "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0005-hbom-parsing.md"),
    ("../tutorials/01-getting-started.md", "https://github.com/URML-MARS/URML/blob/main/docs/tutorials/01-getting-started.md"),
    ("../tutorials/04-writing-your-own-manifest.md", "https://github.com/URML-MARS/URML/blob/main/docs/tutorials/04-writing-your-own-manifest.md"),
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
            # The website is a rendering layer. If the core repo has not
            # published this file yet (e.g. it lives only on a feature
            # branch, or the registry work hasn't been merged to the default
            # branch), fall back to the committed snapshot already in this
            # repo rather than failing the whole deploy. The snapshot is the
            # last-known-good link-rewritten copy. When core publishes the
            # file on the branch this script clones, it supersedes the
            # snapshot automatically on the next build.
            if target.is_file():
                print(
                    f"  WARN source missing in core ({source}); "
                    f"keeping committed snapshot {target}"
                )
                continue
            sys.exit(
                f"sync_from_core: source missing in core AND no snapshot "
                f"present: {target}. Cannot render this page."
            )
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
