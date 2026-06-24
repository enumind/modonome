# ADR-001: Self-Governance Pipeline

**Status:** Accepted
**Date:** 2026-06-24

## Context

The project defines governed autonomy for external repos and ships its own scaffolded
`.modonome/` directory. Using the engine on the project's own development is the
highest-fidelity proof of viability: every gap found during pre-launch review becomes
a work item processed by the same governance the tool provides to adopters.

The open question from `.modonome/DECISIONS.md` asked which surfaces should be in
scope for autonomous work before an owner arms the engine. This ADR answers that.

## Decision

Adopt a two-tier model for the project's own development:

**Tier 1 (autonomous, distinct maker/checker required):**
- `docs/` (including this ADR directory)
- `examples/`
- `tests/` and `fixtures/`
- Top-level markdown files (README.md, QUICKSTART.md, ADOPTION-GUIDE.md, etc.)

**Tier 2 (owner-reviewed, CODEOWNERS gate required before merge):**
- `scripts/`, `bin/` (execution surface)
- `schemas/`, `templates/` (normative contracts)
- `prompts/` (engine instructions)
- `.github/` (CI, branch protection, CODEOWNERS itself)
- `.modonome/config.yaml` (arming levers)

Work items are filed as JSON files in `.modonome/work-items/` following the
work-item schema. The ratchet runs on every PR, including PRs that the engine opens
on itself. Tier 2 items are queued with `touches_protected_path: true` and require
escalation before reaching `merge_ready`.

## Consequences

- The project dogfoods its own governance mechanism continuously.
- The work-items queue is the canonical backlog: visible, traceable, governed.
- Tier 2 items still require a human CODEOWNER approval but the queue makes them
  explicit rather than left as informal notes.
- Self-referential risk (engine weakening its own ratchet) is mitigated by the
  CODEOWNERS gate on `scripts/` and by the ratchet running in CI on every PR.
