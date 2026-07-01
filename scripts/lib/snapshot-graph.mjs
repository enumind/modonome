// Dependency graph and attention ranking for a snapshot. Import edges are resolved
// between repo files, then files are ranked by a composite of git churn, degree
// centrality, and PageRank so an agent can see what matters most without reading
// everything. PageRank is the technique code-aware assistants use for repo maps,
// implemented here without any dependency. Cycles are annotated via the shared graph
// utility.
import { isCyclic } from "./graph.mjs";

// Normalize a relative import against the importing file's directory, resolving
// "." and ".." segments. Returns a posix path with no leading "./".
function normalizeRelative(fromPath, module) {
  const baseParts = fromPath.split("/").slice(0, -1);
  const modParts = module.split("/");
  for (const part of modParts) {
    if (part === "." || part === "") continue;
    if (part === "..") baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join("/");
}

// Resolve a relative import to a repo file, trying common extensions and index
// files. External and bare imports return null and become no edge.
function resolveImport(fromPath, module, fileSet) {
  if (typeof module !== "string" || !module.startsWith(".")) return null;
  const base = normalizeRelative(fromPath, module);
  const candidates = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, `${base}.cjs`, `${base}.jsx`,
    `${base}.py`, `${base}.go`, `${base}.java`,
    `${base}/index.ts`, `${base}/index.js`, `${base}/index.mjs`, `${base}/__init__.py`,
  ];
  for (const c of candidates) {
    if (fileSet.has(c)) return c;
  }
  return null;
}

// Build an adjacency map { relPath -> [relPath, ...] } from per-file imports.
// Only edges that resolve to another repo file are kept.
export function buildImportGraph(perFile, fileSet) {
  const adj = {};
  for (const f of perFile) {
    const targets = new Set();
    for (const imp of f.imports || []) {
      const resolved = resolveImport(f.relPath, imp.module, fileSet);
      if (resolved && resolved !== f.relPath) targets.add(resolved);
    }
    adj[f.relPath] = [...targets].sort();
  }
  return adj;
}

// Degree centrality: out-edges of a node plus in-edges pointing at it.
export function centrality(adj) {
  const score = new Map();
  const bump = (n, by) => score.set(n, (score.get(n) || 0) + by);
  for (const n of Object.keys(adj)) {
    bump(n, adj[n].length);
    for (const m of adj[n]) bump(m, 1);
  }
  return score;
}

// PageRank over the import graph. Fixed iteration count keeps it deterministic.
// Dangling nodes (no out-edges) redistribute their rank uniformly.
export function pagerank(adj, { damping = 0.85, iterations = 40 } = {}) {
  const nodes = new Set(Object.keys(adj));
  for (const n of Object.keys(adj)) for (const m of adj[n]) nodes.add(m);
  const N = nodes.size || 1;
  let rank = new Map();
  for (const n of nodes) rank.set(n, 1 / N);
  for (let it = 0; it < iterations; it++) {
    const next = new Map();
    for (const n of nodes) next.set(n, (1 - damping) / N);
    let dangling = 0;
    for (const n of nodes) if (!(adj[n] && adj[n].length)) dangling += rank.get(n);
    const danglingShare = (damping * dangling) / N;
    for (const n of nodes) {
      const outs = adj[n] || [];
      if (outs.length === 0) continue;
      const share = (damping * rank.get(n)) / outs.length;
      for (const m of outs) next.set(m, next.get(m) + share);
    }
    for (const n of nodes) next.set(n, next.get(n) + danglingShare);
    rank = next;
  }
  return rank;
}

function round(n, places = 6) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

// Rank files by a normalized composite of churn, centrality, and PageRank. Returns
// a sorted list of { path, churn, centrality, pagerank, score }, highest first.
export function attentionRank(paths, { churn = new Map(), centralityMap = new Map(), pagerankMap = new Map() } = {}) {
  const items = paths.map((path) => ({
    path,
    churn: churn.get(path) || 0,
    centrality: centralityMap.get(path) || 0,
    pagerank: round(pagerankMap.get(path) || 0),
  }));
  const maxChurn = Math.max(1, ...items.map((i) => i.churn));
  const maxCent = Math.max(1, ...items.map((i) => i.centrality));
  const maxPr = Math.max(1e-9, ...items.map((i) => i.pagerank));
  for (const i of items) {
    i.score = round(i.churn / maxChurn + i.centrality / maxCent + i.pagerank / maxPr);
  }
  items.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return items;
}

// Report whether the import graph has a cycle and one example cycle, reusing the
// shared cycle detector so the snapshot can warn about circular dependencies.
export function findCycle(adj) {
  return isCyclic(adj);
}
