#!/usr/bin/env node
// Fails CI when an open work item (queued, claimed, making, checking, or rework,
// and not under a live lease) already has its own declared test file passing and
// its declared implementation paths on disk: strong evidence the PR merged and
// nobody ran `transition-work-item.mjs` to close the loop. See
// scripts/lib/work-item-staleness.mjs for the exact detection rule and why this
// gate exists (docs/autonomy-plan.md's WI-021/022/026-040 batch drifted this way
// for days before anything caught it).
//
// Usage: node scripts/check-work-item-staleness.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { findStaleWorkItems } from "./lib/work-item-staleness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dir = join(root, ".modonome", "work-items");

process.chdir(root); // so the relative paths in gates/allowed_edit_set resolve

const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
const items = files
  .map((f) => {
    try {
      return JSON.parse(readFileSync(join(dir, f), "utf8"));
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const stale = findStaleWorkItems(items);

console.log("Work item staleness check");
console.log("==========================");
if (stale.length === 0) {
  console.log(`PASS: no open work item's state has drifted from an already-merged deliverable (${items.length} item(s) checked).`);
  process.exit(0);
}

console.error(`FAIL: ${stale.length} work item(s) look stale. Their own test(s) already pass and their deliverable files already exist, but state is not "done":\n`);
for (const s of stale) {
  console.error(`  - ${s.id} (state: ${s.state})`);
  console.error(`      passing test file(s): ${s.testFiles.join(", ")}`);
  console.error(`      existing deliverable(s): ${s.implPaths.join(", ")}`);
}
console.error(
  `\nIf this work genuinely landed, close it out:\n` +
    `  node scripts/transition-work-item.mjs .modonome/work-items/<id>.json <state> done <writer-id>\n` +
    `If it did not, the test/files above are a false-positive fixture collision. Narrow the item's gates or allowed_edit_set.`,
);
process.exit(1);
