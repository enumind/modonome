import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { corpusProblems, LIVE_DETECTORS } from "../scripts/check-attribution-fp-corpus.mjs";
import { SAFE_BRANCH_NAMES, SAFE_IDENTITIES, SAFE_TEXT_SNIPPETS } from "../scripts/lib/attribution-fp-corpus.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

test("the gate passes on this repo's live detectors", () => {
  const r = spawnSync("node", [join(root, "scripts/check-attribution-fp-corpus.mjs")], { encoding: "utf8", timeout: 30000 });
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /stay clean under both layers/);
});

test("live detectors produce no false positives on the corpus", () => {
  assert.deepEqual(corpusProblems(LIVE_DETECTORS), []);
});

test("the gate catches an over-broad promotion (the Robin Bott regression)", () => {
  // A naive substring rule for "bot" would flag the human surname "Bott".
  const poisoned = { ...LIVE_DETECTORS, strictId: (name) => /bot/i.test(name || "") };
  const problems = corpusProblems(poisoned);
  assert.ok(problems.some((p) => p.includes("Robin Bott")), "must flag the Robin Bott regression");
});

test("the gate catches an over-broad free-text promotion", () => {
  // A rule that flags the bare word "assistant" would trip the job-title snippet.
  const poisoned = { ...LIVE_DETECTORS, fuzzyText: (text) => /\bassistant\b/i.test(text) };
  const problems = corpusProblems(poisoned);
  assert.ok(problems.some((p) => p.includes("assistant professor")), "must flag the job-title snippet");
});

test("the corpus is non-trivial in every category", () => {
  assert.ok(SAFE_BRANCH_NAMES.length >= 5);
  assert.ok(SAFE_IDENTITIES.some((e) => e.name === "Robin Bott"), "must retain the Robin Bott guard");
  assert.ok(SAFE_TEXT_SNIPPETS.length >= 5);
});
