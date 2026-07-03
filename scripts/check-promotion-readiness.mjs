#!/usr/bin/env node
// Capability promotion gate (ADR-024). High-risk capabilities ship off by default
// and may only become default-on with an owner promotion ADR that carries evidence.
// This gate fails if any capability flag defaults to on without such an ADR. Runs in
// CI with no external call.
//
// Usage: node scripts/check-promotion-readiness.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";
import { CAPABILITY_FLAGS } from "./lib/capability-flags.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// optional --root <dir> flag allows tests to point at a temp directory.
let root = join(here, "..");
{
  const rootIdx = process.argv.indexOf("--root");
  if (rootIdx !== -1 && process.argv[rootIdx + 1]) {
    root = process.argv[rootIdx + 1];
  }
}
const problems = [];

// Capability flags (CAPABILITY_FLAGS) are shared with the policy attestation
// (scripts/lib/policy-manifest.mjs) so the disclosed capability set and the promotion
// gate stay in lockstep.

// A promotion ADR must demonstrate evidence-based readiness, not faith.
// Sections must appear as Markdown headings; mere substring presence is insufficient.
const REQUIRED_ADR_SECTIONS = ["observation window", "evidence", "rollback", "promotion"];

function configDefaults(rel) {
  const path = join(root, rel);
  return existsSync(path) ? parseFlatYaml(readFileSync(path, "utf8")) : {};
}

// Check that a section appears as a Markdown heading (h1-h6), so a one-line
// ADR with the section words buried in prose cannot game the gate.
function hasHeading(text, section) {
  return new RegExp(`^#{1,6}\\s+${section}`, "im").test(text);
}

function findPromotionAdr(flag) {
  const adrDir = join(root, "docs", "adr");
  if (!existsSync(adrDir)) return null;
  for (const f of readdirSync(adrDir).filter((f) => f.endsWith(".md"))) {
    const text = readFileSync(join(adrDir, f), "utf8");
    if (text.includes(flag) && REQUIRED_ADR_SECTIONS.every((s) => hasHeading(text, s))) {
      return f;
    }
  }
  return null;
}

const sources = {
  "templates/.modonome/config.yaml": configDefaults("templates/.modonome/config.yaml"),
  ".modonome/config.yaml": configDefaults(".modonome/config.yaml"),
};

for (const [name, cfg] of Object.entries(sources)) {
  for (const flag of CAPABILITY_FLAGS) {
    if (cfg[flag] === true) {
      const adr = findPromotionAdr(flag);
      if (!adr) {
        problems.push(`${name}: ${flag} is default-on but no promotion ADR (with observation window, evidence, rollback) was found.`);
      }
    }
  }
}

console.log("Capability promotion readiness (ADR-024)");
console.log("========================================");
if (problems.length === 0) {
  console.log("PASS: no capability ships default-on without an evidence-backed promotion ADR.");
  process.exit(0);
}
console.error(`FAIL: ${problems.length} promotion problem(s):\n`);
for (const p of problems) console.error("  - " + p);
process.exit(1);
