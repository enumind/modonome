# ADR-022: Anti-Rubber-Stamp Checker Telemetry

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 6 (Self-governance hardening)

## Context

The maker-checker-merger contract (GOVERNANCE.md) requires:
- A maker that creates the diff
- A checker that did not create the diff
- A distinct merge authority

The checker's role is to run deterministic gates first, then review the diff and the
rationale. A "persuasive rationale is evidence, not a verdict" — the checker must actively
engage, not passively approve.

Today, there is no metric for checker engagement. A checker that approves every run with no
changes, no questions, and no findings is indistinguishable from an active checker. If the
checker role is played by an agent with low capability or misconfigured confidence, it can
rubber-stamp changes silently.

This is the "checker gaming" risk: the contract *says* the checker is independent, but
without telemetry, gaming is invisible until a problem surfaces in production.

## Decision

1. **Capture checker metrics** in the run transcript and in `.modonome/metrics.jsonl`:
   - `checker_requested_changes`: boolean, true if checker requested changes before approval
   - `checker_modified_diff`: boolean, true if checker's changes changed the final diff
   - `checker_questions_raised`: count of distinct findings or concerns
   - `checker_approval_after_changes`: latency from maker's diff to checker's "approved"

2. **Ratchet for checker ghosting:** In `guard-ratchet.mjs`, add a check:
   - If the same checker approves 10+ consecutive runs with `checker_requested_changes` = false
     and `checker_questions_raised` = 0, fail the next PR with a warning:
     "Checker has approved N consecutive runs with no engagement. Reset by asking for changes
     on the next run, or escalate to a different checker."
   - This prevents silent rubber-stamping without breaking the model (it's a warning, not a
     block, and it can be reset by actual engagement).

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

## Related

- GOVERNANCE.md (Maker, checker, merger): defines the contract.
- ADR-022 enforces it observationally.
- Control Panel (Milestone 3): visualizes checker engagement.
