# ADR-026: Learning Promotion Audit Trail

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 6 (Self-governance hardening)

## Context

The learning pipeline (ARCHITECTURE.md) is:
1. Correction signal (gate failure, review fix, rework)
2. Follower captures a generalized lesson
3. Stage in `LEARNINGS.md` (capped at 20, dated, fingerprinted)
4. Owner promotes into rules, config, or tests
5. A deterministic gate is added

This pipeline is good: it bounds learnings, stages them, and requires owner approval.
But "promotion" today is a human edit to `LEARNINGS.md`, moving an entry from "staged"
to a deterministic gate in code (a test, a schema constraint, etc.).

There is no audit trail connecting the promoted learning back to:
- The correction signal that triggered it
- The evidence that the signal was real
- The gate that was added to prevent recurrence

This means the rule set can accumulate entries over time, and an auditor cannot easily
trace back and ask: "Why do we have this rule? What problem did it solve? Is it still
relevant?"

Silent rule accumulation is a risk: rules can become cargo-cult (followed because they're
there, not because anyone remembers why).

## Decision

1. **Learning records include traceability fields:**
   - Every promoted learning must include:
     - `correction_signal_id`: link to the PR, issue, or decision that exposed the problem
     - `observation_date`: when the correction signal was first captured
     - `promotion_date`: when the owner promoted it
     - `evidence_summary`: a one-line description of the evidence (e.g., "5 consecutive
       failures in the same scenario")
     - `gate_added`: the deterministic gate, test, or schema constraint added
     - `gate_location`: file path and line number

2. **Deprecation path:**
   - Every rule in the rule set (GOVERNANCE.md, schemas/config-schema.json, prompt
     decisions, test fixtures) should link back to its originating learning.
   - If a learning is no longer relevant, it is marked as deprecated, but not deleted.
     The deprecation links to the decision that made it obsolete.
   - This leaves a complete history.

3. **Audit command:** A script `scripts/audit-learnings.mjs` traces backwards:
   - Takes a rule or gate name as input
   - Finds the learning that produced it
   - Traces the learning back to its correction signal
   - Outputs a human-readable chain: signal → observation → learning → gate
   - Can be run locally or in CI to verify all rules are traced.

4. **Learning hygiene CI gate:**
   - On every `LEARNINGS.md` promotion, `check-learning-traceability.mjs` verifies:
     - All required fields are present and non-empty
     - The correction signal ID is a valid PR/issue in the repo
     - The gate added exists and matches the learning's intent
     - The learning was staged for at least N days before promotion
   - Fail if any check fails.

## Consequences

- Rules are not cargo-cult; they're traceable back to evidence.
- Auditors can understand the evolution of the rule set over time.
- Deprecated rules are visible and can be cleaned up or formally removed.
- The learning pipeline has an explicit feedback loop: the gate must exist and must
  relate to the learning.
- Over time, the rule set becomes a documented history of problems and solutions,
  not a mysterious set of constraints.

## Related

- ARCHITECTURE.md (Learning and Self-improvement Pipeline): ADR-026 operationalizes traceability.
- ADR-022 (Anti-Rubber-Stamp Checker Telemetry): feeds signals into the learning queue.
- ADR-021 (Prompt Behavioral Regression Suite): the prompt is a collection of gates that
  should all trace to learnings or intentional design.
