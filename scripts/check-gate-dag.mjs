#!/usr/bin/env node
// Gate DAG guard. Proves schemas/gate-graph.json is a well-formed dependency
// graph: it has no cycle and every referenced dependency gate is itself a
// declared gate (no dangling edge). The fixture maps a gate to the list of
// gates it depends on, so an edge gate -> dependency means "gate needs
// dependency first". On success the topological order is printed with each
// gate's dependencies ahead of it.
// Usage: node scripts/check-gate-dag.mjs [path/to/gate-graph.json]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { isCyclic, topoSort } from "./lib/graph.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = resolve(here, "../schemas/gate-graph.json");

// gateGraphErrors(graph) -> { errors: [...], order: [...] }
// `errors` lists every defect (dangling edge or cycle); when it is empty,
// `order` holds a topological ordering with dependencies before dependents.
export function gateGraphErrors(graph) {
  const errors = [];
  const gates = Object.keys(graph);
  const declared = new Set(gates);

  // (1) No dangling edge: every dependency must be a declared gate.
  for (const gate of gates) {
    for (const dep of graph[gate]) {
      if (!declared.has(dep)) {
        errors.push(`dangling edge: ${gate} -> ${dep} (${dep} is not a declared gate)`);
      }
    }
  }

  // (2) No cycle. Detect this regardless of dangling edges so the report names
  // the offending loop even when an edge is also missing a target.
  const { cyclic, cycle } = isCyclic(graph);
  if (cyclic) {
    errors.push(`cycle detected: ${cycle.join(" -> ")}`);
  }

  if (errors.length > 0) return { errors, order: [] };

  // topoSort orders a gate ahead of the gates it points to; reverse so each
  // gate's dependencies appear before the gate itself.
  const { order } = topoSort(graph, gates);
  order.reverse();
  return { errors, order };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2] || DEFAULT_PATH;
  const graph = JSON.parse(readFileSync(path, "utf8"));
  const { errors, order } = gateGraphErrors(graph);
  if (errors.length > 0) {
    console.error(`Gate graph invalid: ${path}`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`Gate graph valid: ${path}`);
  console.log("Topological order (dependencies first):");
  for (const gate of order) console.log("  " + gate);
}
