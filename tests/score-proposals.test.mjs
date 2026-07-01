import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreProposal,
  scoreProposals,
  deriveSignals,
  normalizeSignals,
  SIGNAL_MIN,
  SIGNAL_MAX,
  NEUTRAL_SIGNAL,
} from "../scripts/score-proposals.mjs";

test("scoreProposal computes the formula correctly for known signals", () => {
  const signals = {
    safety: 5,
    value: 4,
    repoFit: 3,
    reuse: 2,
    evidence: 1,
    effort: 1,
    blastRadius: 1,
    uncertainty: 1,
  };
  // additive: 5 + 4 + 3 + 2 + 1 = 15; subtractive: 1 + 1 + 1 = 3; score = 12
  assert.strictEqual(scoreProposal(signals), 12);
});

test("scoreProposal with all-neutral signals scores the neutral baseline", () => {
  // 5 additive fields and 3 subtractive fields, all at NEUTRAL_SIGNAL (2.5):
  // additive 5 * 2.5 = 12.5; subtractive 3 * 2.5 = 7.5; score = 5.
  const expected = NEUTRAL_SIGNAL * 5 - NEUTRAL_SIGNAL * 3;
  assert.strictEqual(scoreProposal({}), expected);
  assert.strictEqual(scoreProposal({}), 5);
});

test("scoreProposal with all-max additive and all-min subtractive scores at the ceiling", () => {
  const signals = {
    safety: 5, value: 5, repoFit: 5, reuse: 5, evidence: 5,
    effort: 0, blastRadius: 0, uncertainty: 0,
  };
  assert.strictEqual(scoreProposal(signals), 25);
});

test("scoreProposal with all-min additive and all-max subtractive scores at the floor", () => {
  const signals = {
    safety: 0, value: 0, repoFit: 0, reuse: 0, evidence: 0,
    effort: 5, blastRadius: 5, uncertainty: 5,
  };
  assert.strictEqual(scoreProposal(signals), -15);
});

test("missing fields default to the documented neutral value", () => {
  // Only safety provided; every other field must default to NEUTRAL_SIGNAL (2.5).
  const partial = { safety: 5 };
  const expected = 5 + NEUTRAL_SIGNAL * 4 - NEUTRAL_SIGNAL * 3;
  assert.strictEqual(scoreProposal(partial), expected);
});

test("scoreProposal with no signals object at all defaults every field to neutral", () => {
  const expected = NEUTRAL_SIGNAL * 5 - NEUTRAL_SIGNAL * 3;
  assert.strictEqual(scoreProposal(), expected);
  assert.strictEqual(scoreProposal(undefined), expected);
});

test("normalizeSignals fills every field and clamps out-of-range values", () => {
  const normalized = normalizeSignals({ safety: 10, effort: -5, value: 3 });
  assert.strictEqual(normalized.safety, SIGNAL_MAX, "values above the max clamp to the max");
  assert.strictEqual(normalized.effort, SIGNAL_MIN, "values below the min clamp to the min");
  assert.strictEqual(normalized.value, 3, "in-range values pass through unchanged");
  assert.strictEqual(normalized.repoFit, NEUTRAL_SIGNAL, "missing fields default to neutral");
  assert.strictEqual(normalized.reuse, NEUTRAL_SIGNAL);
  assert.strictEqual(normalized.evidence, NEUTRAL_SIGNAL);
  assert.strictEqual(normalized.blastRadius, NEUTRAL_SIGNAL);
  assert.strictEqual(normalized.uncertainty, NEUTRAL_SIGNAL);
});

test("normalizeSignals treats non-numeric and NaN input as neutral", () => {
  const normalized = normalizeSignals({ safety: "high", value: NaN });
  assert.strictEqual(normalized.safety, NEUTRAL_SIGNAL);
  assert.strictEqual(normalized.value, NEUTRAL_SIGNAL);
});

test("scoreProposals sorts descending by score", () => {
  const items = [
    { id: "low", signals: { safety: 1 } },
    { id: "high", signals: { safety: 5 } },
    { id: "mid", signals: { safety: 3 } },
  ];
  const sorted = scoreProposals(items);
  assert.deepStrictEqual(sorted.map((s) => s.id), ["high", "mid", "low"]);
  assert.ok(sorted[0].score > sorted[1].score);
  assert.ok(sorted[1].score > sorted[2].score);
});

test("scoreProposals breaks ties deterministically by original index", () => {
  const items = [
    { id: "a", signals: { safety: 3 } },
    { id: "b", signals: { safety: 3 } },
    { id: "c", signals: { safety: 3 } },
  ];
  const sorted = scoreProposals(items);
  assert.deepStrictEqual(sorted.map((s) => s.id), ["a", "b", "c"], "equal scores keep original order");
});

