# Modonome Status

**Repository state:** Stable  
**Current mode:** Dry-run  
**Autonomy enabled:** false  

## Queue

This section is a snapshot, not the source of record: `.modonome/work-items/` on disk
always wins. Run `node scripts/check-work-items.mjs` for a live pass/fail, or
`node scripts/check-work-item-staleness.mjs` to catch an item whose state has drifted
from what actually landed (see the note below on why that check exists).

As of this snapshot: 36 of 39 items are `done`. Three are genuinely open:
`WI-020` (validate-work-item error-message improvements), `WI-032` (configurable
trigger and orchestration layer), and `WI-033` (GitHub Models workflow wiring). See
`docs/autonomy-plan.md` for the dependency-ordered plan those last two belong to.
See `ROADMAP.md` for the committed roadmap (Milestones 1-6) and `docs/research/` for
exploratory directions.

**Note on state drift:** This file previously claimed the queue was empty and only
acknowledged WI-001 through WI-018 as historical, while WI-019 through WI-040 had
been added and 15 of them (WI-021, WI-022, WI-026 through WI-031, WI-034 through
WI-040) were already merged with passing gates but left marked `queued`/`claimed`.
Nothing had reconciled `state:` against merged reality, since `transition-work-item.mjs`
is a manual step and no CI gate checked for this. `check-work-item-staleness.mjs` now
runs in `npm run verify` specifically to catch a repeat of this.

## Decisions

See `DECISIONS.md` for open questions.

## Learnings

See `LEARNINGS.md` for staged governance improvements.

## Network

See `NETWORK.md` for knowledge network configuration.
