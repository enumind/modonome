# ADR-007: Claim Atomicity

**Status:** Accepted
**Date:** 2026-06-24

## Context

An agent that claims multiple work items in a single turn can couple unrelated changes,
making review harder and increasing blast radius if one change is wrong. The work-item
queue schema allows claiming one item at a time, but the prompt did not state this as
an invariant.

## Decision

A single maker pass claims and closes exactly one work item. The atomicity rule is:

1. **One lease per turn.** The agent claims at most one work item per execution turn.
   A turn ends when the agent pushes a pull request or marks the item `failed`.
2. **Scope equals allowed_edit_set.** The diff produced by the maker must not touch any
   file outside the `allowed_edit_set` of the claimed work item. The checker verifies
   this before approving.
3. **No bundling.** If two work items are related, they are sequenced: the first merges
   before the second is claimed. The exception is a work item explicitly filed with a
   combined `allowed_edit_set` and a rationale for the coupling.
4. **Lease timeout.** A claimed item with no push after `lease_minutes` (config, default:
   60) reverts to `queued` automatically. This prevents a stalled agent from blocking the
   queue.

## Consequences

- PRs are small and reviewable. Each PR maps to exactly one work item ID in its title.
- Regressions are attributable: if a change breaks something, the causal work item is
  unambiguous.
- Agents cannot use "while I am here" reasoning to expand scope. The checker rejects any
  diff that touches files outside `allowed_edit_set`.
