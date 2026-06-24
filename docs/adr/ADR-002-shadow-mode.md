# ADR-002: Shadow Mode

**Status:** Accepted
**Date:** 2026-06-24

## Context

"Shadow mode" is referenced in README.md, GOVERNED-AUTONOMY-SPEC.md, and
ADOPTION-GUIDE.md as a mode where the engine runs alongside CI but never proposes
changes: it only logs what it would have done. Zero implementation exists. References
that imply the feature is available create a gap that undermines trust in the spec.

Pre-launch review found this gap in three of seven independent technical audits.

## Options Considered

**A. Implement shadow mode now.**
The engine reads CI context and writes a structured JSON log of what it would have
proposed, with no branch or PR created. Honest "show your work" mode for skeptical
adopters. Requires changes to `scripts/dry-run-sweep.mjs` (Tier 2, owner-reviewed).

**B. Remove all references to shadow mode until it is implemented.**
One commit removes the references from README.md, GOVERNED-AUTONOMY-SPEC.md,
ADOPTION-GUIDE.md, and SECURITY.md (which mentions "shadow modes prefer read-only
tokens"). Docs become accurate at the cost of a missing feature.

**C. Keep references as a forward-looking roadmap item with an explicit "planned" label.**
Honest but risks being overlooked; experience shows "planned" features in docs are read
as available until explicitly contradicted.

## Decision

Option B now. Option A in v0.2.

Remove all shadow mode references from current docs. File WI-003 to execute the
removal (Tier 1, docs-only). File WI-011 to implement shadow mode in v0.2 (Tier 2,
requires owner-reviewed changes to scripts/).

## Consequences

- Docs become accurate for v0.1-alpha.
- Shadow mode implementation is tracked as an explicit roadmap item (WI-011) rather
  than an implicit promise in the text.
- Adopters who find "shadow mode" in git history and ask about it have a clear answer:
  filed as WI-011, targeted for v0.2.
