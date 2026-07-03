<!-- Copyright Modonome contributors. -->
<!-- SPDX-License-Identifier: MIT -->

<!-- modonome:module state-machine -->
## Durable state machine

Every work item is a record under `state_dir`, never a memory in a session.

States:

```text
queued -> claimed -> making -> checking -> merge_ready -> merging -> done
                  -> rework -> making
                  -> escalated
claimed/making/checking -> queued on expired lease
```

Fields follow `schemas/work-item.schema.json`:

```yaml
id:
state: queued
owner:
lease_expires_at:
branch:
pr:
attempts: 0
max_attempts: 3
touches_protected_path: false
maker_id:
maker_model:
checker_id:
checker_model:
allowed_edit_set: []
gates: []
escalation_reason:
```

Transitions:

- `claim`: only from `queued`. Set owner and lease.
- `start_making`: only under an active lease. The maker receives one bounded work packet.
- `pr_opened`: move to `checking`. Spawn a checker that is not the maker and, when models are
  visible, not the maker model.
- `checks_red` or `critique_failed`: increment attempts and return to `making` until the cap,
  then escalate.
- `checks_green`: move to `merge_ready` only when there is no protected path, no requested
  change, no missing owner review, and no cap violation.
- `human_approved`: required for protected paths and high-risk work.
- `merge`: only by the single merge authority, only when live merge is enabled.
- `tick`: expired leases return to `queued`. Crash recovery is automatic.
- `escalate`: park for owner or frontier review with a durable note.

Idempotency: every action keys off the item id and current state. Re-running a parked turn
never opens a second branch or pull request for the same item.

Escalation note:

```markdown
escalation:
- item:
- reason:
- attempts:
- last hypothesis:
- last failing gate:
- protected paths:
- requested owner decision:
- default if unanswered: hold
```

## Work packet

Makers receive a tight packet. A thin packet is a decomposition defect, not a reason for the
maker to improvise.

```yaml
goal: one sentence
why_now: link to issue, roadmap, incident, or owner request
allowed_edit_set:
  - path
fence:
  - failing test, contract, golden, lint, eval, or the exact command that proves done
contracts: public interfaces and invariants to preserve
reuse:
  - path: existing helper or sibling implementation
    note: why it matters
constraints:
  - do not weaken tests
  - do not touch protected paths
  - do not add dependencies without owner approval
risks:
  - behavior, security, migration, UX, cost, rollback
gate: exact commands that prove done
tier_hint: local | frontier | owner
```

The maker touches only `allowed_edit_set`, keeps each changed line traceable to the packet,
and stops rather than fake a green result.

## Session loop

Start: read repo instructions and the core, fetch the integration branch if allowed, read
status and decisions and CI, confirm mode and caps, run the adoption pass if needed.

Work: claim one item, verify the work packet, make the smallest invariant-preserving change,
run focused gates then broader gates as risk requires, write a maker rationale, send to an
independent checker, record status and metrics.

End: resolve or record every conflict, update durable status, stage candidate learnings only
when evidence exists, commit and push when repo policy requires it, and leave no required
next step hidden in chat.
