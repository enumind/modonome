#!/usr/bin/env node
// Gate pipeline runner. Runs the project's gate checks in dependency order and
// reports which ones failed. The dependency order is taken from
// schemas/gate-graph.json (a gate maps to the gates it depends on); the gates
// are then run with each gate's dependencies ahead of it, the same order
// check-gate-dag.mjs proves is acyclic.
//
// Two gates run today:
//   ratchet    - anti-gaming ratchet over a saved unified diff (--diff fixture)
//   work-item  - work-item schema + governance validation (--work-item fixture)
//
// Failures are collected in topological order and printed to stdout as a JSON
// array. The process exits 0 when every gate passes and 1 when any gate fails.
// Ordering is derived only from the topological order array, never from
// unordered object iteration, so the output is deterministic.
//
// Usage:
//   node scripts/run-gate-pipeline.mjs --diff <file> --work-item <file>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { topoSort } from "./lib/graph.mjs";
import { runGateCapped } from "./lib/run-gate-capped.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const GATE_GRAPH_PATH = resolve(here, "../schemas/gate-graph.json");

// The fixed gate registry. Each gate names the script that runs it and builds
// its argument vector from the parsed CLI fixtures. Keeping this an explicit map
// (not discovered from the filesystem) means the set of gates is auditable and
// the run order is fully determined by the dependency graph.
const GATES = {
  ratchet: {
    arg: "diff",
    command: (fixture) => ["node", resolve(here, "guard-ratchet.mjs"), "--diff", fixture],
  },
  "work-item": {
    arg: "work-item",
    command: (fixture) => ["node", resolve(here, "validate-work-item.mjs"), fixture],
  },
};

// parseArgs(argv) -> { diff, "work-item" } map of fixture paths by gate arg name.
function parseArgs(argv) {
  const fixtures = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--diff") fixtures.diff = argv[++i];
    else if (flag === "--work-item") fixtures["work-item"] = argv[++i];
  }
  return fixtures;
}

// gateOrder(graph) -> [...] the gates in dependency-first topological order.
// topoSort orders a gate ahead of the gates it points to, so reverse to put each
// gate's dependencies before the gate itself.
export function gateOrder(graph) {
  const gates = Object.keys(graph);
  const { order, error } = topoSort(graph, gates);
  if (error) throw new Error(error);
  order.reverse();
  return order;
}

// runPipeline(order, fixtures) -> [...] failures in topological order.
// Each failure is { gate, reason }. A missing fixture for a gate is itself a
// failure: the gate cannot be evaluated, so the pipeline must not pass silently.
export function runPipeline(order, fixtures) {
  const failures = [];
  for (const gate of order) {
    const spec = GATES[gate];
    if (!spec) {
      failures.push({ gate, reason: `no registered check for gate "${gate}"` });
      continue;
    }
    const fixture = fixtures[spec.arg];
    if (!fixture) {
      failures.push({ gate, reason: `missing --${spec.arg} fixture` });
      continue;
    }
    const result = runGateCapped(spec.command(fixture));
    if (result.timedOut) {
      failures.push({ gate, reason: `timed out`, fixture });
    } else if (result.status !== 0) {
      failures.push({
        gate,
        reason: (result.stderr || result.stdout).trim() || `exited ${result.status}`,
        fixture,
      });
    }
  }
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const graph = JSON.parse(readFileSync(GATE_GRAPH_PATH, "utf8"));
  const order = gateOrder(graph);
  const fixtures = parseArgs(process.argv.slice(2));
  const failures = runPipeline(order, fixtures);

  if (failures.length > 0) {
    console.log(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log("[]");
}
