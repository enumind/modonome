#!/usr/bin/env node
// Evidence-secret guard. Scans metrics.jsonl run evidence files for accidentally
// committed secrets before they leave the repo. Fails immediately on the first
// matched pattern, naming the pattern and the offending file, so CI surfaces the
// problem without scanning further than necessary. No external dependencies.
//
// Usage:
//   node scripts/check-evidence-secrets.mjs              scan default glob
//   node scripts/check-evidence-secrets.mjs <path>       scan a specific file
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanForSecrets, SECRET_PATTERNS } from "./lib/secret-patterns.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

// Resolve the list of files to scan. If a path argument is supplied use it
// directly; otherwise walk examples/*/runs/*/metrics.jsonl via readdirSync.
function resolveFiles(argPath) {
  if (argPath) return [argPath];

  const files = [];
  const examplesDir = join(root, "examples");
  for (const example of readdirSync(examplesDir)) {
    const runsDir = join(examplesDir, example, "runs");
    let runEntries;
    try {
      runEntries = readdirSync(runsDir);
    } catch {
      continue;
    }
    for (const run of runEntries) {
      const candidate = join(runsDir, run, "metrics.jsonl");
      try {
        readFileSync(candidate); // probe existence without statSync
        files.push(candidate);
      } catch {
        // not present : skip
      }
    }
  }
  return files;
}

const argPath = process.argv[2] || null;
const files = resolveFiles(argPath);

if (files.length === 0) {
  console.log("check-evidence-secrets: no metrics.jsonl files found; nothing to scan.");
  process.exit(0);
}

console.log(`check-evidence-secrets: scanning ${files.length} file(s) against ${SECRET_PATTERNS.length} pattern(s).`);

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch (e) {
    console.error(formatMessage("gate.evidence-secrets.read-error", { file, reason: e.message }, overrides).message);
    process.exit(1);
  }

  const hits = scanForSecrets(content);
  if (hits.length > 0) {
    for (const hit of hits) {
      console.error(formatMessage("gate.evidence-secrets.pattern-matched", { pattern: hit.name, file }, overrides).message);
    }
    process.exit(1);
  }
}

console.log("PASS: no secrets detected.");
process.exit(0);
