#!/usr/bin/env node
// Deterministic task-priority scoring. Surfaces the highest-value,
// lowest-risk improvement first. Pure functions only: no randomness, no
// clock reads, no I/O. Same input always yields the same score and order.
//
// Signal scale: every signal is a bounded number in [0, 5].
//   0 = worst / least (unsafe, low value, poor fit, no reuse, no evidence,
//       high effort, wide blast radius, high uncertainty)
//   5 = best / most (very safe, high value, strong repo fit, high reuse,
//       strong evidence, trivial effort, tiny blast radius, fully certain)
// Missing fields default to NEUTRAL_SIGNAL (2.5, the midpoint of the scale)
// so an absent signal neither helps nor hurts the score.
//
// Formula:
//   score = safety + value + repoFit + reuse + evidence
//           - effort - blastRadius - uncertainty
//
// Fields that add to the score (higher is better):
//   safety      how safe the change is to attempt (reversible, well-tested area)
//   value       expected benefit if the change lands
//   repoFit     how well the proposal matches this repo's stack and conventions
//   reuse       how much existing code, tests, or patterns can be reused
//   evidence    how much concrete signal supports the proposal (for example
//               hot-file churn, an existing failing gate, a named file)
//
// Fields that subtract from the score (higher is worse):
//   effort      estimated size or complexity of the change
//   blastRadius how much surface area the change could affect if wrong
//   uncertainty how unclear the proposal or its outcome is

export const SIGNAL_MIN = 0;
export const SIGNAL_MAX = 5;
export const NEUTRAL_SIGNAL = 2.5;

const ADDITIVE_FIELDS = ["safety", "value", "repoFit", "reuse", "evidence"];
const SUBTRACTIVE_FIELDS = ["effort", "blastRadius", "uncertainty"];
const ALL_FIELDS = [...ADDITIVE_FIELDS, ...SUBTRACTIVE_FIELDS];

function clamp(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return NEUTRAL_SIGNAL;
  if (n < SIGNAL_MIN) return SIGNAL_MIN;
  if (n > SIGNAL_MAX) return SIGNAL_MAX;
  return n;
}

// Fill in missing signal fields with the documented neutral value and clamp
// every field to the [SIGNAL_MIN, SIGNAL_MAX] scale.
export function normalizeSignals(signals = {}) {
  const normalized = {};
  for (const field of ALL_FIELDS) {
    const raw = signals[field];
    normalized[field] = raw === undefined ? NEUTRAL_SIGNAL : clamp(raw);
  }
  return normalized;
}

// Pure scoring function. Higher score means higher priority: more value and
// safety for less effort, risk, and uncertainty.
export function scoreProposal(signals = {}) {
  const s = normalizeSignals(signals);
  const additive = ADDITIVE_FIELDS.reduce((sum, f) => sum + s[f], 0);
  const subtractive = SUBTRACTIVE_FIELDS.reduce((sum, f) => sum + s[f], 0);
  return additive - subtractive;
}

// Sort proposals by descending score. Each entry may be a plain signals
// object or carry signals under an explicit `signals` key alongside other
// fields (for example `id` or `proposal` text), which are preserved as-is.
// Ties are broken deterministically by original index (stable order), never
// by randomness, so identical input always yields identical output.
export function scoreProposals(proposalsWithSignals = []) {
  const withScores = proposalsWithSignals.map((entry, index) => {
    const signals = entry && typeof entry === "object" && "signals" in entry ? entry.signals : entry;
    return { entry, index, score: scoreProposal(signals) };
  });

  withScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return withScores.map(({ entry, score }) => ({ ...entry, score }));
}

// Heuristic, deterministic signal derivation from a proposal string and a
// simple context object. This is a convenience default, not a source of
// truth: callers with better signals should pass them directly to
// scoreProposal/scoreProposals instead of relying on this heuristic.
//
// context fields (all optional):
//   hotFileChanges  number of recent-history changes to the file the
//                   proposal targets (higher churn raises evidence and value,
//                   and raises blastRadius since the file is more active)
//   targetsTests    true when the proposal's primary target is a test file
//   targetsDocs     true when the proposal's primary target is documentation
export function deriveSignals(proposalText, context = {}) {
  const text = typeof proposalText === "string" ? proposalText : "";
  const lower = text.toLowerCase();
  const hotFileChanges = typeof context.hotFileChanges === "number" ? context.hotFileChanges : 0;
  const targetsTests = context.targetsTests === true || /\btest/.test(lower);
  const targetsDocs = context.targetsDocs === true || /\bdocument|\breadme/.test(lower);
  const namesFile = /[\w./-]+\.[a-z]{1,5}\b/.test(text);

  const signals = { ...normalizeSignals() };

  // Tests are low blast-radius and low effort by nature: they add coverage
  // without touching production behavior.
  if (targetsTests) {
    signals.safety = 4;
    signals.effort = 1.5;
    signals.blastRadius = 1;
  }

  // Docs and gating changes are also low risk, slightly higher effort than
  // a pure test add since they often require judgment about scope.
  if (targetsDocs) {
    signals.safety = 4;
    signals.blastRadius = 1;
  }

  // A named, high-churn file is concrete evidence and raises expected value,
  // but a file that changes often is also more likely to be touched by other
  // work in flight, which raises blast radius.
  if (namesFile) {
    signals.evidence = clamp(3 + Math.min(hotFileChanges, 10) / 10);
    signals.value = clamp(3 + Math.min(hotFileChanges, 10) / 10);
    signals.blastRadius = clamp(signals.blastRadius + Math.min(hotFileChanges, 10) / 10);
  }

  return signals;
}
