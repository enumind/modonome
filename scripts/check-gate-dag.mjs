#!/usr/bin/env node
// Gate DAG guard. Proves schemas/gate-graph.json is a well-formed dependency
// graph: it has no cycle and every referenced dependency gate is itself a
// declared gate (no dangling edge). The fixture maps a gate to the list of
// gates it depends on, so an edge gate -> dependency means "gate needs
// dependency first". On success the topological order is printed with each
// gate's dependencies ahead of it.
//
// It also proves a second, orthogonal graph property: the determinism boundary.
// The deterministic detectors must never import the near-miss widener, so
// "fuzzy can only tighten, never override" is a checked import-graph property,
// not a convention. Both checks share one exit code; either failing fails CI.
// Usage: node scripts/check-gate-dag.mjs [path/to/gate-graph.json]
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, sep } from "node:path";
import { isCyclic, topoSort, reachableFrom } from "./lib/graph.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = resolve(here, "../schemas/gate-graph.json");
const REPO_ROOT = resolve(here, "..");
const overrides = loadMessageOverrides(resolve(REPO_ROOT, ".modonome"));

// The deterministic detectors and the two orchestrators that consume them. A
// promotion may only TIGHTEN these by editing their own literals; none of them
// may import the fuzzy widener, directly or through any relative-import hop.
const DETERMINISTIC_ENTRY_FILES = [
  "scripts/guard-ratchet.mjs",
  "scripts/check-repo-hygiene.mjs",
  "scripts/lib/branch-name.mjs",
  "scripts/lib/commit-identity.mjs",
  "scripts/lib/detect-attribution.mjs",
];
// Files a deterministic detector must never reach through its import graph. The reverse
// edges are required and allowed: near-miss.mjs (the widener) imports the strict
// predicates so it can suppress anything strict already catches, and remediate.mjs (the
// applier) imports the detectors to know what to rewrite. Only the forbidden direction
// (detector -> widener, or detector -> applier) is checked here. Keeping the applier
// unreachable keeps detection a pure, side-effect-free, base-pinnable trust root.
const FORBIDDEN_IMPORTS = [
  { file: "scripts/lib/near-miss.mjs", why: "the near-miss widener (fuzzy may only tighten, never override)" },
  { file: "scripts/lib/remediate.mjs", why: "the remediation applier (detection must never depend on the history-mutating tool)" },
];

// Extract the relative import specifiers from one module's source: static
// `from "..."`, side-effect `import "..."`, and dynamic `import("...")`. A
// regex scan (no AST dependency) matches this repo's house style.
function relativeImportsOf(absFile) {
  const src = readFileSync(absFile, "utf8");
  const specs = [];
  for (const m of src.matchAll(/\bfrom\s*["']([^"']+)["']/g)) specs.push(m[1]);
  for (const m of src.matchAll(/\bimport\s*\(\s*["']([^"']+)["']/g)) specs.push(m[1]);
  for (const m of src.matchAll(/\bimport\s+["']([^"']+)["']/g)) specs.push(m[1]);
  return specs.filter((s) => s.startsWith("."));
}

// Build a transitive {repoRelativeFile: [importedFiles]} adjacency map by walking
// relative imports out from the entry files, then assert FORBIDDEN_IMPORT is
// unreachable from every entry. Reads files from disk (this branch's own copy),
// which is why ci.yml runs this before the base-branch checkout on a PR.
export function determinismBoundaryErrors(root = REPO_ROOT) {
  const adjacency = {};
  const visited = new Set();
  const walk = (relFile) => {
    if (visited.has(relFile)) return;
    visited.add(relFile);
    const absFile = resolve(root, relFile);
    if (!existsSync(absFile)) {
      adjacency[relFile] = [];
      return;
    }
    const neighbours = [];
    for (const spec of relativeImportsOf(absFile)) {
      const absTarget = resolve(dirname(absFile), spec);
      const relTarget = relative(root, absTarget).split(sep).join("/");
      neighbours.push(relTarget);
      walk(relTarget);
    }
    adjacency[relFile] = neighbours;
  };
  for (const entry of DETERMINISTIC_ENTRY_FILES) walk(entry);

  const errors = [];
  for (const entry of DETERMINISTIC_ENTRY_FILES) {
    const reach = reachableFrom(adjacency, entry);
    for (const forbidden of FORBIDDEN_IMPORTS) {
      if (reach.has(forbidden.file)) {
        errors.push(
          formatMessage(
            "gate.gate-dag.forbidden-import",
            { entry, forbiddenFile: forbidden.file, why: forbidden.why },
            overrides,
          ).message,
        );
      }
    }
  }
  return errors;
}

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
        errors.push(formatMessage("gate.gate-dag.dangling-edge", { gate, dep }, overrides).message);
      }
    }
  }

  // (2) No cycle. Detect this regardless of dangling edges so the report names
  // the offending loop even when an edge is also missing a target.
  const { cyclic, cycle } = isCyclic(graph);
  if (cyclic) {
    errors.push(formatMessage("gate.gate-dag.cycle-detected", { cycle: cycle.join(" -> ") }, overrides).message);
  }

  if (errors.length > 0) return { errors, order: [] };

  // topoSort orders a gate ahead of the gates it points to; reverse so each
  // gate's dependencies appear before the gate itself.
  const { order } = topoSort(graph, gates);
  order.reverse();
  return { errors, order };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] || DEFAULT_PATH;
  const graph = JSON.parse(readFileSync(path, "utf8"));
  const { errors, order } = gateGraphErrors(graph);
  const boundaryErrors = determinismBoundaryErrors();
  if (errors.length > 0 || boundaryErrors.length > 0) {
    if (errors.length > 0) {
      console.error(formatMessage("gate.gate-dag.invalid-header", { path }, overrides).message);
      for (const e of errors) console.error("  - " + e);
    }
    if (boundaryErrors.length > 0) {
      console.error(formatMessage("gate.gate-dag.boundary-violated-header", {}, overrides).message);
      for (const e of boundaryErrors) console.error("  - " + e);
    }
    process.exit(1);
  }
  console.log(`Gate graph valid: ${path}`);
  console.log("Topological order (dependencies first):");
  for (const gate of order) console.log("  " + gate);
  console.log("Determinism boundary: deterministic detectors do not import the near-miss widener.");
}
