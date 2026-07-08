---
status: active
owner: "@nateshpp"
last_reviewed: 2026-07-07
---

# Work-item runbook: the queue discipline

Vendor-neutral runbook for creating, claiming, transitioning, and closing work
items. Any agent or human follows it directly; Claude Code also surfaces it as the
`/work-item` skill through a thin adapter under `.claude/skills/`.

Every governed change flows through a work item: a JSON file in
`.modonome/work-items/` that names what may be edited (`allowed_edit_set`), what
must pass (`gates`), and where the work stands (`state`). The files on disk are the
source of record; `.modonome/STATUS.md` is a human-readable snapshot of them.

Two incidents make this runbook worth following exactly: the queue once carried 15
merged items still marked `queued` because nothing reconciled state against merged
reality, and the directory has held duplicate WI-041, WI-042, and WI-043 files from
concurrent branches picking the same number.

## Create

1. **Pick a collision-safe ID.** `git fetch origin main`, then:
   `git ls-tree -r --name-only origin/main .modonome/work-items/ | sort -V | tail -3`.
   Your number is the highest on the base branch plus one, regardless of what your
   local checkout shows. Filename: `WI-NNN-<kebab-slug>.json`.
2. **Fill the fields.** Validate against `schemas/work-item.schema.json`
   (`additionalProperties: false`, so no invented fields). Minimum:
   `schema_version`, `id` (matches the filename stem), `state`, `type` (one of
   `fix-issue`, `develop-feature`, `create-article`, `create-plan`, `update-docs`,
   `chore`), `attempts` / `max_attempts`.
3. **Scope honestly.**
   - `allowed_edit_set`: the exact paths the change will touch, including the work
     item file itself and `.modonome/STATUS.md` if you will update it. The checker
     compares the diff against this list; widen the item before widening the diff.
   - `touches_protected_path`: true when any path is under `scripts/`, `bin/`,
     `schemas/`, `templates/`, `prompts/`, `.github/`, or `site/`. True means a
     CODEOWNER must review before merge and the item cannot auto-merge.
   - `gates`: exact shell commands, copy-pasteable, that must all pass before
     push. Include `node scripts/check-style.mjs .` always, plus the gates the
     touched areas require; `npm run verify` is the safe superset.
4. **Check it in:** `node scripts/check-work-items.mjs` must pass. New claims may
   require owner approval (`owner_approval_required_for_new_claims` is true in this
   repo's config): queue the item and wait rather than self-approve.
5. Before starting, confirm no governing entry in `.modonome/DECISIONS.md` is
   `hold`. Unanswered means no action.

## Claim and transition

States: `queued`, `claimed`, `making`, `checking`, `rework`, `merge_ready`,
`merging`, `done`, `escalated`. The spec of record is
`prompts/modules/state-machine.md`.

Transitions go through the compare-and-swap CLI, never a hand edit of the `state`
field:

```
node scripts/transition-work-item.mjs <item.json> <fromState> <toState> <writerId>
```

The swap succeeds only when the state is still what you last read AND you hold the
lease (none live, yours, or expired). On conflict, re-read and retry; never
overwrite. Rules that bind you:

- One item per turn. Related items are sequenced: the first merges before the
  second is claimed (ADR-007).
- Leases expire after `lease_minutes` (default 60); `node scripts/tick.mjs`
  returns expired claims to `queued`. A crash is recoverable by design.
- `rework` loops back to `making` and increments `attempts`. At `max_attempts`
  (default 3), transition to `escalated` with an `escalation_reason` and park it
  for the owner. Stop rather than fake a green result.
- `merge_ready` is legal only with no protected path pending human approval, no
  requested change outstanding, and no cap violation.

## Close out

When the PR merges:

1. Transition the item to `done` (through `merging` if it was not already there).
2. Update the queue snapshot in `.modonome/STATUS.md` if it names the item.
3. Run both queue gates:

```
node scripts/check-work-items.mjs
node scripts/check-work-item-staleness.mjs
```

The staleness gate exists precisely because this step used to be skipped: it flags
an open item whose declared tests pass and whose implementation paths exist, which
usually means the work merged and nobody moved the state.

## Quick reference

| Task | Command |
| --- | --- |
| Validate all items | `node scripts/check-work-items.mjs` |
| Detect state drift | `node scripts/check-work-item-staleness.mjs` |
| Transition | `node scripts/transition-work-item.mjs <file> <from> <to> <writer>` |
| Expire stale leases | `node scripts/tick.mjs` |
| Highest ID on base | `git ls-tree -r --name-only origin/main .modonome/work-items/ \| sort -V \| tail -1` |
