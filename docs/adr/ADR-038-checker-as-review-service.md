# ADR-038: Checker as an Author-Agnostic Review Service

**Status:** Accepted  
**Date:** 2026-07-04  
**Milestone:** 6 (Self-governance hardening)  
**Builds on:** ADR-004 (arming isolation), ADR-006 (checker independence), ADR-022 (anti-rubber-stamp checker telemetry), ADR-024 (capability promotion gate)

## Context

Modonome's maker/checker loop is a closed pair: `scripts/agent/run-cycle.mjs` runs a maker,
then a structurally independent checker over that maker's output, with
`CORE_ROLE_SEQUENCE = ["maker", "checker"]`. The checker is coupled to a maker in the same
cycle. Its prompt (`prompts/roles/checker.txt`) even mutates the work item, pushes to the run
branch, and sets state, so it only makes sense as the second half of an internal cycle.

But a change to a governed repository can come from three producers, not one: the internal
loop, a human in an editor, and a coding-agent session (for example Claude Code). Only the
first is reviewed by the agentic checker. The other two are reviewed only at the merge gate.

Two facts clarify what is actually true here:

1. **The deterministic checker already wraps every change.** `.github/workflows/ci.yml` runs
   the full `npm run verify` suite (the anti-gaming ratchet, AgentProof, drift, work-item
   validation) on every `pull_request` to `main`, regardless of who authored the change. So
   the framework is not bypassed for the part with teeth. What is missing is the **agentic**
   checker, the adversarial review of intent and correctness that deterministic rules cannot
   express.
2. **The trust boundary was never the internal loop.** It is the merge gate: branch
   protection plus CODEOWNERS review plus the required checks on `main`. Every producer (the
   loop, a human, an agent session) is a maker from that boundary's point of view. None can
   merge without the checker of record. Arming is the single, deliberate act of granting one
   specific producer (the loop) bounded permission to bypass the human reviewer at that gate.

Framed that way, keeping the agentic checker private to the internal loop is an accident of
implementation, not a design requirement. The checker is a function that adversarially
reviews a diff; nothing about it needs the diff to have come from modonome's own maker.

## Decision

1. **Adopt the producers-and-merge-gate model as the stated trust model.** The merge gate is
   the boundary. The internal loop, a human, and an agent session are interchangeable
   producers that all pass through it. Arming grants one producer bounded merge authority; it
   never changes the boundary itself. This supersedes any reading in which the internal loop
   is the safety.

2. **Decouple the checker into an author-agnostic, review-only service.** A change can be
   reviewed by modonome's checker whoever produced it. The checker resolves the `checker` role
   from config (its own model, distinct family per ADR-006) and reviews an arbitrary diff, with
   no maker step and no work-item, branch, or state mutation.

3. **Attach that service to the merge gate via a `pull_request` workflow.** The autonomous
   maker becomes one client of a general capability: every change to the repository, whoever
   made it, gets an independent adversarial review before it can merge.

4. **Advisory until armed.** In unarmed or dry-run mode the review posts findings; a human
   still merges. The checker's approval can only substitute for a human reviewer under arming,
   bounded by the existing caps and with a human still required on protected paths. The service
   feeds the merge gate; it never replaces it.

### Constraints, designed in rather than bolted on

- **Prompt injection.** An agentic checker reading an untrusted, human- or agent-authored diff
  and PR body is a new attack surface the deterministic ratchet does not have (AP-15 hardens
  the ratchet against diff-borne injection). The review prompt treats the diff and its embedded
  text as untrusted data to review, never as instructions, and asks only for a structured
  verdict.
- **Cost is local-first.** The checker runs on a local or free model by default (the
  `openai-http` provider path, ADR on provider cost class), so adversarial review on every PR
  is zero marginal cost. A paid frontier checker is an opt-in escalation for high-risk diffs.
- **Model independence via provenance.** ADR-006 requires the checker be a distinct model
  family from the maker. A human author has no model, so any checker is trivially independent;
  an agent-authored change should declare which model produced it so the checker picks a
  distinct family. The `maker_model` and `checker_model` work-item fields already carry this.
- **Anti-rubber-stamp.** The checker-engagement telemetry from ADR-022 (WI-034,
  `check-checker-engagement.mjs`) applies unchanged, so a lazy review over a human PR is caught
  the same way it is over a maker PR.

## Consequences

Positive:

- Every change is independently reviewed before merge regardless of origin, so a human or a
  Claude Code session becomes a governed participant rather than an ungoverned exception.
- The product framing strengthens: not "an autonomous bot you might not trust" but "every
  change to your repo gets an independent adversarial review before it can merge, on a free
  local model, and you can progressively let that review earn bounded merge authority."
- The trust story becomes one invariant (nothing reaches `main` except through the checker),
  which is simpler to reason about and to audit than a per-channel story.

Negative and risks:

- The agentic checker adds a prompt-injection surface and a per-PR cost that the deterministic
  gate does not have. Both are mitigated above but not eliminated, and the mitigations must
  hold as the prompt evolves.
- A checker that can gate human work, once armed, is a larger trust step than a checker gating
  the loop's own work; it stays behind arming, caps, and a human on protected paths.

## Implementation status

A spike ships with this ADR and is deliberately inert by default:

- `scripts/agent/review-diff.mjs`: `planReview` (pure, resolves the checker, enforces
  independence, builds the injection-hardened review prompt) and `reviewDiff` (performs the
  model call only under `--execute` against a configured local or gateway endpoint). Without
  `--execute` it is a dry-run that reports which model would review, the independence check, and
  the prompt, with no model call and no secrets.
- `.github/workflows/modonome-review.yml`: runs the dry-run review on every `pull_request` and
  writes it to the job summary, with `contents: read` only and no secrets, so the branch's own
  pull request visibly gets checked without any live model or write scope.
- `tests/review-diff.test.mjs`: covers the pure review-planning logic.

Follow-up work, each a separate change under its own gates:

1. Live review: call the checker on a configured local or free model and post the verdict as a
   PR review, which needs a write-scoped token and the prompt-injection hardening exercised
   against an adversarial corpus.
2. Promote the inline review prompt to a governed `prompts/roles/review.txt` under the prompt
   complexity budget (ADR-020).
3. Arming integration: let the review verdict count toward auto-merge only under the existing
   arming and cap gates, with a human still required on protected paths.
