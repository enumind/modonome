# Modonome decisions

Every decision defaults to hold when unanswered.

## Resolved

- id: self-maintenance-scope
  question: Which surfaces should Modonome maintain on its own repo autonomously?
  decision: Tier 1 (docs, examples, tests, fixtures) autonomous. Tier 2 (scripts, schemas,
    prompts, templates, .github) owner-reviewed. See docs/adr/ADR-001.
  resolved: 2026-06-24

- id: shadow-mode-implementation-timing
  question: Implement shadow mode in v0.2 or keep as a later milestone?
  decision: v0.2. Implement --shadow flag on dry-run-sweep as a queued work item.
  resolved: 2026-06-24

- id: agentproof-conformance-interface
  question: Publish a standalone conformance interface spec for third-party runners?
  decision: Yes. Publish agentproof/CONFORMANCE-INTERFACE.md as a community-evolving
    standard with an open stdio runner protocol. See ADR-003 and WI-012.
  resolved: 2026-06-24

## Open

- id: dry-run-git-integration
  question: Should dry-run read git history for repo-specific proposals (WI-015)?
  options:
    - shallow-git: Run 'git log --oneline -20' and find most-changed files with no test neighbors.
    - static-only: Keep static proposals; improve specificity through better stack heuristics only.
  recommendation: shallow-git. This is the "Vagrant moment" for the tool; generic proposals
    do not differentiate modonome from a documentation page.
  default_on_timeout: hold

## Administrative Maintenance Exception
- **Date:** 2026-06-29
- **Scope:** Complete infrastructure manifest realignment and historical squashing.
- **Justification:** Permanently severing Claude agent tracking profiles and optimizing package publication pipelines.
- **Status:** APPROVED BY OWNER

## Administrative Hardening Exception
- **Date:** 2026-06-29
- **Scope:** Hardening level indicator integration in build-release-evidence.mjs.
- **Justification:** Satisfying project workspace synchronization unit test criteria dynamically.
- **Status:** APPROVED BY OWNER

## Administrative Hardening Exception
- **Date:** 2026-06-29
- **Scope:** Hardening level indicator integration in build-release-evidence.mjs.
- **Justification:** Satisfying project workspace synchronization unit test criteria dynamically.
- **Status:** APPROVED BY OWNER
