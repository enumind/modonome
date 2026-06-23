#!/usr/bin/env node
// Anti-gaming ratchet. Rejects diffs that make gates pass by weakening the gates.
// Runs in CI, outside the agent loop. Zero-false-positive checks only.
//
// Usage:
//   node scripts/guard-ratchet.mjs <baseRef>     compare working tree to a git ref
//   node scripts/guard-ratchet.mjs --diff <file> check a saved unified diff (for fixtures)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function getDiff() {
  const arg = process.argv[2];
  if (arg === "--diff") {
    return readFileSync(process.argv[3], "utf8");
  }
  const base = arg || "origin/main";
  return execSync(`git diff ${base}...HEAD`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

const TEST_FILE = /\.(test|spec)\.(t|j)sx?$|_test\.py$|test_.*\.py$/;
const ASSERT = /\b(expect|assert|assertEqual|assertTrue|should)\b\s*\(/g;
const SKIP = /\.(skip|only)\s*\(|\b(xit|fit|xdescribe)\s*\(|@pytest\.mark\.skip/;
const ANY_ESCAPE = /(:\s*any\b|\bas\s+any\b)/;
const STRICT_OFF = /"(strict|noImplicitAny|strictNullChecks|noUnusedLocals)"\s*:\s*false/;
const COVERAGE_DOWN = /(coverageThreshold|fail_under)\b/;

const diff = getDiff();
const problems = [];

// Parse unified diff into per-file added and removed lines.
const files = {};
let current = null;
for (const line of diff.split("\n")) {
  const m = line.match(/^\+\+\+ b\/(.+)$/);
  if (m) {
    current = m[1];
    files[current] = files[current] || { added: [], removed: [] };
    continue;
  }
  if (!current) continue;
  if (line.startsWith("+") && !line.startsWith("+++")) files[current].added.push(line.slice(1));
  else if (line.startsWith("-") && !line.startsWith("---")) files[current].removed.push(line.slice(1));
}

function count(lines, re) {
  let n = 0;
  for (const l of lines) {
    const matches = l.match(re);
    if (matches) n += matches.length;
  }
  return n;
}

for (const [file, { added, removed }] of Object.entries(files)) {
  if (TEST_FILE.test(file)) {
    const addedAsserts = count(added, ASSERT);
    const removedAsserts = count(removed, ASSERT);
    if (removedAsserts > addedAsserts) {
      problems.push(`${file}: removes more test assertions than it adds (+${addedAsserts} / -${removedAsserts}).`);
    }
  }
  for (const l of added) {
    if (SKIP.test(l)) problems.push(`${file}: adds a skipped or focused test: ${l.trim()}`);
  }
  if (!TEST_FILE.test(file) && /\.(t|j)sx?$/.test(file)) {
    for (const l of added) {
      const noComment = l.replace(/\/\/.*$/, "");
      if (ANY_ESCAPE.test(noComment)) problems.push(`${file}: adds a broad type escape: ${l.trim()}`);
    }
  }
  if (/tsconfig.*\.json$/.test(file)) {
    for (const l of added) if (STRICT_OFF.test(l)) problems.push(`${file}: weakens TypeScript strictness: ${l.trim()}`);
  }
  for (const l of removed) {
    if (COVERAGE_DOWN.test(l) && !added.some((a) => COVERAGE_DOWN.test(a))) {
      problems.push(`${file}: removes a coverage threshold.`);
    }
  }
}

if (problems.length > 0) {
  console.error("Anti-gaming ratchet rejected this change:\n");
  for (const p of problems) console.error("  - " + p);
  console.error("\nDo not weaken gates to go green. Get owner review for an intended exception.");
  process.exit(1);
}
console.log("Anti-gaming ratchet: no weakened tests, skips, type escapes, or loosened gates.");
