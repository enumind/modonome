# ADR-045: Scope focus for launch. Proof before surface.

**Status:** Accepted
**Date:** 2026-07-08
**Partially superseded:** [ADR-046-ship-the-deferred-features.md](ADR-046-ship-the-deferred-features.md)
reverses the deferral of adapter-verify, Break the Ratchet, and CheckerProof (point 5 below) on
direct owner instruction, while holding every safety and scope constraint this ADR attached to
them. The AST-tier cut, the false-positive-only ratchet constraint, and the advisory-only
cross-file signal (points 2-4) are unaffected and still stand.

## Context

A five-lens external review (technical robustness, growth, documentation architecture,
skeptical-adopter red team, maintainer sustainability) examined the project ahead of wider
launch. The convergent finding: the enforcement core and its evidence are the product; every
additional surface a bus-factor-one project ships before launch is a standing obligation
that reads to a skeptic as ceremony. The review ranked work by impact-per-effort and drew a
hard line between launch-blocking work and demand-driven work.

## Decision

1. **Ship proof, not new surface, before launch.** The launch set is: reconciled claims,
   committed deterministic gate-rejection evidence on the demo app, the Gauntlet as the
   self-scoring wedge, a README that answers "how does this compare" in one screen, and the
   two constrained ratchet improvements below.
2. **No AST analysis tier.** Vendoring a parser (acorn or the TypeScript compiler)
   contradicts the zero-runtime-dependency guarantee, which is a headline, verifiable
   property of the gate. The check stays a deterministic line-based diff analyzer, and its
   limits stay documented in the README's "what it catches, and what it cannot" section.
   The semantic gap is owned by the independent checker role, not promised away.
3. **Ratchet improvements are constrained to be false-positive-only.** String/comment
   stripping may only apply where the span opens and closes on the same diff line, and a
   change may never cause a gaming fixture that blocks today to pass. A missed attack is
   worse than a benign false positive. Any decision change re-baselines both AgentProof and
   the Gauntlet, because the Gauntlet uses the ratchet as its oracle.
4. **The repo-level assertion-delta signal is advisory.** It runs alongside, never instead
   of, the per-file check; summed counts are gameable by padding and false-positive on
   refactors, so the per-file check remains the enforcement path.
5. ~~Deferred until demand exists (post-launch, owner decision)~~ **Superseded by
   [ADR-046](ADR-046-ship-the-deferred-features.md):** direct owner instruction reversed this
   deferral. The Break-the-Ratchet challenge harness, the CheckerProof benchmark, and the
   adapter conformance verifier all shipped, each holding exactly the constraint this point
   originally specified (the judge never executes a submission; CheckerProof skips rather than
   fabricates a score and stays advisory; the adapter verifier degrades gracefully when a binary
   is absent). Only the second host-adoption example remains deferred.
6. **Research stays labeled research.** The cross-repo knowledge network design moved to
   `docs/research/`, joining the governance-mesh series. Standards-body language in
   AgentProof is reframed from submission-in-progress to aspiration contingent on adoption.

## Implementation note (added after execution)

Building the constrained fixtures for point 3 surfaced a real, unrelated false
negative: the assertion patterns recognized only bare `assert(...)` and Jest-style
`expect(...)` calls, not Node's built-in `assert` module's member-call style
(`assert.equal`, `assert.match`, `assert.rejects`, and so on), which is the dominant
style in this project's own test suite. This is a strict, no-new-false-positive
coverage extension of the same kind already accepted for C#'s `Assert.Method(...)`
pattern, so it was folded into this same change rather than deferred: it makes the
per-file removal check (and the assertion-strength-downgrade check) correctly see a
style the ratchet was already supposed to cover. The demo app's committed evidence
run reflects the corrected count (two removed assertions, not one, once
`assert.match` is recognized alongside the bare `assert(...)` call).

## Consequences

- The zero-dependency claim stays true and checkable, and the honest-limits framing stays
  coherent: deterministic structural enforcement plus a measured, structurally separate
  checker, with no implied semantic guarantee.
- Deferred surfaces have a recorded rationale, so a future contributor can pick one up as a
  scoped, demand-backed piece of work instead of re-litigating scope.
- The maintainer carries no new standing obligations (triage SLAs, recurring paid model
  runs, adapter support) into launch week.
