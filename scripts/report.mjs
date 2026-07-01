#!/usr/bin/env node
// Print a governance activity summary from .modonome/metrics.jsonl.
// Usage: node scripts/report.mjs [targetDir]
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const target = process.argv[2] || ".";
const metricsPath = join(target, ".modonome", "metrics.jsonl");
const startMs = Date.now();

function writeRunLog(runsDir, command, payload) {
  try {
    mkdirSync(runsDir, { recursive: true });
    const ts = new Date().toISOString();
    const safe = ts.replace(/[:.]/g, "-");
    writeFileSync(join(runsDir, `${safe}-${command}.json`), JSON.stringify({ ts, command, ...payload }, null, 2));
    const all = readdirSync(runsDir).filter((f) => f.endsWith(".json")).sort();
    for (const old of all.slice(0, Math.max(0, all.length - 30))) {
      try { unlinkSync(join(runsDir, old)); } catch { /* ignore */ }
    }
  } catch { /* log writes must never crash the command */ }
}

function pad(s, n) { return String(s).padEnd(n); }
function rpad(s, n) { return String(s).padStart(n); }

function parseMetrics() {
  if (!existsSync(metricsPath)) return [];
  return readFileSync(metricsPath, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function summarize(events) {
  const counts = {
    items_attempted: 0,
    gates_passed: 0,
    gates_failed: 0,
    ratchet_rejections: 0,
    merges: 0,
    lines_changed: 0,
    estimated_hours_saved: 0,
  };
  const byState = {};
  let earliest = null;
  let latest = null;

  for (const e of events) {
    const ts = e.ts || e.timestamp;
    if (ts) {
      if (!earliest || ts < earliest) earliest = ts;
      if (!latest || ts > latest) latest = ts;
    }
    if (e.event === "item_created") counts.items_attempted++;
    if (e.event === "gate_passed") counts.gates_passed++;
    if (e.event === "gate_failed") counts.gates_failed++;
    if (e.event === "ratchet_rejected") counts.ratchet_rejections++;
    if (e.event === "merged") {
      counts.merges++;
      counts.lines_changed += e.lines_changed || 0;
      counts.estimated_hours_saved += e.estimated_hours_saved || 0.5;
    }
    if (e.state) byState[e.state] = (byState[e.state] || 0) + 1;
  }

  return { counts, byState, earliest, latest };
}

function agentproofScore() {
  const result = spawnSync("node", [join(root, "agentproof/runner.mjs"), "--json"], {
    encoding: "utf8", timeout: 60000, cwd: target,
  });
  try { return JSON.parse(result.stdout); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Impact snapshot (offline, read-only, deterministic)
// ---------------------------------------------------------------------------
// Cheap filesystem/git-free heuristics used to gauge repo health over time.
// Every field here is derived only from files already on disk; nothing is
// fetched, executed, or written outside of writeRunLog's runs directory.

const IMPACT_SCAN_CAP = 2000; // bounds file/symbol scanning so this stays fast

function listFilesRecursive(dir, matches, cap = IMPACT_SCAN_CAP) {
  const out = [];
  if (!existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length && out.length < cap) {
    const current = stack.pop();
    let entries;
    try { entries = readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (matches(entry.name)) {
        out.push(full);
        if (out.length >= cap) break;
      }
    }
  }
  return out;
}

// A source module counts as "documented" if its first non-shebang line is a
// `//` comment, or the file contains a `/** ... */` JSDoc block anywhere.
// This is a simple heuristic, not a full doc-coverage analysis.
function isDocumented(filePath) {
  let text;
  try { text = readFileSync(filePath, "utf8"); } catch { return false; }
  if (text.includes("/**")) return true;
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#!")) continue;
    return trimmed.startsWith("//");
  }
  return false;
}

// Advisory, bounded heuristic: an exported symbol is a "dead code suspect"
// when its declared name never appears again (by plain text match) anywhere
// else under scripts/ or tests/. This is a name-collision-prone approximation,
// not a real usage analysis (it cannot see re-exports, string-built access,
// or cross-package consumers) so treat the count as a lead, not a verdict.
function findExportedSymbols(filePath) {
  let text;
  try { text = readFileSync(filePath, "utf8"); } catch { return []; }
  const names = [];
  const re = /export\s+(?:async\s+function|function|const|class)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) names.push(m[1]);
  return names;
}

export function computeDeadCodeSuspects(sourceFiles, root, cap = IMPACT_SCAN_CAP) {
  const capped = sourceFiles.slice(0, cap);
  const symbolToFile = new Map();
  for (const file of capped) {
    for (const name of findExportedSymbols(file)) {
      if (!symbolToFile.has(name)) symbolToFile.set(name, file);
    }
  }
  if (symbolToFile.size === 0) return 0;

  const haystackFiles = [
    ...listFilesRecursive(join(root, "scripts"), (n) => n.endsWith(".mjs") || n.endsWith(".js"), cap),
    ...listFilesRecursive(join(root, "tests"), (n) => n.endsWith(".test.mjs"), cap),
  ];
  const fileTexts = haystackFiles.map((f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } });

  let suspects = 0;
  for (const name of symbolToFile.keys()) {
    // Count total plain-text occurrences of the symbol name across every
    // scanned file. One occurrence is the export declaration itself; a
    // suspect is a name that never shows up anywhere beyond that.
    let occurrences = 0;
    for (const text of fileTexts) occurrences += text.split(name).length - 1;
    if (occurrences <= 1) suspects++;
  }
  return suspects;
}

// Computes a deterministic, offline snapshot of repo-impact metrics rooted at
// `root` (a directory containing scripts/, tests/, docs/). Pure aside from
// filesystem reads; never writes anything.
export function computeImpactSnapshot(root) {
  const sourceFiles = listFilesRecursive(join(root, "scripts"), (n) => n.endsWith(".mjs") || n.endsWith(".js"));
  const testFiles = listFilesRecursive(join(root, "tests"), (n) => n.endsWith(".test.mjs"));
  const docFiles = listFilesRecursive(join(root, "docs"), (n) => n.endsWith(".md"));

  const documented = sourceFiles.filter(isDocumented).length;
  const docCoverage = sourceFiles.length === 0 ? 0 : Math.round((documented / sourceFiles.length) * 100) / 100;

  return {
    source_files: sourceFiles.length,
    test_files: testFiles.length,
    doc_files: docFiles.length,
    doc_coverage: docCoverage,
    dead_code_suspects: computeDeadCodeSuspects(sourceFiles, root),
  };
}

const IMPACT_NUMERIC_FIELDS = ["source_files", "test_files", "doc_files", "doc_coverage", "dead_code_suspects"];

// Reads the newest run log under runsDir that carries an `impact` field.
// Returns null if none exists (first run, no baseline).
export function findPriorImpactSnapshot(runsDir) {
  if (!existsSync(runsDir)) return null;
  let files;
  try { files = readdirSync(runsDir).filter((f) => f.endsWith(".json")).sort(); } catch { return null; }
  for (const f of files.reverse()) {
    try {
      const data = JSON.parse(readFileSync(join(runsDir, f), "utf8"));
      if (data && data.impact) return data.impact;
    } catch { /* skip unreadable/partial log */ }
  }
  return null;
}

// Pure delta computation: current minus prior for each numeric field. When
// prior is null/undefined, returns a "first run, no baseline" marker instead
// of numeric deltas.
export function computeImpactDelta(current, prior) {
  if (!prior) return { baseline: false, note: "first run, no baseline" };
  const delta = { baseline: true };
  for (const field of IMPACT_NUMERIC_FIELDS) {
    const cur = typeof current[field] === "number" ? current[field] : 0;
    const prev = typeof prior[field] === "number" ? prior[field] : 0;
    const diff = cur - prev;
    delta[field] = field === "doc_coverage" ? Math.round(diff * 100) / 100 : diff;
  }
  return delta;
}

function formatDelta(n) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const events = parseMetrics();
const { counts, byState, earliest, latest } = summarize(events);

const dateRange = earliest
  ? `${earliest.slice(0, 10)} to ${latest.slice(0, 10)}`
  : "no activity recorded yet";

console.log("\nModonome Governance Report");
console.log("==========================");
console.log(`Target:     ${target}`);
console.log(`Period:     ${dateRange}`);
console.log(`Generated:  ${new Date().toISOString().slice(0, 10)}`);
console.log("");

if (events.length === 0) {
  console.log("No metrics recorded yet. Run a dry-run sweep to generate activity:");
  console.log("  node scripts/dry-run-sweep.mjs .");
  console.log("  -- or --");
  console.log("  npx modonome dry-run .");
} else {
  console.log("Activity");
  console.log("--------");
  console.log(`  ${pad("Items attempted:", 30)} ${rpad(counts.items_attempted, 6)}`);
  console.log(`  ${pad("Gates passed:", 30)} ${rpad(counts.gates_passed, 6)}`);
  console.log(`  ${pad("Gates failed:", 30)} ${rpad(counts.gates_failed, 6)}`);
  console.log(`  ${pad("Ratchet rejections:", 30)} ${rpad(counts.ratchet_rejections, 6)}`);
  console.log(`  ${pad("Merges landed:", 30)} ${rpad(counts.merges, 6)}`);
  console.log(`  ${pad("Lines changed:", 30)} ${rpad(counts.lines_changed, 6)}`);
  console.log(`  ${pad("Est. hours saved:", 30)} ${rpad(counts.estimated_hours_saved.toFixed(1), 6)}`);

  if (Object.keys(byState).length > 0) {
    console.log("");
    console.log("Work Item States");
    console.log("----------------");
    for (const [state, n] of Object.entries(byState).sort()) {
      console.log(`  ${pad(state + ":", 30)} ${rpad(n, 6)}`);
    }
  }
}

console.log("");
console.log("AgentProof Score");
console.log("----------------");
const gb = agentproofScore();
if (gb) {
  const { score, results } = gb;
  const failed = (results || []).filter((r) => !r.passed);
  console.log(`  Score: ${score}`);
  if (failed.length === 0) {
    console.log("  Level: HARDENED : all 25 gate-integrity scenarios pass (not full autonomy governance)");
  } else {
    console.log(`  Level: PARTIAL : ${failed.length} scenario(s) failing:`);
    for (const f of failed) console.log(`    - ${f.title}`);
  }
} else {
  console.log("  (agentproof runner not available in this environment)");
}

console.log("");
console.log("Impact");
console.log("------");
const runsDir = join(target, ".modonome", "runs");
const impact = computeImpactSnapshot(target);
const priorImpact = findPriorImpactSnapshot(runsDir);
const impactDelta = computeImpactDelta(impact, priorImpact);
for (const field of IMPACT_NUMERIC_FIELDS) {
  const value = impact[field];
  const suffix = impactDelta.baseline ? ` (${formatDelta(impactDelta[field])})` : "";
  console.log(`  ${pad(field + ":", 30)} ${rpad(value, 6)}${suffix}`);
}
if (!impactDelta.baseline) {
  console.log(`  ${impactDelta.note}`);
}

console.log("");

writeRunLog(runsDir, "report", {
  argv: process.argv.slice(2),
  target,
  summary: counts,
  agentproof_score: gb ? gb.score : null,
  impact,
  exit_code: 0,
  duration_ms: Date.now() - startMs,
});
