# ADR-035: Metadata-only Commit-History Remediator

**Status:** Accepted  
**Date:** 2026-07-02  
**Milestone:** 6 (Self-governance hardening)  
**Builds on:** ADR-004 (arming isolation), ADR-024 (capability promotion gate)

## Context

Governed Remediation's Phase 0 and Phase 1 built the deterministic detection kernel:
branch, commit-identity, and text detectors that find AI-participation signatures, plus
the `modonome hygiene` CLI that reports them. Detection is deliberately read-only. For the
branch remedy, `hygiene fix` applies a safe local rename, because a rename changes no file
and so cannot lose work. For the two history remedies, though, `hygiene` only prints the
git commands: stripping an attribution trailer from a commit message, and re-authoring a
commit whose author or committer is an agent or vendor identity. Its own docstring defers
those to "the armed, gated remediator (later phase)."

The reason for the deferral is blast radius. Rewriting commit messages or identities
rewrites history: every affected commit gets a new SHA, and a careless rewrite could change
file content, drop commits, or touch published history that others have already pulled. An
autonomy engine that can rewrite history unsupervised is exactly the kind of high-authority
capability ADR-024 says must ship off, earn evidence, and be promoted by an owner.

We need the apply step to exist so remediation is a closed loop, while making it provably
safe and impossible to trigger without an owner arming it.

## Decision

Introduce a metadata-only remediator in two pure halves:

1. A tokenless **proposal** step (`scripts/remediate.mjs plan`, backed by the pure planner
   `scripts/lib/remediate.mjs`). It reuses the strict detectors to decide, per commit, the
   metadata rewrite required, and prints a deterministic fingerprint of that plan. It runs
   with no model and no network, reads only, and always succeeds on a clean repository.

2. A gated **applier** (`scripts/remediate.mjs apply`). It replays the branch-unique commit
   range with `git commit-tree`, reusing each commit's original tree object, sets the target
   identity and cleaned message, and moves the branch reference to the rewritten tip.

The applier is **metadata-only and provably so**. Because each replayed commit is created
from the original tree object, every rewritten commit points at the same tree it always did.
The run records each commit's tree SHA, re-derives it after the rewrite, and aborts with a
hard reset if any tree SHA moved or if the top tree changed. In the repo's own snapshot
vocabulary, the Merkle root over file content is invariant across the rewrite.

The applier is **deterministic and re-runnable**: the same input tree, identity, dates, and
message produce the same commit SHA, so an approved proposal applies the same way twice, and
a second run over already-clean history is a no-op (idempotent). It **never touches published
history**: the range is `origin/main..HEAD`, and it refuses on the default branch, on a
working tree with tracked modifications, on a merge inside the range, and when `origin/main`
is absent (the protected-history boundary is then unprovable). Content redactions (pull
request bodies, tracked files) are out of scope: they are remote or working-tree edits, not
local history metadata, and stay with the detection surfaces and a human.

## Arming and capability gating

Apply is inert unless the engine is armed for this specific capability. Following ADR-004, a
config file the agent can write can never arm the engine on its own, so apply requires the
authoritative `MODONOME_ARMED=true` in the environment in addition to config opt-in. Following
ADR-024, a new capability flag `remediation_apply_enabled` ships default-off, so even a fully
armed engine will not rewrite history until an owner turns this one capability on. The full
predicate is `autonomy_enabled` and not `dry_run` and `remediation_apply_enabled` in config,
AND `MODONOME_ARMED=true` in the environment. `check-promotion-readiness.mjs` tracks the flag,
so it can never reach default-on in a shipped config without a promotion ADR carrying evidence.

A second, structural guardrail: the determinism boundary in `check-gate-dag.mjs` proves no
strict detector can reach the applier through its import graph. Detection depends on nothing
that mutates, so the detection kernel stays a pure, side-effect-free, base-pinnable trust
root; the applier depends on the detectors, never the reverse.

## Path to promotion (default-off today)

This ADR introduces the capability off by default. It does not promote it. Promotion to
default-on is a separate, later owner decision that must meet ADR-024's bar: a promotion ADR
that records an observation window, the evidence gathered during it (false-rewrite rate,
operator feedback), the escape hatch for disabling the capability, and any open questions. The
undo path is already concrete at the tool level: every apply prints the prior head SHA and the
`git reset --hard` that restores it, and the rewrite is confined to unpublished commits.

## Consequences

- Governed Remediation is a closed loop: the history remedies Phase 1 could only print can now
  be applied, but only by an armed, owner-gated, capability-flagged run.
- The metadata-only property is machine-verified on every apply, so a rewrite can never quietly
  change file content.
- The capability adds no npm dependency and no network path; it is git plumbing plus the
  existing pure detectors.
- A future owner can promote the capability with confidence, because the safety properties are
  proven by construction and by the run's own checks, not asserted.

## Related

- ADR-004 (Arming isolation enforcement): the authoritative environment arming gate reused here.
- ADR-024 (Capability promotion gate): the default-off-until-evidence model this flag follows.
- ADR-026 (Learning promotion audit trail): the sibling human-only promotion path for learnings.
- ADR-033 (Repo snapshot): the Merkle-over-content model that frames the tree-SHA invariant.
