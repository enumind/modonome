# ADR-022: Anti-Rubber-Stamp Checker Telemetry

**Status:** Accepted  
**Date:** 2026-06-25  
**Milestone:** 6 (Self-governance hardening)

## Context

The maker-checker-merger contract (GOVERNANCE.md) requires:
- A maker that creates the diff
- A checker that did not create the diff
- A distinct merge authority

The checker's role is to run deterministic gates first, then review the diff and the
rationale. A "persuasive rationale is evidence, not a verdict": the checker must actively
engage, not passively approve.

Today, there is no metric for checker engagement. A checker that approves every run with no
changes, no questions, and no findings is indistinguishable from an active checker. If the
checker role is played by an agent with low capability or misconfigured confidence, it can
rubber-stamp changes silently.

This is the "checker gaming" risk: the contract *says* the checker is independent, but
without telemetry, gaming is invisible until a problem surfaces in production.

## Decision

1. **Capture checker metrics** in the run transcript and in `.modonome/metrics.jsonl`:

   Implemented:
   - `checker_requested_changes`: boolean, true if checker requested changes before approval
   - `checker_questions_raised`: count of distinct findings or concerns

   Deferred (requires pipeline instrumentation):
   - `checker_modified_diff`: boolean, true if checker's changes changed the final diff
   - `checker_approval_after_changes`: latency from maker's diff to checker's "approved"

2. **Gate for checker ghosting:** Implemented as `scripts/check-checker-engagement.mjs`, a
   CI gate (kept out of `guard-ratchet.mjs`, which stays diff-only and base-branch-isolated):
   - If the same checker approves `MODONOME_GHOST_THRESHOLD` (default 10) consecutive runs with
     `checker_requested_changes` = false and `checker_questions_raised` = 0, the gate fails:
     "Checker has approved N consecutive runs with no engagement. Reset by asking for changes
     on the next run, or escalate to a different checker."
   - The counter resets on real engagement (a requested change or a raised question), so the
     contract stays usable; a checker that engages clears the pattern.

**Status of implementation:** `scripts/check-checker-engagement.mjs`, wired into
`.github/workflows/ci.yml`, covered by `tests/maker-checker.test.mjs`. With no checker
telemetry yet, the gate passes; it activates once the loop writes the fields above.

3. **Telemetry is published** in the control panel (Milestone 3) so an owner can see checker
   engagement trends and detect patterns.

4. **Self-application:** Metrics are captured for Modonome's own runs. If the internal checker
   falls below engagement thresholds, the tool is not fit to validate others' checkers.

## Consequences

- Checker gaming becomes visible in metrics.
- A checker with low engagement can be detected and replaced or retrained.
- The tool has data to recommend (to users) how to select checker models or when to require
  a human checker instead of an agent.
- Telemetry overhead is minimal (a few booleans per run, one counter).
- The partial implementation (checker_requested_changes and checker_questions_raised only)
  catches passive-approval ghosting but not diff-mutation ghosting. The deferred fields
  (checker_modified_diff and checker_approval_after_changes) require deeper pipeline
  instrumentation and are tracked as a follow-on task.

## Related

- GOVERNANCE.md (Maker, checker, merger): defines the contract.
- ADR-022 enforces it observationally.
- Control Panel (Milestone 3): visualizes checker engagement.
