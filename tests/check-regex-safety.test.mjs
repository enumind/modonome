import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { redosFindings, regexSafetyProblems } from "../scripts/check-regex-safety.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

test("the gate passes on this repo's detector modules", () => {
  const r = spawnSync("node", [join(root, "scripts/check-regex-safety.mjs")], { encoding: "utf8", timeout: 30000 });
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /no nested-quantifier patterns/);
});

test("regexSafetyProblems finds nothing in the live detectors", async () => {
  assert.deepEqual(await regexSafetyProblems(), []);
});

test("redosFindings flags the catastrophic nested-quantifier class", () => {
  for (const p of ["(a+)+", "(a*)+", "(\\d+)*", "\\b(x+)+\\b", "(ab+){2,}"]) {
    assert.ok(redosFindings(p).length > 0, `should flag ${p}`);
  }
});

test("redosFindings does not flag safe patterns (no false positives)", () => {
  const safe = [
    "\\b(claude|gpt|openai)\\b", // alternation of literals
    "[/\\-_.\\s]+", // a single quantified character class
    "\\bclaude\\b",
    "co-" + "authored-by|generated with", // a real signature fragment, split so this file stays clean
    "(a|b|c)", // an unquantified group
    "(claude|gpt)\\b", // group followed by an anchor, not a quantifier
    "[a+]+", // a literal + inside a class, then a quantifier: not nested
  ];
  for (const p of safe) {
    assert.deepEqual(redosFindings(p), [], `should not flag ${p}`);
  }
});
