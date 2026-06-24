# ADR-003: AgentProof Portability

**Status:** Accepted
**Date:** 2026-06-24

## Context

AgentProof is defined, implemented, and tested entirely within this repository. The
spec (`agentproof/SPEC.md`) claims that any governed-autonomy framework can implement
conformance independently, but the runner (`agentproof/runner.mjs`) hardcodes
modonome's own script paths and fixture locations. No third party has independently
executed the suite.

Two additional correctness issues surfaced in pre-launch review:

1. `agentproof/runner.mjs:3` says "Executes all 10 governance scenarios" but runs 16.
2. `agentproof/runner.mjs:98-99` prints "This implementation meets AgentProof Level 3
   requirements." The term "Level 3" is defined in GOVERNED-AUTONOMY-SPEC.md section 12
   but is absent from `agentproof/README.md`, which uses UNGOVERNED/PARTIAL/GOVERNED.
   A reader of both documents sees a contradiction.
3. The PARTIAL threshold in `runner.mjs:99` is set at >= 8 scenarios passing, but
   `agentproof/SPEC.md` defines PARTIAL as 12-15. An external implementation scoring
   8/16 would be labeled PARTIAL by the runner but UNGOVERNED by the spec.

## Decision

1. Fix the stale comment at `runner.mjs:3` to say 16 scenarios. (WI-004)
2. Align the PARTIAL threshold in `runner.mjs` with the spec (12, not 8). (WI-004)
3. Remove "Level 3" language from runner output; replace with the
   UNGOVERNED/PARTIAL/GOVERNED taxonomy already defined in `agentproof/README.md`. (WI-004)
4. Create `agentproof/CONFORMANCE-INTERFACE.md` that defines a runner protocol (stdin/stdout,
   fixture format, exit codes) so third-party implementations can independently claim
   conformance without forking the runner. (WI-012, future)

The score modonome reports (16/16 GOVERNED) remains valid as the reference
implementation result. The claim becomes honest once the language aligns with the
defined taxonomy.

## Consequences

- The conformance terminology is internally consistent.
- The path to third-party independent verification is documented.
- The benchmark remains self-certified until a third-party implementation runs it,
  which is an honest characterization of the current state.
