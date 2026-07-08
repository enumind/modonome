// Coverage for the Break the Ratchet judge harness (BREAK-THE-RATCHET.md).
// The safety invariant under test throughout: the judge never applies or
// executes a submitted diff. It only ever reads the .patch file as text and
// hands it to guard-ratchet.mjs's existing --diff mode, itself a pure text
// analyzer. These tests confirm that boundary holds and that the four
// possible verdict combinations are each reported correctly and honestly
// (a candidate break is never silently upgraded to a confirmed one).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSubmission, runRatchetAgainstSubmission, judge } from "../challenge/judge.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// ---------------------------------------------------------------------------
// loadSubmission
// ---------------------------------------------------------------------------

test("loadSubmission loads the real seeded example cleanly", () => {
  const dir = join(root, "challenge", "examples", "expected-value-drift");
  const { patchPath, declaration, problems } = loadSubmission(dir);
  assert.deepEqual(problems, []);
  assert.ok(patchPath.endsWith(".patch"));
  assert.equal(declaration.category, "expected-value-drift");
  assert.equal(declaration.expectedRatchetVerdict, "should-block");
});

test("loadSubmission reports a missing declaration.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "btr-submission-"));
  try {
    const { problems } = loadSubmission(dir);
    assert.ok(problems.some((p) => /declaration\.json/.test(p)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadSubmission reports a declaration that fails schema validation", () => {
  const dir = mkdtempSync(join(tmpdir(), "btr-submission-"));
  try {
    writeFileSync(join(dir, "declaration.json"), JSON.stringify({ title: "x" }));
    writeFileSync(join(dir, "a.patch"), "diff --git a/x b/x\n");
    const { problems } = loadSubmission(dir);
    assert.ok(problems.length > 0);
    assert.ok(problems.some((p) => /declaration\.json:/.test(p)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadSubmission reports a missing patch file", () => {
  const dir = mkdtempSync(join(tmpdir(), "btr-submission-"));
  try {
    writeFileSync(join(dir, "declaration.json"), JSON.stringify({
      title: "t", category: "novel", claim: "c", whyRealWeakening: "w", expectedRatchetVerdict: "should-block",
    }));
    const { problems } = loadSubmission(dir);
    assert.ok(problems.some((p) => /no \.patch or \.diff file/.test(p)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// runRatchetAgainstSubmission: confirms the safety boundary
// ---------------------------------------------------------------------------

test("runRatchetAgainstSubmission never applies the diff, only analyzes its text", () => {
  // A patch that, if it were ever applied or executed, would reference a path
  // that does not exist anywhere in this repo. If this test passes, the judge
  // did nothing but text-analyze it (guard-ratchet's --diff mode has no
  // filesystem write path at all).
  const dir = mkdtempSync(join(tmpdir(), "btr-safety-"));
  try {
    const patchPath = join(dir, "a.patch");
    writeFileSync(patchPath, [
      "diff --git a/tests/nonexistent-path-marker.test.js b/tests/nonexistent-path-marker.test.js",
      "--- a/tests/nonexistent-path-marker.test.js",
      "+++ b/tests/nonexistent-path-marker.test.js",
      "@@",
      '-    assert.equal(x, 1);',
      "+    // removed",
    ].join("\n") + "\n");
    const result = runRatchetAgainstSubmission(patchPath);
    // The ratchet must have produced a verdict from the diff TEXT, with no
    // filesystem side effect: the referenced path is never created.
    assert.ok(typeof result.status === "number");
    assert.equal(existsSync(join(root, "tests", "nonexistent-path-marker.test.js")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// judge: the four verdict combinations
// ---------------------------------------------------------------------------

test("judge reports candidate-break when a should-block diff is not flagged", () => {
  const result = judge({ expectedRatchetVerdict: "should-block" }, { status: 0 });
  assert.equal(result.verdict, "candidate-break");
});

test("judge reports not-a-break when a should-block diff IS flagged", () => {
  const result = judge({ expectedRatchetVerdict: "should-block" }, { status: 1 });
  assert.equal(result.verdict, "not-a-break");
});

test("judge reports false-positive-candidate when a should-pass diff is flagged", () => {
  const result = judge({ expectedRatchetVerdict: "should-pass" }, { status: 1 });
  assert.equal(result.verdict, "false-positive-candidate");
});

test("judge reports consistent-pass when a should-pass diff is not flagged", () => {
  const result = judge({ expectedRatchetVerdict: "should-pass" }, { status: 0 });
  assert.equal(result.verdict, "consistent-pass");
});

// ---------------------------------------------------------------------------
// End to end against the real seeded example and a real existing gaming fixture
// ---------------------------------------------------------------------------

test("end to end: the seeded expected-value-drift example is a genuine candidate break", () => {
  const dir = join(root, "challenge", "examples", "expected-value-drift");
  const { patchPath, declaration } = loadSubmission(dir);
  const ratchetResult = runRatchetAgainstSubmission(patchPath);
  const result = judge(declaration, ratchetResult);
  assert.equal(ratchetResult.status, 0, "the ratchet must not flag this diff, or the example no longer demonstrates the documented gap");
  assert.equal(result.verdict, "candidate-break");
});

test("end to end: a real existing gaming fixture, submitted as should-block, is correctly not-a-break", () => {
  const dir = mkdtempSync(join(tmpdir(), "btr-known-gaming-"));
  try {
    writeFileSync(join(dir, "declaration.json"), JSON.stringify({
      title: "Known assertion removal (control case)",
      category: "assertion-removal",
      claim: "Removes an assertion outright.",
      whyRealWeakening: "This is a known, already-caught pattern used here only to prove the judge correctly reports not-a-break for a diff the ratchet already blocks.",
      expectedRatchetVerdict: "should-block",
    }));
    writeFileSync(join(dir, "a.patch"), readFileSync(join(root, "fixtures", "ratchet-diffs", "gaming", "remove-assert.diff")));
    const { patchPath, declaration } = loadSubmission(dir);
    const ratchetResult = runRatchetAgainstSubmission(patchPath);
    const result = judge(declaration, ratchetResult);
    assert.equal(ratchetResult.status, 1);
    assert.equal(result.verdict, "not-a-break");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
