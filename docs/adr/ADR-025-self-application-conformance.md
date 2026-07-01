# ADR-025: Self-Application Conformance

**Status:** Accepted  
**Date:** 2026-06-25  
**Milestone:** 6 (Self-governance hardening)

## Context

Modonome asks users to trust that it will manage their code autonomously, following
deterministic governance rules, independent validation, and bounded risk.

But does Modonome practice what it preaches? Does it govern its own evolution under the
same rules it asks a host repo to adopt?

Today, the answer is partial. The Modonome repo uses branch protection, CODEOWNERS, CI,
and Tier gates (per DECISIONS.md). But there is no published evidence that the engine
loop actually runs autonomously on the Modonome repo itself, or that the engine's
decisions conform to the governance rules it defines.

This is a trust asymmetry: users are asked to adopt Modonome's guarantees sight unseen,
without evidence that Modonome itself meets them.

## Decision

1. **Modonome runs its own loop** under the same activation ladder as a host repo:
   - Disabled in dev/WIP
   - Dry-run by default in CI
   - Shadow mode in a scheduled job (daily or weekly). This rung assumes WI-011
     (ADR-002) has shipped; until then, treat it as a planned step, not a current one
   - Armed mode on this repo *only after* Milestone 6 ships and the team is confident
   - Armed mode is optional and owner-gated, but if offered, Modonome must use it

2. **Publish the governed-mode transcript** as release evidence:
   - For each release, capture the engine's decisions, metrics, and outcomes
   - Publish in `RELEASE-EVIDENCE.md` or a similar file that lives in the repo
   - The continuously-regenerated `RELEASE-EVIDENCE.md` is built only from
     committed repo state by `scripts/build-release-evidence.mjs`, so it stays
     reproducible and cannot drift. It includes:
     - Autonomy posture (armed vs dry-run, from config)
     - Gates passed and failed
     - AgentProof score and honest level
     - Work queue state counts
     - Learnings captured and promoted
   - Point-in-time release transcripts add the volatile, per-run detail that does
     not belong in a reproducible file:
     - Dry-run sweep (what work was proposed, why), from `.modonome/runs/*.json`
     - Work items completed (with maker, checker, verification), once armed
     - Cost and token usage (if relevant)
     - Any ratchet violations or rejections
   - This transcript is human-readable and machine-auditable

3. **Metrics dashboard for the Modonome repo:**
   - Once the control panel (Milestone 3) ships, Modonome publishes a public dashboard
     showing:
     - Queue depth and work item velocity
     - Maker and checker engagement patterns
     - Gate pass/fail trends
     - Learning promotion history
     - Decision queue status
   - This dashboard is updated after every run.

4. **Escapes and failures are visible:**
   - If the engine makes a mistake (wrong tier classification, over-confident decision),
     it is documented in the `LEARNINGS.md` file, reviewed, and a gate is added.
   - Mistakes are not hidden; they're evidence that the learning loop is working.

## Consequences

- Users can inspect Modonome's own governance and see the same patterns they're adopting.
- The engine's actual behavior is auditable, beyond the rules it claims to follow.
- The tool cannot hide failures; they become learning opportunities and evidence.
- Dogfooding becomes a release requirement: if the tool doesn't work for itself, it
  doesn't ship.
- The transcript and metrics serve as a tutorial for users: "Here's how Modonome works,
  and here's what its own engine produced."

## Related

- GOVERNANCE.md: the rules Modonome asks users to adopt.
- ADR-025 ensures Modonome follows those rules visibly.
- Milestone 3 (Control Panel): visualizes self-application.
- ADR-002 (Shadow Mode): removed shadow-mode references from user-facing docs pending
  implementation and filed the feature as WI-011 for v0.2. This ADR's activation ladder
  uses the same term for the same unimplemented feature; it is a target state for
  Modonome's own repo, not a claim that shadow mode exists today.
