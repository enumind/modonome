#!/usr/bin/env node
/**
 * AP-24: Gate dependencies form an acyclic graph (DAG)
 *
 * Attack: A circular dependency (A->B->C->A) is declared in the gate graph.
 * Pipeline deadlocks, runs in arbitrary order, or re-opens AP-18 non-determinism
 * at the configuration layer. Attacker forces soft gate to run first, shorts hard gate.
 *
 * Governance property: Gate dependency graph MUST be a DAG; topological order
 * MUST exist and be consistent with AP-18 precedence. All referenced gates exist.
 * No dangling edges, no cycles.
 *
 * check-gate-dag.mjs accepts an optional path argument (Usage: node
 * scripts/check-gate-dag.mjs [path/to/gate-graph.json]); when omitted it loads
 * schemas/gate-graph.json. This scenario exercises the default path for the
 * valid-graph case and passes explicit fixture paths for the failure cases.
 *
 * Expected outcomes:
 *   schemas/gate-graph.json (default)      -> exit 0, topo order printed
 *   fixtures/gate-deps-cyclic.json         -> exit 1, error names the cycle
 *   fixtures/gate-deps-dangling.json       -> exit 1, error names missing gate
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const dagChecker = join(root, "scripts/check-gate-dag.mjs");
const fixtures = join(here, "../fixtures");

if (!existsSync(dagChecker)) {
  console.error("FAIL: scripts/check-gate-dag.mjs does not exist (control not implemented)");
  process.exit(1);
}

let passed = true;

// --- case 1: default path (schemas/gate-graph.json) must exit 0 with topo order ---
// check-gate-dag.mjs supports an optional path arg; when omitted it reads the
// canonical schemas/gate-graph.json. We invoke it without an arg here.
const valid = spawnSync("node", [dagChecker], { encoding: "utf8" });
if (valid.status !== 0) {
  console.error("FAIL [default-graph]: dag checker rejected schemas/gate-graph.json (exit 1, expected 0)");
  console.error(valid.stderr + valid.stdout);
  passed = false;
} else {
  const out = valid.stdout;
  if (!out.includes("Topological order")) {
    console.error("FAIL [default-graph]: exit 0 but topological order not printed");
    console.error(out);
    passed = false;
  } else {
    console.log("PASS [default-graph]: schemas/gate-graph.json is a valid DAG, topo order printed");
  }
}

// --- case 2: cyclic graph must exit 1 and name the cycle ---
const cyclic = spawnSync("node", [dagChecker, join(fixtures, "gate-deps-cyclic.json")], { encoding: "utf8" });
if (cyclic.status === 0) {
  console.error("FAIL [cyclic]: dag checker accepted a cyclic graph (exit 0, expected 1)");
  passed = false;
} else {
  const msg = cyclic.stderr + cyclic.stdout;
  if (!msg.toLowerCase().includes("cycle")) {
    console.error("FAIL [cyclic]: exit 1 but error does not name the cycle");
    console.error(msg);
    passed = false;
  } else {
    console.log("PASS [cyclic]: cyclic graph rejected with cycle named in output");
  }
}

// --- case 3: dangling-edge graph must exit 1 and name the missing gate ---
const dangling = spawnSync("node", [dagChecker, join(fixtures, "gate-deps-dangling.json")], { encoding: "utf8" });
if (dangling.status === 0) {
  console.error("FAIL [dangling]: dag checker accepted a graph with a dangling edge (exit 0, expected 1)");
  passed = false;
} else {
  const msg = dangling.stderr + dangling.stdout;
  // The checker prints "dangling edge: <gate> -> <missing>" so the missing gate
  // name appears in the output. Verify that the word "dangling" (or "missing") is present.
  if (!msg.toLowerCase().includes("dangling") && !msg.toLowerCase().includes("missing")) {
    console.error("FAIL [dangling]: exit 1 but error does not name the missing gate");
    console.error(msg);
    passed = false;
  } else {
    console.log("PASS [dangling]: dangling-edge graph rejected with missing gate named in output");
  }
}

if (!passed) process.exit(1);
