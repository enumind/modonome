#!/usr/bin/env node
// Trust-boundary guard. A gate that judges a pull request must not be loadable
// from the pull request itself, or the change can weaken the gate that judges it.
// This check proves that, before the workflow executes each trust-boundary gate,
// it first checks the gate's source out from the trusted base branch
// (git checkout "origin/${{ github.base_ref }}" -- <gate>) on a pull_request run.
// One source of truth, checked by machine. No external call.
//
// Usage: node scripts/check-trust-boundary.mjs [path/to/ci.yml]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));
const workflowPath = process.argv[2] || join(root, ".github", "workflows", "ci.yml");

const TRUST_BOUNDARY_GATES = ["scripts/check-style.mjs", "scripts/guard-ratchet.mjs"];

const lines = readFileSync(workflowPath, "utf8").split("\n");
const problems = [];

// Walk the workflow top to bottom. For each gate, the first line that loads it
// from the base branch must appear before the first line that executes it.
for (const gate of TRUST_BOUNDARY_GATES) {
  let guardLine = -1;
  let runLine = -1;
  lines.forEach((line, i) => {
    if (!line.includes(gate)) return;
    // A base-branch checkout guard: git checkout origin/<base_ref> -- <gate>.
    if (guardLine === -1 && /git\s+checkout\s+["']?origin\/\$\{\{\s*github\.base_ref\s*\}\}["']?\s+--\s/.test(line)) {
      guardLine = i;
      return;
    }
    // Execution of the gate: node <gate> ...
    if (runLine === -1 && /node\s+/.test(line)) runLine = i;
  });

  if (runLine === -1) {
    problems.push(formatMessage("gate.trust-boundary.not-executed", { gate }, overrides).message);
    continue;
  }
  if (guardLine === -1) {
    problems.push(formatMessage("gate.trust-boundary.missing-guard", { gate }, overrides).message);
    continue;
  }
  if (guardLine > runLine) {
    problems.push(formatMessage("gate.trust-boundary.guard-after-run", { gate, runLine: runLine + 1, guardLine: guardLine + 1 }, overrides).message);
  }
}

console.log("Trust-boundary guard");
console.log("====================");
if (problems.length === 0) {
  console.log(`PASS: ${TRUST_BOUNDARY_GATES.length} trust-boundary gate(s) loaded from the base branch before execution.`);
  process.exit(0);
}
console.error(formatMessage("gate.trust-boundary.fail-summary", { count: problems.length }, overrides).message);
for (const p of problems) console.error("  - " + p);
process.exit(1);
