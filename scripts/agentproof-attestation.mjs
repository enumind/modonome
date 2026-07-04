#!/usr/bin/env node
// Emit an in-toto Statement attesting an AgentProof conformance run for the current
// commit. This is a first-class, standalone attestation: its own subject and its own
// predicate type, so a score can be verified and referenced independently, without
// going through any other claim. It is a companion to scripts/ratchet-attestation.mjs,
// not a replacement: that script's existing --agentproof flag embeds an AgentProof
// score as a sub-field of the gate-integrity predicate (extra context on a diff-based
// verdict); this script's Statement is the AgentProof run itself as the subject of the
// claim. See docs/adr/ADR-039-agentproof-verified.md for why the two are separate.
//
// In CI, sign the Statement keyless with actions/attest (Sigstore, Rekor), the same
// pattern scripts/ratchet-attestation.mjs uses for the gate-integrity receipt.
//
// Usage:
//   node scripts/agentproof-attestation.mjs [--out <file>]
//
// Generation always succeeds (exit 0). The score and level live inside the predicate,
// so a low score still produces a receipt that records it, matching
// ratchet-attestation.mjs's own design ("a failing gate still produces a receipt that
// records the failure").
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outFile = outIdx !== -1 ? args[outIdx + 1] : null;

function git(...a) {
  const r = spawnSync("git", a, { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

function parseFraction(s) {
  if (typeof s !== "string") return null;
  const m = s.match(/^(\d+)\/(\d+)$/);
  return m ? { passed: Number(m[1]), total: Number(m[2]) } : null;
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const headSha = git("rev-parse", "HEAD");
const repo = process.env.GITHUB_REPOSITORY || pkg.name;
// A stable timestamp from the commit itself, not wall-clock, so the receipt is
// reproducible for a given commit.
const committerDate = git("show", "-s", "--format=%cI", "HEAD");

// Run AgentProof in JSON mode for the score, level, and per-scenario results.
const rj = spawnSync("node", [join(root, "agentproof", "runner.mjs"), "--json"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
  timeout: 120000,
});
let report;
try {
  report = JSON.parse(rj.stdout);
} catch {
  report = { score: null, extended_score: undefined, total_score: null, elapsed_s: null, results: [] };
}

const results = Array.isArray(report.results) ? report.results : [];
// Per-category (per-scenario) pass/fail breakdown, trimmed to the stable identifying
// fields. The raw stdout/stderr capture on a failing scenario is left out of the
// predicate: it is diagnostic detail for a human run, not part of the signed claim.
const categories = results.map((r) => ({ id: r.id, file: r.file, title: r.title, passed: r.passed }));

const normative = parseFraction(report.score);
const extended = parseFraction(report.extended_score);
let level = "UNKNOWN";
if (normative) {
  if (normative.passed === normative.total && (!extended || extended.passed === extended.total)) {
    level = "HARDENED";
  } else if (normative.passed >= 20) {
    level = "PARTIAL";
  } else {
    level = "UNHARDENED";
  }
}

const statement = {
  _type: "https://in-toto.io/Statement/v1",
  subject: [{ name: repo, digest: { gitCommit: headSha } }],
  predicateType: "https://modonome.com/attestation/agentproof-conformance/v1",
  predicate: {
    tool: "modonome-agentproof",
    toolVersion: pkg.version,
    headCommit: headSha,
    score: report.score || null,
    extendedScore: report.extended_score || null,
    totalScore: report.total_score || null,
    level,
    categories,
    timestamp: committerDate || null,
  },
};

const text = JSON.stringify(statement, null, 2) + "\n";
if (outFile) {
  writeFileSync(outFile, text);
  console.error(`wrote ${outFile} (score: ${statement.predicate.score}, level: ${level})`);
} else {
  process.stdout.write(text);
}
process.exit(0);
