#!/usr/bin/env node
// Assert that a change is governance-relevant: either tests a gate with net assertions >= 0,
// or modifies protected paths with proper escalation. Reject empty/trivial changes.
//
// Governance-relevant change = one of:
// 1. Modifies test files with net assertions >= 0 AND exercises a real gate
// 2. Modifies protected paths AND has escalation_reason in work item
//
// Usage:
//   node scripts/assert-governed-change.mjs <baseRef>
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Protected paths that require escalation and are off-limits to autonomous changes
const PROTECTED_PATHS = [
  ".github/workflows/",
  ".modonome/config.yaml",
  "package.json",
  "bin/",
];

// Gates that count as "real gate exercised" when their tests are modified
const REAL_GATES = [
  "scripts/check-style.mjs",
  "scripts/check-drift.mjs",
  "scripts/guard-ratchet.mjs",
  "scripts/check-work-items.mjs",
  "scripts/check-checker-engagement.mjs",
  "scripts/check-promotion-readiness.mjs",
];

function getDiff(baseRef) {
  const result = spawnSync("git", ["diff", `${baseRef}...HEAD`], {
    encoding: "utf8",
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "git diff failed");
  return result.stdout;
}

function getChangedFiles(diff) {
  const files = new Set();
  const lines = diff.split("\n");
  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const match = line.match(/b\/(.+)$/);
      if (match) files.add(match[1]);
    }
  }
  return files;
}

function getNetAssertions(diff) {
  let added = 0;
  let removed = 0;
  const assertPatterns = [
    /\.assert/,
    /\bassert\s*\(/,
    /expect\(/,
    /\.should\./,
    /test\(/,
    /it\(/,
  ];

  const lines = diff.split("\n");
  for (const line of lines) {
    const isAddition = line.startsWith("+") && !line.startsWith("+++");
    const isDeletion = line.startsWith("-") && !line.startsWith("---");
    const content = line.slice(1); // Remove +/- prefix

    for (const pattern of assertPatterns) {
      if (pattern.test(content)) {
        if (isAddition) added++;
        if (isDeletion) removed++;
        break;
      }
    }
  }

  return added - removed;
}

function exercisesRealGate(diff, changedFiles) {
  // Check if any real gate file was modified
  const gateModified = [...changedFiles].some((f) =>
    REAL_GATES.some((gate) => f.includes(gate))
  );

  if (!gateModified) return false;

  // Check if corresponding test file also modified
  for (const gate of REAL_GATES) {
    if ([...changedFiles].some((f) => f.includes(gate))) {
      const testFile = gate.replace(/\.mjs$/, ".test.mjs");
      return [...changedFiles].some((f) => f.includes(testFile));
    }
  }

  return false;
}

function touchesProtectedPath(changedFiles) {
  return [...changedFiles].some((f) =>
    PROTECTED_PATHS.some((p) => f.startsWith(p))
  );
}

function loadCurrentWorkItem() {
  const wiDir = join(root, ".modonome", "work-items");
  if (!existsSync(wiDir)) return null;

  // Load the most recent work item (last by modification time)
  const files = require("node:fs")
    .readdirSync(wiDir)
    .filter((f) => f.endsWith(".json"));

  if (files.length === 0) return null;

  // For now, return null (work item check deferred to WS-G)
  return null;
}

function isEmptyOrTrivial(diff) {
  const lines = diff.split("\n").filter((l) => l.startsWith("+") || l.startsWith("-"));
  // Less than 5 changed lines = trivial
  return lines.length < 5;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const baseRef = process.argv[2] || "origin/main";

  const diff = getDiff(baseRef);
  const changedFiles = getChangedFiles(diff);

  if (changedFiles.size === 0) {
    console.error("No changed files detected. Skipping governance check (empty change).");
    process.exit(0);
  }

  if (isEmptyOrTrivial(diff)) {
    console.error("Change is trivial (< 5 lines). Governance check requires substantive change.");
    process.exit(1);
  }

  const netAssertions = getNetAssertions(diff);
  const gateExercised = exercisesRealGate(diff, changedFiles);
  const protectedPath = touchesProtectedPath(changedFiles);
  const workItem = loadCurrentWorkItem();

  // Governance-relevant if:
  // 1. (test file AND net assertions >= 0 AND gate exercised) OR
  // 2. (protected path AND escalation reason in work item)
  const hasTestChanges = [...changedFiles].some((f) => f.includes(".test."));
  const isGovernanceRelevant =
    (hasTestChanges && netAssertions >= 0 && gateExercised) ||
    (protectedPath && workItem?.escalation_reason);

  if (!isGovernanceRelevant) {
    console.error("Change is not governance-relevant.");
    console.error(
      `  Test changes: ${hasTestChanges}, net assertions: ${netAssertions}, gate exercised: ${gateExercised}`
    );
    console.error(`  Protected path: ${protectedPath}, has escalation: ${!!workItem?.escalation_reason}`);
    process.exit(1);
  }

  console.log("Change is governance-relevant. Proceeding.");
  process.exit(0);
}
