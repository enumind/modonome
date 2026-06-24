#!/usr/bin/env node
// Drop the .modonome state templates into a target repo. Boots disabled and
// dry-run. Never overwrites an existing file. Touches nothing else.
// Usage: node scripts/scaffold.mjs <targetDir> [--write]
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = join(here, "..", "templates", ".modonome");

function listTemplate(dir, base = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? join(base, entry) : entry;
    if (statSync(full).isDirectory()) out.push(...listTemplate(full, rel));
    else out.push(rel);
  }
  return out;
}

export function scaffold(target, write) {
  const stateDir = join(target, ".modonome");
  const planned = [];
  for (const rel of listTemplate(templateDir)) {
    const dest = join(stateDir, rel);
    if (existsSync(dest)) {
      planned.push({ rel, action: "keep" });
      continue;
    }
    planned.push({ rel, action: "create" });
    if (write) {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, readFileSync(join(templateDir, rel), "utf8"));
    }
  }
  return planned;
}

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

if (import.meta.url === `file://${process.argv[1]}`) {
  const startMs = Date.now();
  const target = process.argv[2] || ".";
  const write = process.argv.includes("--write");
  const planned = scaffold(target, write);
  console.log(write ? "Scaffold applied to .modonome/" : "Scaffold preview (no files written). Pass --write to apply.");
  for (const p of planned) console.log(`  ${p.action === "create" ? (write ? "created" : "would create") : "kept"}: .modonome/${p.rel}`);
  console.log("\nThe engine stays disabled and dry-run until an owner arms it.");
  writeRunLog(join(target, ".modonome", "runs"), "scaffold", {
    argv: process.argv.slice(2),
    target,
    write,
    planned,
    exit_code: 0,
    duration_ms: Date.now() - startMs,
  });
}
