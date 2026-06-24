# ADR-006: Checker Independence

**Status:** Accepted
**Date:** 2026-06-24

## Context

The maker/checker split is a core safety property: the agent that produces a diff must
not be the same agent pass that approves it. Without a structural definition of
"independence," this degrades to a single-pass review and the property becomes
a convention rather than an enforceable rule.

## Decision

The checker is defined as a distinct reasoning pass with the following constraints:

1. **Separate invocation.** The checker runs as a new context, not a continuation of the
   maker's context. It receives the diff and rationale but not the maker's internal
   reasoning chain.
2. **Adversarial posture.** The checker prompt instructs the checker to look for reasons
   to reject, not reasons to approve. Default verdict is `needs_rework` unless evidence
   of correctness is explicit.
3. **Rework cap.** The maker/checker cycle is bounded by `max_rework_cycles` in config
   (default: 3). Exceeding the cap marks the work item `failed` and surfaces it for owner
   triage rather than looping indefinitely.
4. **Gate ownership.** The checker owns the gate invocations: it runs the gates listed in
   the work item and attaches pass/fail evidence to its verdict. The maker does not run
   gates on its own output.

## Consequences

- A work item that fails checker review after the rework cap is treated as a
  quality failure, not a configuration error. The owner decides whether to raise the cap,
  simplify the item, or close it.
- Harnesses that run maker and checker in the same session must still implement a
  context boundary (new top-level tool call or a new agent invocation).
- The checker independence property is testable: the AgentProof benchmark includes
  scenarios where the maker embeds approval signals; the checker must reject them.
