import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseCheckerTelemetry,
  hasChangeRequestSignal,
  countRaisedQuestions,
  CHANGE_REQUEST_SIGNALS,
} from "../scripts/agent/parse-checker-telemetry.mjs";

const ENGAGED_TRANSCRIPT = `
Checker review

Findings:
1. The error path does not close the file handle.
2. The retry loop has no backoff.

Concern: the timeout default seems too low for slow networks.
Is the cache invalidated on write?
Does this handle empty input?
Does this handle empty input?

I request changes before this can merge. Please fix the file handle leak.
`;

const GHOST_TRANSCRIPT = `
Checker review

Looks good. Approved. Nice clean implementation, no issues found.
`;

test("engaged checker transcript: requested changes true", () => {
  const result = parseCheckerTelemetry(ENGAGED_TRANSCRIPT);
  assert.equal(result.checker_requested_changes, true);
});

test("engaged checker transcript: questions raised > 0 and matches heuristic", () => {
  const result = parseCheckerTelemetry(ENGAGED_TRANSCRIPT);
  assert.ok(result.checker_questions_raised > 0);
  assert.equal(result.checker_questions_raised, countRaisedQuestions(ENGAGED_TRANSCRIPT));
  // 2 numbered findings + 1 "Concern:" line + 2 distinct "?" lines, deduped
  // (the two "Does this handle empty input?" lines count once).
  assert.equal(result.checker_questions_raised, 5);
});

test("ghost checker transcript: no engagement", () => {
  const result = parseCheckerTelemetry(GHOST_TRANSCRIPT);
  assert.equal(result.checker_requested_changes, false);
  assert.equal(result.checker_questions_raised, 0);
});

test("empty transcript yields false/0", () => {
  assert.deepEqual(parseCheckerTelemetry(""), {
    checker_requested_changes: false,
    checker_questions_raised: 0,
  });
});

test("undefined transcript yields false/0", () => {
  assert.deepEqual(parseCheckerTelemetry(undefined), {
    checker_requested_changes: false,
    checker_questions_raised: 0,
  });
});

test("null transcript yields false/0", () => {
  assert.deepEqual(parseCheckerTelemetry(null), {
    checker_requested_changes: false,
    checker_questions_raised: 0,
  });
});

test("hasChangeRequestSignal is case-insensitive and covers documented phrases", () => {
  for (const phrase of CHANGE_REQUEST_SIGNALS) {
    assert.equal(hasChangeRequestSignal(`Review note: ${phrase.toUpperCase()} here.`), true, phrase);
  }
  assert.equal(hasChangeRequestSignal("Approved, no concerns."), false);
});

test("hasChangeRequestSignal handles empty input", () => {
  assert.equal(hasChangeRequestSignal(""), false);
  assert.equal(hasChangeRequestSignal(undefined), false);
});

test("countRaisedQuestions counts trailing-? lines", () => {
  const t = "Is this safe?\nWhat about concurrency?\nApproved otherwise.";
  assert.equal(countRaisedQuestions(t), 2);
});

test("countRaisedQuestions counts concern/question/issue markers case-insensitively", () => {
  const t = "concern: leak risk\nQUESTION: is this tested?\nIssue: missing null check";
  // "QUESTION: is this tested?" matches both the marker and trailing "?" but
  // is one distinct line, so it counts once.
  assert.equal(countRaisedQuestions(t), 3);
});

test("countRaisedQuestions counts numbered findings only under a Findings/Concerns heading", () => {
  const withHeading = "Findings:\n1. First issue.\n2. Second issue.";
  assert.equal(countRaisedQuestions(withHeading), 2);

  const withoutHeading = "Steps:\n1. Run the build.\n2. Run the tests.";
  assert.equal(countRaisedQuestions(withoutHeading), 0);
});

test("countRaisedQuestions dedupes identical lines", () => {
  const t = "Is this safe?\nIs this safe?\nIs this safe?";
  assert.equal(countRaisedQuestions(t), 1);
});

test("countRaisedQuestions handles empty and whitespace-only input", () => {
  assert.equal(countRaisedQuestions(""), 0);
  assert.equal(countRaisedQuestions(undefined), 0);
  assert.equal(countRaisedQuestions("   \n\n  \n"), 0);
});

test("countRaisedQuestions caps at the pathological-input maximum", () => {
  const lines = [];
  for (let i = 0; i < 500; i++) lines.push(`Distinct question number ${i}?`);
  const result = countRaisedQuestions(lines.join("\n"));
  assert.ok(result <= 50);
  assert.equal(result, 50);
});

test("Concerns heading also enables numbered-item counting", () => {
  const t = "Concerns:\n1. Naming is inconsistent.\n2. Missing tests.";
  assert.equal(countRaisedQuestions(t), 2);
});
