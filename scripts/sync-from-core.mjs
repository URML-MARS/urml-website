// Astro port of scripts/sync_from_core.py — the website is a rendering
// layer; canonical content lives in URML-MARS/URML. This copies the
// seven canonical docs from a core checkout into src/content/core/,
// applying the SAME ordered link rewrites as the Python script, then a
// second pass turning the resulting site-internal *.md links into Astro
// routes. Snapshot-fallback (keep the committed copy if core lacks the
// file) mirrors the Python resilience model.
//
//   node scripts/sync-from-core.mjs ../URML        # local (sibling clone)
//   node scripts/sync-from-core.mjs ./urml-core    # CI checkout

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GH = "https://github.com/URML-MARS/URML";

// (source-in-core, destination-slug). Slug = the page's route + the
// src/content/core/<slug>.md filename.
const FILES = [
  ["docs/compatible-runtimes.md", "compatible-runtimes"],
  ["docs/registry/SUBMISSION.md", "submit"],
  ["TRADEMARK.md", "trademark"],
  ["docs/manufacturers/README.md", "manufacturers"],
  ["docs/manufacturers/directory.md", "manufacturer-directory"],
  ["docs/manufacturers/SUBMISSION.md", "list-your-product"],
  ["docs/manufacturers/FEDERAL-VALIDATION-SELF-REPORT.md", "manufacturer-federal-validation"],
];

// Ported verbatim from sync_from_core.py LINK_REWRITES. Order matters
// (str.replace semantics): longer patterns before their prefixes.
const LINK_REWRITES = [
  ["../../conformance/README.md", `${GH}/blob/main/conformance/README.md`],
  ["../../conformance/", `${GH}/tree/main/conformance/`],
  ["../conformance/README.md", `${GH}/blob/main/conformance/README.md`],
  ["../conformance/", `${GH}/tree/main/conformance/`],
  ["(conformance/)", `(${GH}/tree/main/conformance/)`],
  ["../../TRADEMARK.md", "trademark.md"],
  ["../TRADEMARK.md", "trademark.md"],
  ["(TRADEMARK.md)", "(trademark.md)"],
  ["../../docs/registry/SUBMISSION.md", "submit.md"],
  ["../docs/registry/SUBMISSION.md", "submit.md"],
  ["(docs/registry/SUBMISSION.md)", "(submit.md)"],
  ["../registry/SUBMISSION.md", "submit.md"],
  ["(registry/SUBMISSION.md)", "(submit.md)"],
  ["../../docs/compatible-runtimes.md", "compatible-runtimes.md"],
  ["../docs/compatible-runtimes.md", "compatible-runtimes.md"],
  ["(docs/compatible-runtimes.md)", "(compatible-runtimes.md)"],
  ["../compatible-runtimes.md", "compatible-runtimes.md"],
  ["GOVERNANCE.md#trademark-policy", `${GH}/blob/main/GOVERNANCE.md#trademark-policy`],
  ["../GOVERNANCE.md", `${GH}/blob/main/GOVERNANCE.md`],
  ["(GOVERNANCE.md)", `(${GH}/blob/main/GOVERNANCE.md)`],
  ["../../CORE_COMMITMENT.md", `${GH}/blob/main/CORE_COMMITMENT.md`],
  ["../CORE_COMMITMENT.md", `${GH}/blob/main/CORE_COMMITMENT.md`],
  ["(CORE_COMMITMENT.md)", `(${GH}/blob/main/CORE_COMMITMENT.md)`],
  ["../MANIFESTO.md", "manifesto.md"],
  ["(MANIFESTO.md)", "(manifesto.md)"],
  ["../CONTRIBUTING.md", `${GH}/blob/main/CONTRIBUTING.md`],
  ["(CONTRIBUTING.md)", `(${GH}/blob/main/CONTRIBUTING.md)`],
  ["../../docs/rfcs/0001-rfc-process.md", `${GH}/blob/main/docs/rfcs/0001-rfc-process.md`],
  ["../docs/rfcs/0001-rfc-process.md", `${GH}/blob/main/docs/rfcs/0001-rfc-process.md`],
  ["(docs/rfcs/0001-rfc-process.md)", `(${GH}/blob/main/docs/rfcs/0001-rfc-process.md)`],
  ["(docs/manufacturers/directory.md)", "(manufacturer-directory.md)"],
  ["(docs/manufacturers/SUBMISSION.md)", "(list-your-product.md)"],
  ["(docs/manufacturers/FEDERAL-VALIDATION-SELF-REPORT.md)", "(manufacturer-federal-validation.md)"],
  ["(manufacturers/directory.md)", "(manufacturer-directory.md)"],
  ["(FEDERAL-VALIDATION-SELF-REPORT.md)", "(manufacturer-federal-validation.md)"],
  ["(directory.md)", "(manufacturer-directory.md)"],
  ["(SUBMISSION.md)", "(list-your-product.md)"],
  ["(README.md)", "(manufacturers.md)"],
  ["../../examples/", `${GH}/tree/main/examples/`],
  ["../../reference/validator/src/urml_validator/policies/us_federal_default.yaml", `${GH}/blob/main/reference/validator/src/urml_validator/policies/us_federal_default.yaml`],
  ["../../reference/validator/", `${GH}/tree/main/reference/validator/`],
  ["../rfcs/0005-hbom-parsing.md", `${GH}/blob/main/docs/rfcs/0005-hbom-parsing.md`],
  ["../tutorials/01-getting-started.md", `${GH}/blob/main/docs/tutorials/01-getting-started.md`],
  ["../tutorials/04-writing-your-own-manifest.md", `${GH}/blob/main/docs/tutorials/04-writing-your-own-manifest.md`],
];

