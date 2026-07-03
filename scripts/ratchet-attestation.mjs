#!/usr/bin/env node
// Emit an in-toto Statement attesting the gate-integrity verdict for the current change.
// The predicate records the ratchet verdict per MR category and the base and head
// commits the gate ran across, so a downstream verifier can confirm the tests were not
// weakened between source and artifact without trusting this repo. In CI, sign the
// Statement keyless with actions/attest (Sigstore, Rekor). Maker and checker separation
// maps onto SLSA v1.2 Source Track two-party review; this attests the gate-integrity
// property alongside it.
//
// Usage:
//   node scripts/ratchet-attestation.mjs [baseRef] [--out <file>] [--agentproof]
//
// Generation always succeeds (exit 0). The verdict lives inside the predicate, so a
// failing gate still produces a receipt that records the failure.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("-")) || "origin/main";
const outIdx = args.indexOf("--out");
const outFile = outIdx !== -1 ? args[outIdx + 1] : null;
const withAgentProof = args.includes("--agentproof");

function git(...a) {
  const r = spawnSync("git", a, { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const headSha = git("rev-parse", "HEAD");
const baseSha = git("rev-parse", base);
const repo = process.env.GITHUB_REPOSITORY || pkg.name;
// A stable timestamp from the commit itself, not wall-clock, so the receipt is
// reproducible for a given commit.
const committerDate = git("show", "-s", "--format=%cI", "HEAD");

// Run the ratchet in JSON mode for the verdict and findings.
const rj = spawnSync("node", [join(root, "scripts", "guard-ratchet.mjs"), base, "--json"], { encoding: "utf8" });
let report;
try {
  report = JSON.parse(rj.stdout);
} catch {
  report = { result: rj.status === 0 ? "pass" : "fail", findings: [] };
}

const findings = report.findings || [];
const categories = {};
for (const f of findings) categories[f.code] = (categories[f.code] || 0) + 1;

// AgentProof level is optional and off by default because the suite takes a few seconds.
let agentProof = null;
if (withAgentProof) {
  const ap = spawnSync("node", [join(root, "agentproof", "runner.mjs"), "--json"], { encoding: "utf8" });
  try {
    agentProof = JSON.parse(ap.stdout);
  } catch {
    agentProof = null;
  }
}

const statement = {
  _type: "https://in-toto.io/Statement/v1",
  subject: [{ name: repo, digest: { gitCommit: headSha } }],
  predicateType: "https://modonome.com/attestation/gate-integrity/v1",
  predicate: {
    verdict: report.result === "pass" ? "pass" : "fail",
    tool: "modonome-gate-integrity",
    toolVersion: pkg.version,
    baseRef: base,
    baseCommit: baseSha,
    headCommit: headSha,
    categories,
    findings: findings.map((f) => ({ code: f.code, rule: f.rule, file: f.file })),
    agentProof,
    timestamp: committerDate || null,
  },
};

const text = JSON.stringify(statement, null, 2) + "\n";
if (outFile) {
  writeFileSync(outFile, text);
  console.error(`wrote ${outFile} (verdict: ${statement.predicate.verdict})`);
} else {
  process.stdout.write(text);
}
process.exit(0);