test("scoreProposals same input always yields the same order across repeated calls", () => {
  const items = [
    { id: "x", signals: { safety: 2, effort: 4 } },
    { id: "y", signals: { safety: 4, effort: 1 } },
    { id: "z", signals: { safety: 2, effort: 4 } },
  ];
  const first = scoreProposals(items).map((s) => s.id);
  for (let i = 0; i < 10; i++) {
    const again = scoreProposals(items).map((s) => s.id);
    assert.deepStrictEqual(again, first, "repeated calls must produce identical order");
  }
});

test("a higher-safety/lower-effort item ranks above a lower-safety/higher-effort one", () => {
  const items = [
    { id: "risky", signals: { safety: 1, effort: 4 } },
    { id: "safe", signals: { safety: 4, effort: 1 } },
  ];
  const sorted = scoreProposals(items);
  assert.strictEqual(sorted[0].id, "safe", "safer, lower-effort item must rank first");
  assert.ok(sorted[0].score > sorted[1].score);
});

test("scoreProposals accepts plain signals objects without a wrapping id", () => {
  const items = [
    { safety: 1 },
    { safety: 5 },
  ];
  const sorted = scoreProposals(items);
  assert.strictEqual(sorted[0].safety, 5);
  assert.strictEqual(sorted[1].safety, 1);
  assert.ok(sorted[0].score > sorted[1].score);
});

test("scoreProposals on an empty array returns an empty array", () => {
  assert.deepStrictEqual(scoreProposals([]), []);
  assert.deepStrictEqual(scoreProposals(), []);
});

test("scoreProposals preserves extra fields on each entry", () => {
  const items = [{ id: "a", proposal: "Add tests", signals: { safety: 4 } }];
  const sorted = scoreProposals(items);
  assert.strictEqual(sorted[0].id, "a");
  assert.strictEqual(sorted[0].proposal, "Add tests");
  assert.ok(typeof sorted[0].score === "number");
});

test("deriveSignals is deterministic for the same input", () => {
  const text = "Add focused tests around the most-changed file: foo.mjs.";
  const context = { hotFileChanges: 7 };
  const first = deriveSignals(text, context);
  const second = deriveSignals(text, context);
  assert.deepStrictEqual(first, second);
});

test("deriveSignals raises safety and lowers effort/blastRadius for a test-targeting proposal", () => {
  const signals = deriveSignals("Add focused tests around the most-changed file: foo.mjs.");
  const neutral = normalizeSignals();
  assert.ok(signals.safety > neutral.safety, "test-targeting proposals should score safer than neutral");
  assert.ok(signals.effort < neutral.effort, "test-targeting proposals should score lower effort than neutral");
  assert.ok(signals.blastRadius < neutral.blastRadius, "test-targeting proposals should score lower blast radius than neutral");
});

test("deriveSignals raises safety for a docs-targeting proposal", () => {
  const signals = deriveSignals("Document and gate one manual release or verification step.");
  const neutral = normalizeSignals();
  assert.ok(signals.safety > neutral.safety, "docs proposals should score safer than neutral");
});

test("deriveSignals with no context and non-matching text returns neutral defaults", () => {
  const signals = deriveSignals("Refactor the internal cache layer for clarity.");
  assert.strictEqual(signals.safety, NEUTRAL_SIGNAL);
  assert.strictEqual(signals.effort, NEUTRAL_SIGNAL);
});

test("deriveSignals handles non-string input without throwing", () => {
  const signals = deriveSignals(undefined);
  assert.strictEqual(signals.safety, NEUTRAL_SIGNAL);
  assert.strictEqual(signals.value, NEUTRAL_SIGNAL);
});

test("deriveSignals raises evidence and value with higher hot-file churn for file-naming proposals", () => {
  const lowChurn = deriveSignals("Add tests for the high-churn path in foo.mjs, then remove dead code.", { hotFileChanges: 1 });
  const highChurn = deriveSignals("Add tests for the high-churn path in foo.mjs, then remove dead code.", { hotFileChanges: 10 });
  assert.ok(highChurn.evidence >= lowChurn.evidence, "higher churn must not lower evidence");
  assert.ok(highChurn.value >= lowChurn.value, "higher churn must not lower value");
});

test("deriveSignals output is a valid signals object usable by scoreProposal", () => {
  const signals = deriveSignals("Add focused tests around the most-changed file: foo.mjs.", { hotFileChanges: 3 });
  const score = scoreProposal(signals);
  assert.ok(typeof score === "number" && !Number.isNaN(score));
});
