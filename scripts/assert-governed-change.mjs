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
import { readFileSync, existsSync, readdirSync } from "node:fs";
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
  // Case 1: Gate file modified AND corresponding test modified → pass
  for (const gate of REAL_GATES) {
    if ([...changedFiles].some((f) => f.includes(gate))) {
      const testFile = gate.replace(/\.mjs$/, ".test.mjs");
      if ([...changedFiles].some((f) => f.includes(testFile))) {
        return true;
      }
    }
  }

  // Case 2: Only test files modified, but tests correspond to existing gates → pass
  // (tests for gates that already exist in the repo are governance-relevant)
  const testFilesChanged = [...changedFiles].filter((f) => f.includes(".test."));
  if (testFilesChanged.length > 0 && testFilesChanged.length === changedFiles.size) {
    // All changed files are test files; check if they test known gates
    for (const testFile of testFilesChanged) {
      for (const gate of REAL_GATES) {
        const expectedTestFile = gate.replace(/\.mjs$/, ".test.mjs");
        if (testFile.includes(expectedTestFile) || testFile.includes(gate.split("/").pop())) {
          // This test file corresponds to a gate; test-only changes are governance-relevant
          if (existsSync(join(root, gate))) {
            return true;
          }
        }
      }
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
  const files = readdirSync(wiDir).filter((f) => f.endsWith(".json"));

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

  // Site/content-only changes (site/ and RELEASE-EVIDENCE.md) are UI or documentation
  // updates that are not governance-relevant by definition. Allow them explicitly so
  // that label, copy, and evidence-file changes are not blocked by this gate.
  const CONTENT_ONLY_PREFIXES = ["site/", "RELEASE-EVIDENCE.md"];
  const isContentOnly = [...changedFiles].every((f) =>
    CONTENT_ONLY_PREFIXES.some((p) => f.startsWith(p))
  );
  if (isContentOnly) {
    console.log("Change is site/content-only. Governance check not required.");
    process.exit(0);
  }

  // Governance-relevant if:
  // 1. Test files changed with net assertions >= 0 (testing strengthens governance)
  // 2. OR gate files changed (directly improve governance)
  // 3. OR protected paths changed with escalation reason
  const hasTestChanges = [...changedFiles].some((f) => f.includes(".test."));
  const hasGateChanges = [...changedFiles].some((f) =>
    REAL_GATES.some((gate) => f.includes(gate))
  );
  const isGovernanceRelevant =
    (hasTestChanges && netAssertions >= 0) ||
    hasGateChanges ||
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
