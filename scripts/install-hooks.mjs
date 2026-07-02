#!/usr/bin/env node
// Install git hooks. Run automatically via npm prepare for modonome's own repo, and
// invoked by scaffold for a host repo during adoption. The self hook also refreshes
// RELEASE-EVIDENCE.md; a host hook only keeps the snapshot fresh via the CLI. For a
// host, an existing pre-commit hook is preserved rather than overwritten.
//
// A host that wants only the anti-gaming ratchet, without adopting the rest of
// modonome's agent-context tooling (AGENTS.md pointer, repo snapshot), can request
// mode: "ratchet" instead. That hook runs `npx modonome ratchet` against the
// commit and nothing else, so it works for a "non-agent adoption": a team that
// wants the gate but is not running an agent against this repo.
import { writeFileSync, chmodSync, existsSync, readFileSync } from "node:fs";
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

const RATCHET_HOOK = [
  "#!/bin/sh",
  "# Modonome: anti-gaming ratchet only. Rejects a commit that weakens tests,",
  "# skips, type escapes, or coverage gates relative to the last commit.",
  "npx modonome ratchet --staged || exit 1",
];

// True when targetRoot is modonome's own repo (not a host that merely depends on
// it or vendored a copy of these scripts). Checked by package.json name rather
// than by path, so it holds under a copied or symlinked scripts/ directory: an
// install running from a copy of this file must still answer "am I building
// modonome itself, or installing hooks into some other project".
export function isModonomeRepo(targetRoot) {
  try {
    const pkg = JSON.parse(readFileSync(join(targetRoot, "package.json"), "utf8"));
    return pkg.name === "modonome";
  } catch {
    return false;
  }
}

// Install the pre-commit hook into targetRoot. Returns "installed", "kept" (a host
// hook already existed and was preserved), or "no-git". self=true writes modonome's
// own dev hook and overwrites; a host install never clobbers an existing hook.
// mode "ratchet" selects the ratchet-only host hook instead of the snapshot hook;
// ignored when self=true, since modonome's own repo runs the ratchet in CI directly.
export function installHooks(targetRoot, { self = false, mode = "snapshot" } = {}) {
  const hooksDir = join(targetRoot, ".git", "hooks");
  if (!existsSync(hooksDir)) return "no-git";
  const preCommit = join(hooksDir, "pre-commit");
  if (!self && existsSync(preCommit)) return "kept";
  const content = self ? SELF_HOOK : mode === "ratchet" ? RATCHET_HOOK : HOST_HOOK;
  writeFileSync(preCommit, content.join("\n") + "\n");
  chmodSync(preCommit, 0o755);
  return "installed";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");
  const result = installHooks(root, { self: isModonomeRepo(root) });
  if (result === "installed") {
    console.log("Installed pre-commit hook that regenerates RELEASE-EVIDENCE.md and the repo snapshot");
  }
  process.exit(0);
}
