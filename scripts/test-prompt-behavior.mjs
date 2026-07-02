#!/usr/bin/env node
// Prompt behavioral-regression gate (ADR-021). The textual drift guard proves the
// committed bundle matches the sources. This gate proves the governing rules that
// produce canonical engine decisions still exist in the committed prompt.
//
// CI cannot call a model, so behavioral regression is checked deterministically.
// Each frozen fixture encodes a canonical scenario, its golden engine decision, and
// the distinctive rule text (anchors) that must appear in the committed prompt for
// that decision to hold. If a prompt edit removes or reshapes a governing rule, its
// anchor goes missing and the fixture fails, catching behavioral drift that a purely
// textual bundle check would pass.
//
// No network, no model call. Zero runtime dependencies.
//
// Usage: node scripts/test-prompt-behavior.mjs
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = join(here, "..");

// The prompt source files whose concatenation forms the governing text. The engine
// reads the core plus any loaded module and role, so the behavioral rules can live in
// any of these. Reading the sources (not the generated bundle) keeps this gate honest
// even if the bundle is stale, which the drift guard catches separately.
const PROMPT_FILES = [
  "prompts/modonome.core.md",
  "prompts/modules/adoption.md",
  "prompts/modules/state-machine.md",
  "prompts/modules/roles.md",
  "prompts/modules/gates.md",
  "prompts/modules/control-panel.md",
  "prompts/modules/network.md",
  "prompts/roles/maker.txt",
  "prompts/roles/checker.txt",
];

/**
 * Concatenate the committed prompt source files into one searchable string.
 * @param {string} root repository root that contains the prompts directory
 * @returns {string} the concatenated committed prompt text
 */
export function resolvePromptText(root) {
  const parts = [];
  for (const rel of PROMPT_FILES) {
    parts.push(readFileSync(join(root, rel), "utf8"));
  }
  return parts.join("\n");
}

/**
 * Load every fixture JSON file from a directory.
 * @param {string} dir directory holding fixture *.json files
 * @returns {Array<object>} parsed fixture objects, sorted by file name for stable output
 */
export function loadFixtures(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const fixtures = [];
  for (const f of files) {
    const raw = readFileSync(join(dir, f), "utf8");
    const obj = JSON.parse(raw);
    obj.__file = f;
    fixtures.push(obj);
  }
  return fixtures;
}

/**
 * Evaluate one fixture against the committed prompt text. A fixture is ok only when
 * every one of its anchors is present, meaning the governing rule that produces its
 * golden decision still exists in the prompt.
 * @param {object} fixture a parsed fixture object
 * @param {string} promptText the concatenated committed prompt text
 * @returns {{ id: string, ok: boolean, reason: string }} evaluation result
 */
export function evaluateFixture(fixture, promptText) {
  const id = fixture && fixture.id ? String(fixture.id) : "(unnamed fixture)";
  const anchors = fixture && Array.isArray(fixture.anchors) ? fixture.anchors : null;
  if (!anchors || anchors.length === 0) {
    return { id, ok: false, reason: "fixture declares no anchors" };
  }
  const missing = anchors.filter((a) => !promptText.includes(a));
  if (missing.length > 0) {
    return {
      id,
      ok: false,
      reason: `governing rule text missing from prompt: ${missing.map((a) => JSON.stringify(a)).join(", ")}`,
    };
  }
  return { id, ok: true, reason: "all anchors present" };
}

/**
 * Run the whole suite: load fixtures, resolve prompt text, evaluate each.
 * @param {string} root repository root
 * @param {string} fixturesDir directory holding fixtures
 * @returns {{ results: Array<{id: string, ok: boolean, reason: string}>, failed: number }}
 */
export function runSuite(root, fixturesDir) {
  const promptText = resolvePromptText(root);
  const fixtures = loadFixtures(fixturesDir);
  const results = fixtures.map((fx) => evaluateFixture(fx, promptText));
  const failed = results.filter((r) => !r.ok).length;
  return { results, failed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.env.MODONOME_ROOT ? process.env.MODONOME_ROOT : defaultRoot;
  const fixturesDir = join(root, "tests", "fixtures", "prompt-behavior");
  const { results, failed } = runSuite(root, fixturesDir);

  console.log("Prompt behavioral regression (ADR-021)");
  console.log("======================================");
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.id}  ${r.reason}`);
  }
  if (failed === 0) {
    console.log(`\nPASS: ${results.length} canonical scenario(s) still anchored to their governing rule.`);
    process.exit(0);
  }
  console.error(`\nFAIL: ${failed} of ${results.length} scenario(s) lost their governing rule text.`);
  console.error("A prompt edit removed or reshaped a rule that produces a golden decision.");
  console.error("If the behavioral change is intentional, update the fixture and cite the ADR/PR.");
  process.exit(1);
}
