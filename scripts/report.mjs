#!/usr/bin/env node
// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
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
    console.log("  Level: GOVERNED : all governance controls present and enforced");
  } else {
    console.log(`  Level: PARTIAL : ${failed.length} scenario(s) failing:`);
    for (const f of failed) console.log(`    - ${f.title}`);
  }
} else {
  console.log("  (agentproof runner not available in this environment)");
}

console.log("");

writeRunLog(join(target, ".modonome", "runs"), "report", {
  argv: process.argv.slice(2),
  target,
  summary: counts,
  agentproof_score: gb ? gb.score : null,
  exit_code: 0,
  duration_ms: Date.now() - startMs,
});
