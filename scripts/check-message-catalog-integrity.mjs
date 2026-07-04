#!/usr/bin/env node
// Fail CI if .modonome/messages.yaml resolves any non_suppressible message's
// severity below its catalog floor, sets suppressed: true on one, or
// references an id the catalog doesn't define. This is the backstop for
// modonome's core guarantee that a governed repo's own CI gates cannot be
// silenced by the thing they are gating: message wording is operator-
// editable, but a gate-blocking message's severity is not. Loaded from the
// base branch in ci.yml (like guard-ratchet.mjs) so a PR cannot weaken this
// check in the same PR that weakens a message.
//
// Usage: node scripts/check-message-catalog-integrity.mjs [modonomeDir]
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkOverridesIntegrity } from "./lib/messages.mjs";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const modonomeDir = process.argv[2] ? join(root, process.argv[2]) : join(root, ".modonome");

const schema = JSON.parse(readFileSync(join(root, "schemas", "messages.schema.json"), "utf8"));
const overridesFile = join(modonomeDir, "messages.yaml");

console.log("Message catalog integrity");
console.log("==========================");

if (!existsSync(overridesFile)) {
  console.log("PASS: no messages.yaml present; nothing to check.");
  process.exit(0);
}

const overridesDoc = parseFlatYaml(readFileSync(overridesFile, "utf8"));
const problems = checkOverridesIntegrity(overridesDoc, schema);

if (problems.length === 0) {
  console.log("PASS: every message override respects its catalog severity floor.");
  process.exit(0);
}

console.error(`FAIL: ${problems.length} message catalog problem(s):\n`);
for (const p of problems) console.error("  - " + p);
process.exit(1);
