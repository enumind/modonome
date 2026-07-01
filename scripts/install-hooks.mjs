#!/usr/bin/env node
// Install git hooks for this repo. Run automatically via npm prepare.
// Safe to re-run: overwrites existing hooks.
import { writeFileSync, chmodSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const hooksDir = join(root, ".git", "hooks");

if (!existsSync(hooksDir)) {
  // Not a git repo (e.g. installed as an npm package). Skip silently.
  process.exit(0);
}

const preCommit = join(hooksDir, "pre-commit");
writeFileSync(
  preCommit,
  [
    "#!/bin/sh",
    "# Auto-regenerate RELEASE-EVIDENCE.md so CI freshness check never fails.",
    "node scripts/build-release-evidence.mjs",
    'git add RELEASE-EVIDENCE.md',
    "# Auto-regenerate the repo snapshot so its freshness check stays green.",
    "node scripts/snapshot.mjs .",
    "git add .modonome/snapshot llms.txt",
  ].join("\n") + "\n"
);
chmodSync(preCommit, 0o755);
console.log("Installed pre-commit hook that regenerates RELEASE-EVIDENCE.md and the repo snapshot");
