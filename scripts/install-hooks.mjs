#!/usr/bin/env node
// Install git hooks. Run automatically via npm prepare for modonome's own repo, and
// invoked by scaffold for a host repo during adoption. The self hook also refreshes
// RELEASE-EVIDENCE.md; a host hook only keeps the snapshot fresh via the CLI. For a
// host, an existing pre-commit hook is preserved rather than overwritten.
import { writeFileSync, chmodSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SELF_HOOK = [
  "#!/bin/sh",
  "# Auto-regenerate RELEASE-EVIDENCE.md so CI freshness check never fails.",
  "node scripts/build-release-evidence.mjs",
  "git add RELEASE-EVIDENCE.md",
  "# Refresh the repo snapshot only when content changed. --verify is a cheap",
  "# Merkle-only check; the full rebuild runs solely when it reports drift.",
  "node scripts/snapshot.mjs . --verify >/dev/null 2>&1 || node scripts/snapshot.mjs .",
  "git add .modonome/snapshot llms.txt",
];

const HOST_HOOK = [
  "#!/bin/sh",
  "# Modonome: keep the repo snapshot fresh on every commit.",
  "npx modonome snapshot . --verify >/dev/null 2>&1 || npx modonome snapshot .",
  "git add .modonome/snapshot llms.txt",
];

// Install the pre-commit hook into targetRoot. Returns "installed", "kept" (a host
// hook already existed and was preserved), or "no-git". self=true writes modonome's
// own dev hook and overwrites; a host install never clobbers an existing hook.
export function installHooks(targetRoot, { self = false } = {}) {
  const hooksDir = join(targetRoot, ".git", "hooks");
  if (!existsSync(hooksDir)) return "no-git";
  const preCommit = join(hooksDir, "pre-commit");
  if (!self && existsSync(preCommit)) return "kept";
  writeFileSync(preCommit, (self ? SELF_HOOK : HOST_HOOK).join("\n") + "\n");
  chmodSync(preCommit, 0o755);
  return "installed";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");
  const result = installHooks(root, { self: true });
  if (result === "installed") {
    console.log("Installed pre-commit hook that regenerates RELEASE-EVIDENCE.md and the repo snapshot");
  }
  process.exit(0);
}
