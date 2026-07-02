#!/usr/bin/env node
// Render a versioned role prompt by substituting ${VAR} placeholders from the
// environment. The CI workflow (.github/workflows/modonome-auto.yml) and the
// on-demand harness (scripts/agent/run-cycle.mjs) both render the same files in
// prompts/roles/, so the maker and checker instructions live in one
// CODEOWNER-protected source instead of being duplicated inline in the workflow.
//
// Usage: node scripts/agent/render-prompt.mjs <maker|checker>
//   Reads prompts/roles/<role>.txt and writes the rendered text to stdout.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const promptsDir = join(here, "..", "..", "prompts", "roles");

const PLACEHOLDER = /\$\{(\w+)\}/g;

// Build a compact repository-snapshot context block from the committed Tier 0
// signature, so every rendered role prompt starts pre-oriented and an agent can
// read the map instead of scanning the whole tree. Returns "" when no snapshot is
// present, so this degrades cleanly on a repo that has not generated one yet.
export function snapshotContext(root = process.cwd()) {
  const path = join(root, ".modonome", "snapshot", "signature.json");
  if (!existsSync(path)) return "";
  let sig;
  try { sig = JSON.parse(readFileSync(path, "utf8")); } catch { return ""; }
  const cmds = sig.commands || {};
  const entry = Array.isArray(sig.entrypoints) && sig.entrypoints.length ? sig.entrypoints.join(", ") : "(none detected)";
  return [
    "## Repository snapshot (read before scanning files)",
    "",
    "A committed snapshot summarizes this repository. Read `.modonome/snapshot/map.md` for",
    "modules, public API signatures, and import edges before opening files. Cite the F: and",
    "S: anchors and open only the lines you need. Always open the live file before editing;",
    "the snapshot is for navigation, not a substitute for the current bytes.",
    "",
    "Concurrency protocol: you are planning against the merkle_root below. Before you commit,",
    "re-verify it with `modonome snapshot . --verify`. If it still matches, apply. If it moved,",
    "run `modonome snapshot . --since <that root or your base ref>` to see what changed and",
    "reconcile, rather than applying a plan built on a stale view. The lease and the CI ratchet",
    "against the base branch remain the authoritative write-side check.",
    "",
    `- merkle_root: ${sig.merkle_root}`,
    `- snapshot_version: ${sig.snapshot_version}`,
    `- stack: ${sig.stack?.name || "unknown"} (${sig.stack?.pm || "unknown"})`,
    `- files: ${sig.size?.files ?? "?"}`,
    `- commands: test="${cmds.test || ""}" build="${cmds.build || ""}" lint="${cmds.lint || ""}"`,
    `- entrypoints: ${entry}`,
    "",
    "",
  ].join("\n");
}

// Substitute every ${VAR} from env. Throw if a referenced variable is unset, so a
// missing identity or branch fails loudly instead of rendering an empty value into
// a model prompt.
export function renderPrompt(role, env = process.env) {
  if (!/^[a-z]+$/.test(role)) throw new Error(`render-prompt: invalid role "${role}".`);
  const text = readFileSync(join(promptsDir, `${role}.txt`), "utf8");
  return text.replace(PLACEHOLDER, (_m, name) => {
    const value = env[name];
    if (value === undefined || value === "") {
      throw new Error(`render-prompt: ${role}.txt references \${${name}} but it is not set.`);
    }
    return value;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const role = process.argv[2];
  if (!role) {
    console.error("Usage: node scripts/agent/render-prompt.mjs <maker|checker>");
    process.exit(2);
  }
  try {
    process.stdout.write(snapshotContext() + renderPrompt(role));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
