// Deterministic checker-telemetry parsing (ADR-022, WI-034). The anti-rubber-
// stamp gate (scripts/check-checker-engagement.mjs) needs to know, per checker
// run, whether the checker actually engaged: did it request changes, and did
// it raise any concerns or questions. This module derives both signals from
// the raw checker transcript text with plain string/regex heuristics. No
// model call, no network, no randomness: the same transcript always yields
// the same result.
//
// These are approximate signals, not an exact semantic parse of the
// transcript. They are tuned to catch the common phrasings a checker role
// produces and to be cheap to reason about and test. False negatives (an
// engaged checker read as a ghost) are more likely than false positives; the
// signal-phrase and heuristic lists below are deliberately small and can be
// extended if real transcripts show a gap.

const MAX_QUESTIONS = 50;

// Case-insensitive signal phrases that mean the checker withheld approval or
// asked for changes. Matching any one sets checker_requested_changes = true.
export const CHANGE_REQUEST_SIGNALS = [
  "request changes",
  "requested changes",
  "changes requested",
  "needs_rework",
  "needs rework",
  "please fix",
  "must fix",
  "blocking",
];

// A heading that introduces a list of raised concerns/questions. A line
// starting with a leading number ("1.", "2)", etc.) under one of these
// headings counts as a raised concern even without a trailing "?".
const CONCERN_HEADING_RE = /^\s*#{0,6}\s*(findings|concerns)\s*:?\s*$/i;

// Line-start markers that explicitly flag a concern or question.
const CONCERN_MARKER_RE = /^\s*(concern|question|issue)\s*:/i;

// A numbered list item, e.g. "1. ..." or "2) ...".
const NUMBERED_ITEM_RE = /^\s*\d+[.)]\s+\S/;

/**
 * True when the transcript contains any documented change-request signal
 * phrase (case-insensitive). Pure string search: no partial-word surprises
 * beyond what the phrase itself implies.
 *
 * @param {string} transcript
 * @returns {boolean}
 */
export function hasChangeRequestSignal(transcript) {
  if (!transcript) return false;
  const lower = transcript.toLowerCase();
  return CHANGE_REQUEST_SIGNALS.some((phrase) => lower.includes(phrase));
}

/**
 * Count distinct raised concerns/questions in the transcript.
 *
 * Heuristic (documented, approximate, not semantic):
 *   - Any line ending in "?" counts once.
 *   - Any line starting with "concern:", "question:", or "issue:" counts
 *     once (case-insensitive), even if it has no trailing "?".
 *   - A numbered list item ("1.", "2)", ...) counts once, but only while
 *     inside a "Findings" or "Concerns" section (a line matching
 *     CONCERN_HEADING_RE), since numbered lists appear throughout normal
 *     transcripts for unrelated reasons.
 *   - Lines are deduplicated after trimming, so a repeated line (e.g. a
 *     question echoed twice) is only counted once.
 *   - The result is capped at MAX_QUESTIONS to avoid a pathological
 *     transcript (thousands of repeated "?" lines) inflating the count
 *     without bound.
 *
 * @param {string} transcript
 * @returns {number}
 */
export function countRaisedQuestions(transcript) {
  if (!transcript) return 0;
  const lines = transcript.split(/\r?\n/);
  const seen = new Set();
  let inConcernSection = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (CONCERN_HEADING_RE.test(line)) {
      inConcernSection = true;
      continue;
    }

    let isConcern = false;
    if (line.endsWith("?")) isConcern = true;
    else if (CONCERN_MARKER_RE.test(line)) isConcern = true;
    else if (inConcernSection && NUMBERED_ITEM_RE.test(line)) isConcern = true;

    if (isConcern && !seen.has(line)) {
      seen.add(line);
      if (seen.size >= MAX_QUESTIONS) break;
    }
  }

  return Math.min(seen.size, MAX_QUESTIONS);
}

/**
 * Derive checker-engagement telemetry from a checker transcript.
 *
 * @param {string|undefined|null} transcript - Full checker transcript text.
 * @returns {{checker_requested_changes: boolean, checker_questions_raised: number}}
 */
export function parseCheckerTelemetry(transcript) {
  if (!transcript) return { checker_requested_changes: false, checker_questions_raised: 0 };
  return {
    checker_requested_changes: hasChangeRequestSignal(transcript),
    checker_questions_raised: countRaisedQuestions(transcript),
  };
}
