#!/usr/bin/env node
// Build the single-file prompt bundle from the core plus modules.
// The bundle is the portability guarantee. The core plus modules are what a
// capable harness loads on demand. CI runs this with --check to prove they agree.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const promptsDir = join(here, "..", "prompts");
const overrides = loadMessageOverrides(join(here, "..", ".modonome"));

// Module order is fixed and load-bearing. Keep it in sync with the core's module list.
const MODULE_ORDER = [
  "adoption",
  "state-machine",
  "roles",
  "gates",
  "control-panel",
  "network",
  "snapshot",
];

const HEADER = `<!-- modonome:bundle GENERATED. Do not edit by hand. Run: node scripts/build-prompt.mjs --write -->\n`;

function buildBundle() {
  const core = readFileSync(join(promptsDir, "modonome.core.md"), "utf8").trimEnd();
  const parts = [core];
  for (const name of MODULE_ORDER) {
    const text = readFileSync(join(promptsDir, "modules", `${name}.md`), "utf8").trimEnd();
    parts.push(text);
  }
  return HEADER + "\n" + parts.join("\n\n") + "\n";
}

const bundlePath = join(promptsDir, "modonome.bundle.md");
const built = buildBundle();
const mode = process.argv[2] || "--check";

if (mode === "--write") {
  writeFileSync(bundlePath, built);
  console.log("wrote prompts/modonome.bundle.md");
  process.exit(0);
}

let current = "";
try {
  current = readFileSync(bundlePath, "utf8");
} catch {
  current = "";
}

if (current !== built) {
  console.error(formatMessage("advisory.build-prompt.bundle-drift", {}, overrides).message);
  process.exit(1);
}
console.log("Bundle check: core plus modules match the committed bundle.");
