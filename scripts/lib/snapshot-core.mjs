// The snapshot pipeline. Given a repository root it produces a tiered artifact:
// Tier 0 signature (the small "has it changed" fingerprint), Tier 1 map (modules,
// public API, import edges, and attention ranking), an LLM-native rendered map, and
// a single portable pack. The function is pure: it reads the repo but performs no
// writes and never exits, so it is deterministic and unit testable. A caller injects
// `now` so the timestamp cannot make output non-reproducible.
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { canonicalize } from "./canonical-json.mjs";
import { parseFlatYaml } from "./yaml-lite.mjs";
import { walkRepo, loadIgnore } from "./snapshot-walk.mjs";
import { hashFileContent, hashString, buildMerkleTree } from "./merkle.mjs";
import { extractFile } from "./lang-adapters/index.mjs";
import { redactText } from "./snapshot-redact.mjs";
import { buildImportGraph, centrality, pagerank, attentionRank, findCycle } from "./snapshot-graph.mjs";
import { buildPathDictionary, buildSymbolDictionary, symbolAnchor } from "./snapshot-anchors.mjs";
import { estimateTokens, budgetTier } from "./token-estimate.mjs";
import { detectStack, detectProtected, detectInstructions } from "./repo-detect.mjs";

export const SNAPSHOT_SCHEMA_VERSION = 1;
const DEFAULT_TOKEN_BUDGET = 120000;
const MAX_EXTRACT_BYTES = 256 * 1024;
const MAX_ATTENTION = 50;

const PREAMBLE =
  "Modonome snapshot. Read this before reading the repo. Tier 0 (signature.json) is the fingerprint: " +
  "if merkle_root matches your last read, nothing changed. Tier 1 (map.json / map.md) lists modules, " +
  "public API signatures, import edges, and attention ranking. Cite anchors (F: for files, S: for symbols); " +
  "each resolves to a path and line so you can act without re-reading the whole repo.";

// Detect binary content by scanning a prefix for a null byte.
function isBinary(buffer) {
  const n = Math.min(buffer.length, 8000);
  for (let i = 0; i < n; i++) if (buffer[i] === 0) return true;
  return false;
}

function extOf(relPath) {
  const base = basename(relPath);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "(none)";
}

