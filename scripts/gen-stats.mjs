// Build-time stats generator. The website is a rendering layer; the real
// numbers live in URML-MARS/URML. This reads a local core checkout (the
// `urml-core/` clone Netlify makes before the build, or a sibling ../URML)
// and emits src/data/stats.ts, so the homepage / footer / governance counts
// self-update on every deploy instead of being hand-chased.
//
//   node scripts/gen-stats.mjs ../URML        # local (sibling clone)
//   node scripts/gen-stats.mjs ./urml-core    # CI checkout
//
// Snapshot-fallback (keep the committed src/data/stats.ts when core is
// unreachable or a field can't be parsed) mirrors sync-from-core.mjs, so a
// build never breaks just because core is missing.

import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, "..", "src", "data", "stats.ts");

function keepSnapshot(reason) {
  if (existsSync(outFile)) {
    console.log(`gen-stats: ${reason}; keeping committed src/data/stats.ts`);
    process.exit(0);
  }
  console.error(`gen-stats: ${reason} AND no committed snapshot exists`);
  process.exit(1);
}

const coreArg = process.argv[2];
if (!coreArg) keepSnapshot("no core path given");
const core = resolve(coreArg);
if (!existsSync(core)) keepSnapshot(`core checkout not found at ${core}`);

const read = (rel) => {
  const p = resolve(core, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
};

// --- deterministic counts (from the filesystem) -------------------------
function countDir(rel, predicate) {
  const dir = resolve(core, rel);
  if (!existsSync(dir)) return null;
  return readdirSync(dir, { recursive: true, withFileTypes: true }).filter(predicate).length;
}

const rfcs = countDir("docs/rfcs", (d) => d.isFile() && /^\d{4}-.*\.md$/.test(d.name));
const fixtures = countDir("conformance/fixtures", (d) => d.isFile() && d.name.endsWith(".yaml"));
const runtimes = (() => {
  const dir = resolve(core, "reference");
  if (!existsSync(dir)) return null;
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name.endsWith("-runtime")).length;
})();

// --- versions -----------------------------------------------------------
const pyproject = read("reference/validator/pyproject.toml");
const releaseVersion = pyproject?.match(/^version\s*=\s*"([^"]+)"/m)?.[1] ?? null;

const specVersion = (() => {
  const dir = resolve(core, "spec/layer-1-hal");
  if (!existsSync(dir)) return null;
  const vs = readdirSync(dir)
    .map((f) => f.match(/^v(\d+)\.(\d+)\.(\d+)\.md$/))
    .filter(Boolean)
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
  if (!vs.length) return null;
  vs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return vs[vs.length - 1].join(".");
})();

// --- audited numbers (from claims-audit.md; pytest can't run at build) ---
const audit = read("docs/launch/claims-audit.md");
const tests = Number(audit?.match(/\*\*Total\*\*\s*\|\s*\*\*([\d,]+)\s*passed/)?.[1]?.replace(/,/g, "")) || null;
const primitives = Number(audit?.match(/\*\*(\d+)\s+primitives/)?.[1]) || null;

// --- Spec-RFC tally (from the docs/rfcs/README.md Kind column) ----------
const rfcIndex = read("docs/rfcs/README.md");
const specRfc = (() => {
  if (!rfcIndex) return null;
  const rows = rfcIndex.split("\n").filter((l) => /^\|\s*\[\d{4}\][^|]*\|\s*Spec\s*\|/.test(l));
  if (!rows.length) return null;
  const tally = { total: rows.length, accepted: 0, implemented: 0, draft: 0, open: 0 };
  for (const r of rows) {
    const s = r.match(/\|\s*(Accepted|Implemented|Draft|Open)\s*\|/i)?.[1]?.toLowerCase();
    if (s && s in tally) tally[s] += 1;
  }
  return tally;
})();

// --- assemble; fall back to the committed snapshot on any missing field --
const required = { rfcs, fixtures, runtimes, releaseVersion, specVersion, tests, primitives, specRfc };
const missing = Object.entries(required).filter(([, v]) => v == null).map(([k]) => k);
if (missing.length) keepSnapshot(`could not derive: ${missing.join(", ")}`);

const stats = {
  releaseVersion,
  specVersion,
  validationPasses: 5,
  primitives,
  tests,
  fixtures,
  runtimes,
  rfcs,
  specRfcs: specRfc.total,
  specRfcAccepted: specRfc.accepted,
  specRfcImplemented: specRfc.implemented,
  specRfcDraft: specRfc.draft,
  specRfcOpen: specRfc.open,
};

const banner =
  "// GENERATED at build time by scripts/gen-stats.mjs from the URML core\n" +
  "// checkout. Do not hand-edit the numbers; run the generator (or let\n" +
  "// Netlify run it). The committed copy is the offline-build fallback.\n";
const body = `${banner}\nexport const stats = ${JSON.stringify(stats, null, 2)} as const;\n`;
writeFileSync(outFile, body, "utf8");
console.log(`gen-stats: wrote src/data/stats.ts (release ${releaseVersion}, spec ${specVersion}, ${rfcs} RFCs, ${fixtures} fixtures, ${tests} tests)`);
