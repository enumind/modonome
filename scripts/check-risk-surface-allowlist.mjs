#!/usr/bin/env node
// Validates the risk-surface-guard suppression allowlist (ADR-047 decision 11).
// This is an author-feedback gate, not the trust boundary: the trust boundary is
// the base-pinned checkout of .modonome/risk-surface-allowlist.json and its loader
// in ci.yml (see scripts/lib/risk-surface-allowlist.mjs). This gate exists so a
// malformed entry is caught on the pull request that introduces it, instead of
// silently suppressing nothing a review cycle later once the base-pinned copy
// is the one actually in effect.
//
// Usage: node scripts/check-risk-surface-allowlist.mjs [path]
// path defaults to .modonome/risk-surface-allowlist.json.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseAllowlist } from "./lib/risk-surface-allowlist.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

const path = process.argv[2] || join(root, ".modonome", "risk-surface-allowlist.json");

console.log("Risk Surface Guard allowlist validation (ADR-047)");
console.log("=================================================");

if (!existsSync(path)) {
  console.log(`PASS: ${path} not present; zero suppressions is the default state.`);
  process.exit(0);
}

const { entries, errors } = parseAllowlist(readFileSync(path, "utf8"));
if (errors.length === 0) {
  console.log(`PASS: ${entries.length} allowlist entr${entries.length === 1 ? "y" : "ies"} valid.`);
  process.exit(0);
}

console.error(formatMessage("gate.check-risk-surface-allowlist.fail-summary", { count: errors.length }, overrides).message);
for (const e of errors) console.error("  - " + e);
process.exit(1);
