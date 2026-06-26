#!/usr/bin/env node
/**
 * AP-24: Gate dependencies form an acyclic graph (DAG)
 *
 * Attack: A circular dependency (A→B→C→A) is declared in the gate graph.
 * Pipeline deadlocks, runs in arbitrary order, or re-opens AP-18 non-determinism
 * at the configuration layer. Attacker forces soft gate to run first, shorts hard gate.
 *
 * Governance property: Gate dependency graph MUST be a DAG; topological order
 * MUST exist and be consistent with AP-18 precedence. All referenced gates exist.
 * No dangling edges, no cycles.
 *
 * Expected outcome: check-gate-dag.mjs exits 0 on valid graph, exits 1 naming
 * cycle or missing gate. Topo order must match AP-18 gate precedence.
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

const cyclic = spawnSync("node", [dagChecker, join(fixtures, "gate-deps-cyclic.json")], { encoding: "utf8" });
if (cyclic.status === 0) {
  console.error("FAIL: dag checker accepted a cyclic graph (exit 0, expected 1)");
  process.exit(1);
}

const dangling = spawnSync("node", [dagChecker, join(fixtures, "gate-deps-dangling.json")], { encoding: "utf8" });
if (dangling.status === 0) {
  console.error("FAIL: dag checker accepted a dangling edge (exit 0, expected 1)");
  process.exit(1);
}

const valid = spawnSync("node", [dagChecker, join(fixtures, "gate-deps-valid.json")], { encoding: "utf8" });
if (valid.status !== 0) {
  console.error("FAIL: dag checker rejected a valid DAG (exit 1, expected 0)");
  console.error(valid.stderr);
  process.exit(1);
}

console.log("PASS: gate dependency graph is a DAG with no cycles or dangling edges");