// Second pass: the site-internal *.md targets the rewrites produce
// resolve as MkDocs page names; on Astro they are routes. No core page
// exists for manifesto -> route to /what (matches _redirects).
const ROUTE_REWRITES = [
  ["(compatible-runtimes.md)", "(/compatible-runtimes)"],
  ["(trademark.md)", "(/trademark)"],
  ["(submit.md)", "(/submit)"],
  ["(manufacturers.md)", "(/manufacturers)"],
  ["(manufacturer-directory.md)", "(/manufacturer-directory)"],
  ["(list-your-product.md)", "(/list-your-product)"],
  ["(manufacturer-federal-validation.md)", "(/manufacturer-federal-validation)"],
  ["(manifesto.md)", "(/what)"],
  ["(contact.md)", "(/contact)"],
];

const apply = (text, pairs) => pairs.reduce((t, [p, r]) => t.split(p).join(r), text);

function titleOf(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "URML";
}
// YAML-safe double-quoted scalar.
const yq = (s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function main() {
  const coreArg = process.argv[2];
  if (!coreArg) {
    console.error("usage: node scripts/sync-from-core.mjs <path-to-core-checkout>");
    process.exit(2);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const coreRoot = resolve(coreArg);
  const outDir = resolve(here, "..", "src", "content", "core");
  mkdirSync(outDir, { recursive: true });
  console.log(`syncing from ${coreRoot} -> ${outDir}`);

  for (const [src, slug] of FILES) {
    const source = resolve(coreRoot, src);
    const target = resolve(outDir, `${slug}.md`);
    if (!existsSync(source)) {
      if (existsSync(target)) {
        console.log(`  WARN source missing in core (${source}); keeping committed snapshot ${slug}.md`);
        continue;
      }
      console.error(`sync-from-core: source missing in core AND no snapshot: ${slug}.md`);
      process.exit(1);
    }
    let text = readFileSync(source, "utf8");
    text = apply(text, LINK_REWRITES);
    text = apply(text, ROUTE_REWRITES);
    const fm = `---\ntitle: ${yq(titleOf(text))}\nsynced_from: ${yq(src)}\n---\n\n`;
    writeFileSync(target, fm + text, "utf8");
    console.log(`  ${source} -> ${slug}.md`);
  }
  console.log("done");
}

main();
