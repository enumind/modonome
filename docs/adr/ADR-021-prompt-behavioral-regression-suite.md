# ADR-021: Prompt Behavioral Regression Suite

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 6 (Self-governance hardening)

## Context

ADR-012 ensures the prompt is read from the base branch in CI, and `check-drift.mjs` ensures
the committed bundle matches the regenerated bundle. These gates catch *textual* drift.

But the prompt can be rewritten to be equivalent in text while changing its behavior. For
example, reordering role responsibilities, changing the order of gate checks, or adjusting
a tie-breaking heuristic all pass textual validation yet change the engine's decisions.

There is no gate today that verifies the prompt still makes the *same decisions* on a set of
canonical scenarios. Without this, behavioral drift is silent.

## Decision

1. **Frozen test fixtures** define canonical scenarios:
   - Tier classification (e.g., "auth module change" → Tier 3)
   - Arming refusal (e.g., "untrusted PR" → no autonomous action)
   - Untrusted-input handling (e.g., "malformed issue comment" → rejected)
   - Checker engagement (e.g., "identical maker and checker model" → no merge)
   - Lease expiry (e.g., "packet leased 2 hours ago, max lease 60 min" → revoke)

2. **Implement `test-prompt-behavior.mjs`** as a CI gate that:
   - Loads the prompt from the base branch
   - Applies it to each frozen fixture
   - Captures the engine's decision (Tier, arming refusal reason, etc.)
   - Compares against the golden output pinned in the fixture
   - Fails if any decision differs
   - Runs on every `prompts/` change

3. **Fixtures are version-controlled** in `tests/fixtures/prompt-behavior/` with the expected
   output pinned. When a behavioral change is intentional, the fixture output is updated as
   part of the ADR and PR that justifies the change.

4. **Coverage target:** Fixtures cover all major decision branches and at least one example
   per role, per tier, and per failure mode (untrusted input, lease expiry, schema mismatch).

## Consequences

- Prompt changes are validated against behavior, not just textual consistency.
- Behavioral drift becomes visible immediately, not discovered months later in audit.
- The test suite is the documentation of what the prompt *actually does* vs. what it claims.
- Intentional behavioral changes are explicit and ADR-gated.

## Related

- ADR-012 (Harness Prompt Integrity): ensures the prompt loaded is the intended one.
- ADR-020 (Prompt Complexity Budget): ensures the prompt stays small enough to review.
