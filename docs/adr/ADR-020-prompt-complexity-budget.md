# ADR-020: Prompt Complexity Budget

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 6 (Self-governance hardening)

## Context

The prompt is the primary artifact of Modonome. It must remain human-auditable to be trustworthy.
As new modules, roles, and gates are added, the prompt grows. Without a structural limit, the
prompt can become too large to reason about, reducing its auditability and the ability to
review changes meaningfully.

The current ARCHITECTURE.md states:

> Small context per turn. A harness loads the core plus only the module it needs.

This is true, but the *core* itself can still grow beyond auditable limits. Modules are
modular by design, but they too can accumulate complexity.

## Decision

1. **Define a complexity budget** for `modonome.core.md` and each module:
   - Core: 500 lines, 20 decision points (conditional branches or role splits)
   - Each module: 300 lines, 12 decision points
   - Modules exceeding budget move to sub-modules (e.g., `network` → `network-catalog`, `network-import`)

2. **Implement `check-prompt-budget.mjs`** as a CI gate that:
   - Runs on every `prompts/` change
   - Counts lines and decision-tree branches (if-elif-else, role switches, nested conditions)
   - Fails the build with a clear message if budget is exceeded
   - Suggests refactor direction (split into sub-module, move logic to script layer)

3. **Budget overages are design signals.** If the core approaches 500 lines, the team must
   choose: split the core (breaking change), move logic to script layer, or defer the feature.
   This forces intentional design, not accidental creep.

4. **Self-application:** The check runs on Modonome's own `prompts/` as a Tier 2 gate.
   Any exceeding change is blocked until the author resolves it (refactors, deferrs, or
   formalizes a budget increase with an ADR).

## Consequences

- Prompt growth is explicit and gated.
- The team must rationalize complex features in design, not discover they are complex after
  the fact.
- If a feature doesn't fit the budget, it stays out of the prompt and lands in scripts or
  a new module.
- Auditors can scan the prompts and know the complexity is bounded.

## Related

- ADR-012 (Harness Prompt Integrity): ensures prompt is read from base branch.
- ADR-021 (Prompt Behavioral Regression Suite): ensures behavioral fidelity despite growth.
