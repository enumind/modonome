# ADR-046: Ship adapter-verify, Break the Ratchet, and CheckerProof

**Status:** Accepted
**Date:** 2026-07-08
**Supersedes:** the deferral sections of ADR-045-scope-focus.md for these three items only.

## Context

ADR-045 deferred three features identified by an earlier panel review as the project's most
differentiated, reach-driving ideas: an automated adapter conformance verifier, a public
"Break the Ratchet" adversarial challenge, and CheckerProof (a measured benchmark for
independent-checker efficacy). The stated rationale was sustainability: each looked like a
standing maintenance obligation (a triage queue, recurring paid model calls, support load for a
kit nobody had asked for yet) disproportionate to a bus-factor-constrained project pre-launch.

Direct owner instruction reversed that judgment: build all three now, as real, shipped, tested
features, not deferred documentation. This ADR records what changed and, more importantly, what
did **not** change: every safety and scope constraint ADR-045 attached to these features if they
were ever built stayed exactly as specified. Building them now did not relax any of it.

## Decision

Ship all three, holding every constraint ADR-045 already set:

1. **adapter-verify** (`scripts/adapter-verify.mjs`). Two tiers exactly as specified: static
   (schema, license, boundary, always runs) and live (spawns the real binary through the actual
   `runToolLoopAdapter` code path, skips cleanly when the binary is absent, never fails hard on
   absence). Ships with a real, working reference adapter
   (`fixtures/adapters/reference-adapter.mjs`) so the verifier's own logic is provable without
   needing any external binary installed, and a `--self-test` mode that exercises it end to end.
2. **Break the Ratchet** (`BREAK-THE-RATCHET.md`, `challenge/judge.mjs`). The non-negotiable
   constraint from the original technical review: submissions are never executed. The judge reads
   a submitted `.patch` as plain text and hands it to the ratchet's own `--diff` mode, itself a
   pure text analyzer with no `git apply` and no code-execution path. The hall of fame ships
   seeded with one real, honest entry (the ratchet's own documented expected-value-drift
   limitation) rather than an empty table implying no one has looked.
3. **CheckerProof** (`checkerproof/`). Requires live model access, has no deterministic fallback,
   and is advisory only: it always exits 0, and every scenario that cannot reach a model reports
   `SKIPPED`, never a fabricated score. The first evidence file is a real, live run against this
   repo's actual configured checker (`claude-opus-4-8`), not a hand-written or simulated result,
   committed alongside the code that produced it.

## What this does not change

- The zero-runtime-dependency guarantee (ADR-032) is untouched; nothing here adds a dependency.
- `npm run verify`'s "no network or secrets" guarantee is untouched: `checkerproof` is a separate
  script, deliberately not added to the `verify` chain.
- The ratchet's false-positive-only hardening constraint from ADR-045 (point 3) is untouched;
  nothing in this ADR touches `guard-ratchet.mjs`'s detection logic.
- The AST-tier cut (ADR-045 point 2) stands. None of these three features require or add one.

## What remains genuinely deferred

The sustainability concerns ADR-045 raised were real, even though the build-vs-defer call
reversed. Specifically still open, tracked in `OWNER-ACTIONS.md`:

- **Triage capacity for Break the Ratchet submissions and adapter-verify PRs.** Shipping the
  mechanism does not by itself solve who reviews a `candidate-break` verdict or a new adapter
  registration. `SUPPORT.md`'s no-SLA framing applies to both.
- **A recurring CheckerProof cadence.** One committed run is a baseline, not a trend. Re-running
  it periodically, and deciding what a declining catch rate should trigger (a rubric change, a
  model change, an issue), is an owner decision, not something this ADR sets policy for.
- **A second real adapter.** `adapter-verify --self-test` proves the verifier's logic; it does
  not prove the verifier is useful against a second, independently-authored adapter, since only
  `opencode` is registered. Filed as a good-first-issue.

## Consequences

The project now has three working, tested, in some cases live-evidenced features that directly
answer "why would this go viral or be revered" rather than three paragraphs promising them later.
The honest-limits culture this project runs on required each one to ship with its safety
constraint intact rather than relaxed for speed: a challenge that could execute arbitrary
submitted code, or a benchmark that could silently report a fake score, would have been a worse
outcome than not shipping at all.