function firstCommentLine(source) {
  for (const raw of source.split(/\r?\n/)) {
    const t = raw.trim();
    if (t === "") continue;
    const m = t.match(/^(?:\/\/|#|--|;)\s?(.*)$/);
    if (m && m[1]) return m[1];
    return "";
  }
  return "";
}

// Derive a module purpose from its symbols and source. Returns the raw (unredacted)
// string so it can be cached; redaction is applied at map assembly time.
function rawPurpose(relPath, symbols, source) {
  let purpose = "";
  const withDoc = symbols.find((s) => s.doc);
  if (/\.(md|markdown)$/i.test(relPath) && symbols[0]) purpose = symbols[0].name;
  else if (withDoc) purpose = withDoc.doc;
  else purpose = firstCommentLine(source) || (symbols[0] ? `${symbols[0].kind} ${symbols[0].name}` : "");
  return String(purpose).slice(0, 160);
}

// Build the full snapshot for a repository root.
export function buildSnapshot(root, opts = {}) {
  const {
    now = "1970-01-01T00:00:00.000Z",
    tokenBudget = DEFAULT_TOKEN_BUDGET,
    strictRedact = false,
    prev = null,
    generatedFor = basename(root) || ".",
    cache = null,
    changed = null,
  } = opts;

  const ignore = loadIgnore(root);
  const files = walkRepo(root, { ignore });
  const fileSet = new Set(files.map((f) => f.relPath));

  // Object.create(null) rather than {}: these maps are keyed directly by a raw
  // relative path from the walked repo (or, for cacheEntriesIn, from an untrusted
  // JSON cache file). A repo or cache entry containing the literal name "__proto__"
  // would otherwise repoint the map's prototype when the assigned value is an
  // object (as with cacheEntries), which is the shape CodeQL's
  // js/prototype-polluting-assignment flags. A null-prototype object has no
  // __proto__ accessor to hijack, and every read below already uses
  // Object.entries/hasOwnProperty.call rather than inherited methods.
  const fileHashes = Object.create(null);
  const languageMix = Object.create(null);
  let totalBytes = 0;
  let reusedCount = 0;
  const perFile = []; // { relPath, symbols, imports, purposeRaw }
  const cacheEntries = Object.create(null); // relPath -> { hash, symbols, imports, purposeRaw }
  // Incremental reuse: trust the cache for a file only when git reported it did not
  // change. When `changed` is null (git unavailable) every file is treated as changed,
  // which is a full rebuild. Reused entries are byte-identical to a fresh read because
  // the content is unchanged, so the artifact matches a from-scratch build exactly.
  const cacheEntriesIn = (cache && cache.entries) || Object.create(null);

  for (const f of files) {
    const ext = extOf(f.relPath);
    languageMix[ext] = (languageMix[ext] || 0) + 1;
    totalBytes += f.size;

    const reusable = changed && !changed.has(f.relPath) && Object.prototype.hasOwnProperty.call(cacheEntriesIn, f.relPath);
    if (reusable) {
      const e = cacheEntriesIn[f.relPath];
      fileHashes[f.relPath] = e.hash;
      perFile.push({ relPath: f.relPath, symbols: e.symbols || [], imports: e.imports || [], purposeRaw: e.purposeRaw || "" });
      cacheEntries[f.relPath] = e;
      reusedCount++;
      continue;
    }

    let buffer;
    try { buffer = readFileSync(f.absPath); } catch { continue; }
    const hash = hashFileContent(buffer);
    fileHashes[f.relPath] = hash;

    if (isBinary(buffer) || f.size > MAX_EXTRACT_BYTES) {
      const entry = { hash, symbols: [], imports: [], purposeRaw: "" };
      perFile.push({ relPath: f.relPath, ...entry });
      cacheEntries[f.relPath] = entry;
      continue;
    }
    const source = buffer.toString("utf8");
    const { symbols, imports } = extractFile(f.relPath, source);
    const purposeRaw = rawPurpose(f.relPath, symbols, source);
    const entry = { hash, symbols, imports, purposeRaw };
    perFile.push({ relPath: f.relPath, ...entry });
    cacheEntries[f.relPath] = entry;
  }

  const merkleEntries = Object.entries(fileHashes).map(([relPath, hash]) => ({ relPath, hash }));
  const { root: merkleRoot, nodes: merkleNodes } = buildMerkleTree(merkleEntries);

  // Graph and attention.
  const adjacency = buildImportGraph(perFile, fileSet);
  const centralityMap = centrality(adjacency);
  const pagerankMap = pagerank(adjacency);
  // Attention ranking uses only content-derived signals (degree centrality and
  // PageRank) so the committed artifact stays deterministic across commits. Git
  // churn is a live signal surfaced on demand elsewhere, not baked into the map.
  const codePaths = perFile.filter((f) => f.symbols.length > 0 || (adjacency[f.relPath] || []).length > 0).map((f) => f.relPath);
  const attentionAll = attentionRank(codePaths, { centralityMap, pagerankMap });
  const scoreByPath = new Map(attentionAll.map((a) => [a.path, a.score]));

  // Path dictionary over files that appear in the map.
  const dictPaths = new Set();
  for (const f of perFile) if (f.symbols.length > 0) dictPaths.add(f.relPath);
  for (const [from, tos] of Object.entries(adjacency)) {
    if (tos.length) { dictPaths.add(from); for (const t of tos) dictPaths.add(t); }
  }
  for (const a of attentionAll.slice(0, MAX_ATTENTION)) dictPaths.add(a.path);
  const { paths: pathDict, pathIdByPath } = buildPathDictionary([...dictPaths]);

  // Modules.
  const modules = perFile
    .filter((f) => f.symbols.length > 0)
    .map((f) => ({
      id: pathIdByPath[f.relPath],
      path: f.relPath,
      purpose: redactText(f.purposeRaw || "", { strict: strictRedact }).text,
      hash: fileHashes[f.relPath],
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  // API entries, redacted.
  const apiAll = [];
  for (const f of perFile) {
    for (const s of f.symbols) {
      if (s.kind === "heading") continue;
      apiAll.push({
        anchor: symbolAnchor(f.relPath, s.name),
        path_id: pathIdByPath[f.relPath],
        kind: s.kind,
        name: s.name,
        signature: redactText(s.signature || "", { strict: strictRedact }).text,
        line: s.line,
        doc: s.doc ? redactText(s.doc, { strict: strictRedact }).text : undefined,
        _score: scoreByPath.get(f.relPath) || 0,
      });
    }
  }

  // Budget the API list by attention, keeping the highest-value signatures. The
  // structural sections (dictionary, modules, edges, attention) are fixed overhead,
  // so only the elastic API list is trimmed, against the budget left after overhead.
  const structuralTokens = estimateTokens(canonicalize({
    dictionary: { paths: pathDict },
    modules,
    edges: buildEdgeList(adjacency, pathIdByPath),
    attention: attentionAll.slice(0, MAX_ATTENTION),
  }));
  const apiBudget = Math.max(0, (tokenBudget || 0) - structuralTokens);
  const ranked = [...apiAll].sort((a, b) => b._score - a._score || (a.path_id < b.path_id ? -1 : 1) || a.line - b.line);
  const { kept, dropped } = budgetTier(ranked, apiBudget, (e) => estimateTokens(`${e.name} ${e.signature} ${e.doc || ""}`));
  const api = kept
    .map(({ _score, ...rest }) => rest)
    .sort((a, b) => (a.path_id < b.path_id ? -1 : a.path_id > b.path_id ? 1 : 0) || a.line - b.line);

  // Edges (only where both endpoints are in the dictionary).
  const edges = buildEdgeList(adjacency, pathIdByPath);

  const attention = attentionAll.slice(0, MAX_ATTENTION)
    .filter((a) => pathIdByPath[a.path])
    .map((a) => ({ path_id: pathIdByPath[a.path], centrality: a.centrality, pagerank: a.pagerank }));

  const symbolDict = buildSymbolDictionary(api);

  const map = {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    merkle_root: merkleRoot,
    dictionary: { paths: pathDict, symbols: symbolDict },
    modules,
    api,
    edges,
    attention,
    token_estimate: 0,
    token_budget: tokenBudget,
    truncated: dropped.length > 0,
  };
  map.token_estimate = estimateTokens(canonicalize(map));

  const markdown = renderMarkdown({ generatedFor, merkleRoot, files, totalBytes, map });

  // Stack, governance, and Tier 0 signature.
  const stack = detectStack(root);
  const governance = readGovernance(root);
  const snapshotVersion = !prev ? 1 : (prev.merkle_root !== merkleRoot ? (prev.snapshot_version || 1) + 1 : (prev.snapshot_version || 1));

  const signature = {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    preamble: PREAMBLE,
    generated_for: generatedFor,
    generated_at: now,
    merkle_root: merkleRoot,
    stack: { name: stack.name, pm: stack.pm },
    size: { files: files.length, bytes: totalBytes },
    language_mix: languageMix,
    entrypoints: stack.entrypoints || [],
    commands: { test: stack.commands?.test || "", build: stack.commands?.build || "", lint: stack.commands?.lint || "" },
    instructions: detectInstructions(root),
    protected_paths: detectProtected(root),
    governance,
    snapshot_version: snapshotVersion,
    tier_hashes: { map: hashString(canonicalize(map)), map_md: hashString(markdown) },
  };

  const cycle = findCycle(adjacency);
  const pack = {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    signature,
    map,
    map_md: markdown,
  };

  return {
    signature,
    map,
    markdown,
    packBytes: canonicalize(pack) + "\n",
    fileHashes,
    merkleNodes,
    cycle,
    cacheEntries,
    stats: { files: files.length, reused: reusedCount, rebuilt: files.length - reusedCount },
  };
}

// Resolve adjacency into a sorted edge list of dictionary path ids.
function buildEdgeList(adjacency, pathIdByPath) {
  const edges = [];
  for (const [from, tos] of Object.entries(adjacency)) {
    const fromId = pathIdByPath[from];
    if (!fromId) continue;
    for (const to of tos) {
      const toId = pathIdByPath[to];
      if (toId) edges.push({ from: fromId, to: toId });
    }
  }
  edges.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0) || (a.to < b.to ? -1 : 1));
  return edges;
}

function renderMarkdown({ generatedFor, merkleRoot, files, totalBytes, map }) {
  const idToPath = map.dictionary.paths;
  const lines = [];
  lines.push(`# Repo snapshot: ${generatedFor}`);
  lines.push("");
  lines.push(PREAMBLE);
  lines.push("");
  lines.push(`Merkle root: ${merkleRoot}`);
  lines.push(`Files: ${files.length}  Bytes: ${totalBytes}  Map tokens: ${map.token_estimate}/${map.token_budget}${map.truncated ? " (truncated)" : ""}`);
  lines.push("");
  lines.push("## Modules");
  lines.push("");
  if (map.modules.length === 0) lines.push("None detected.");
  for (const m of map.modules) {
    const purpose = m.purpose ? `: ${m.purpose}` : "";
    lines.push(`- ${m.path} [${m.id}]${purpose}`);
  }
  lines.push("");
  lines.push("## Public API");
  lines.push("");
  let currentPath = null;
  for (const e of map.api) {
    const path = idToPath[e.path_id] || e.path_id;
    if (path !== currentPath) {
      currentPath = path;
      lines.push(`### ${path} [${e.path_id}]`);
    }
    const doc = e.doc ? ` : ${e.doc}` : "";
    lines.push(`- ${e.anchor} ${e.kind} ${e.name} \`${e.signature}\` L${e.line}${doc}`);
  }
  if (map.api.length === 0) lines.push("None extracted.");
  lines.push("");
  lines.push("## Import edges");
  lines.push("");
  if (map.edges.length === 0) lines.push("None resolved.");
  for (const edge of map.edges) {
    lines.push(`- ${idToPath[edge.from] || edge.from} -> ${idToPath[edge.to] || edge.to}`);
  }
  lines.push("");
  lines.push("## Attention (centrality + pagerank)");
  lines.push("");
  if (map.attention.length === 0) lines.push("No ranking available.");
  map.attention.forEach((a, i) => {
    lines.push(`${i + 1}. ${idToPath[a.path_id] || a.path_id} centrality=${a.centrality} pagerank=${a.pagerank}`);
  });
  lines.push("");
  return lines.join("\n");
}

// Read a light governance posture from the target config and environment. It never
// arms anything; it only reports posture so a snapshot can double as a status probe.
function readGovernance(root) {
  let autonomy = false;
  let dryRun = true;
  try {
    const cfgPath = `${root}/.modonome/config.yaml`;
    if (existsSync(cfgPath)) {
      const cfg = parseFlatYaml(readFileSync(cfgPath, "utf8"));
      autonomy = cfg.autonomy_enabled === true;
      dryRun = cfg.dry_run !== false;
    }
  } catch { /* no readable config */ }
  const armed = autonomy && process.env.MODONOME_ARMED === "true";
  return { armed, autonomy_enabled: autonomy, dry_run: dryRun };
}
