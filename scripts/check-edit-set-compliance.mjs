#!/usr/bin/env node
// Check that changed files in a PR stay within the allowed_edit_set defined in the work item.
// The allowed_edit_set specifies exactly which files an autonomous agent is permitted to modify;
// changes outside this set indicate either scope creep or a malformed work item.
//
// This gate loads the current work item (if any) and verifies PR changes stay in bounds.
// On main push (not PR): skip this check, since there's no work item context.
//
// Usage:
//   node scripts/check-edit-set-compliance.mjs [--work-item <path>]
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function getDiff(baseRef = "origin/main") {
  const result = spawnSync("git", ["diff", `${baseRef}...HEAD`], {
    encoding: "utf8",
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    // If there's no merge base (e.g., fresh branch), use HEAD
    const fallback = spawnSync("git", ["diff", "HEAD~1...HEAD"], {
      encoding: "utf8",
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
    });
    return fallback.stdout || "";
  }
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

function loadCurrentWorkItem() {
  const wiDir = join(root, ".modonome", "work-items");
  if (!existsSync(wiDir)) return null;

  const files = readdirSync(wiDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return null;

  // Load the most recently modified work item
  let latest = null;
  let latestMtime = 0;
  for (const f of files) {
    const path = join(wiDir, f);
    const stat = statSync(path);
    if (stat.mtimeMs > latestMtime) {
      latestMtime = stat.mtimeMs;
      try {
        latest = JSON.parse(readFileSync(path, "utf8"));
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
  return latest;
}

function matchesPattern(path, patterns) {
  if (!patterns || patterns.length === 0) return false;
  for (const pattern of patterns) {
    // Simple glob-like matching: * at end means directory prefix
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (path.startsWith(prefix)) return true;
    } else if (path === pattern) {
      return true;
    }
  }
  return false;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Skip on non-PR contexts (e.g., push to main)
  if (!process.env.GITHUB_BASE_REF) {
    console.log("Not a pull request; skipping edit-set compliance check.");
    process.exit(0);
  }

  const diff = getDiff(`origin/${process.env.GITHUB_BASE_REF}`);
  const changedFiles = getChangedFiles(diff);

  if (changedFiles.size === 0) {
    console.log("No changed files; edit-set check passes.");
    process.exit(0);
  }

  const workItem = loadCurrentWorkItem();
  if (!workItem) {
    console.log("No work item found; edit-set check skipped.");
    process.exit(0);
  }

  const allowedSet = workItem.allowed_edit_set || [];
  const violations = [];

  for (const file of changedFiles) {
    if (!matchesPattern(file, allowedSet)) {
      violations.push(file);
    }
  }

  if (violations.length > 0) {
    console.error(`FAIL: ${violations.length} file(s) modified outside allowed_edit_set:`);
    for (const f of violations) {
      console.error(`  - ${f}`);
    }
    console.error(`Allowed paths: ${allowedSet.join(", ")}`);
    process.exit(1);
  }

  console.log(`✓ All ${changedFiles.size} changed file(s) are within allowed_edit_set.`);
  process.exit(0);
}
