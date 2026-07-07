---
status: active
owner: "@nateshpp"
last_reviewed: 2026-07-07
canonical: [agent-org]
---

# The Modonome agent org

Modonome runs a small crew of agents under one principle applied at two governed checkpoints:
nothing advances without an independent check. A proposal reaches the backlog only past a check
of the proposal, and a diff reaches `main` only past an independent checker plus common CI. The
full flow is in [adr/ADR-040-end-to-end-operating-model.md](adr/ADR-040-end-to-end-operating-model.md);
the structure decision is in [adr/ADR-044-agent-org-structure.md](adr/ADR-044-agent-org-structure.md).

This page is the roster: who is in the crew, what each agent is for, and how each one is
configured. The single source of record for the running values is `.modonome/config.yaml`.

## The crew

| Agent | Kind | Purpose | Fires on | Recommended model (cost and fitment) |
|---|---|---|---|---|
| `maker` | producer | Implements one scoped work item behind a failing test | a work item in the backlog | `claude-sonnet-4-6`, with a local fallback. The price and quality balance for bounded diffs. |
| `checker` | integrity | Independent review of the diff plus the gates; must be a different model family from the maker | after the maker | `claude-opus-4-8`. Adversarial depth; the distinct-family rule is enforced (ADR-006). |
| `researcher` | producer | Grounded proposals from the repo and backlog (Checkpoint 1) | a schedule or a manual run | `claude-sonnet-4-6`, falling back to `local-default`. Grounded drafting does not need a frontier model. |
| `self-govern` | integrity | Modonome applying its own governance to itself | nightly schedule | `claude-haiku-4-5-20251001`. Cheap and frequent. |
| `envisioner` (planned) | producer | Scoped innovation proposals from an owner-approved direction, with a weekly priority score | weekly schedule, owner-gated | `claude-opus-4-8`, with a local fallback. Ideation benefits from a frontier model; the low cadence bounds the cost. |
| `market-researcher` (planned) | producer | Opt-in scan of the ecosystem and standards; sourced, paraphrased findings only | a schedule, behind `market_scan_enabled` (default off) | Two tiers: a free or `claude-haiku-4-5` pass for the frequent scan, then `claude-sonnet-4-6` for the weekly synthesis. |

`maker` and `checker` are the first-class separation-of-duties pair and always run. The others
are crew roles that run on their own schedule or trigger and stay off the default sequence, so a
plain cycle still runs exactly the maker then the checker.

## How an agent is configured

Every agent is a key under `roles` in `.modonome/config.yaml`. The full field set is defined in
`schemas/config.schema.json`. No code change is needed to add or retune an agent.

- `runner`: `local` (a self-hosted runner, for example a Mac running local models) or
  `container` (an `ubuntu-latest` runner). Runner definitions live under `runners`.
- `model` and `models`: the primary model, and an optional prioritized fallback list. A paid
  frontier choice can fall back to a free or local model when there is no budget or when the
  first choice is unreachable at runtime. Model definitions and their providers live under
  `models` and `providers`; cost class and transport are resolved by `scripts/agent/providers.mjs`.
- `skills` and `tools`: declarative capability tags read by the loop and prompts (ADR-039). They
  describe an agent; tool execution is gated separately.
- `schedule`: `{ cron, timezone }`, the declarative cadence for a scheduled crew role.
- `trigger`: a string shorthand (`trigger: schedule`) or an object
  `{ type, after, cron }`. `type` is one of `schedule`, `manual`, `webhook`, `on-merge`, or
  `after-role`. An `after-role` trigger with `after: [role, ...]` chains this agent after those
  agents in one run; the order is a topological sort that keeps the maker then checker spine and
  fails closed on a cycle or a dangling role name before any model call.
- `execution_target`: the environment or runner that must run the agent, when its model endpoint
  is only reachable from one place (`scripts/agent/route-action.mjs`).

`scripts/agent/triggers.mjs` reads these fields. It derives the execution order for `after-role`
chains (consumed by `resolveRoleSequence` in `scripts/agent/run-cycle.mjs`) and renders the
scheduled-crew workflow `.github/workflows/modonome-schedule.yml`, so a scheduled crew role never
needs a hand-edited workflow. See [adr/ADR-044-agent-org-structure.md](adr/ADR-044-agent-org-structure.md)
(WI-032) for the decision and [ops/runner-model-config.md](ops/runner-model-config.md) for
runner and model setup.

These are operator settings, not repository constants. The control panel's Agents tab
(`apps/control-panel/`) edits an agent's model chain, skills, and tools directly against
`.modonome/config.yaml` through the gated writer, so an agent's model is a control-panel choice
(a local model, a hosted model, and so on) rather than a fixed one. Per-agent schedule and trigger
editing lands in the same tab, so every part of an agent's model, runner, schedule, and trigger is
set from one surface. See [control-panel-modes.md](control-panel-modes.md) for the panel's
permission model.

## Adding or changing an agent

1. Add or edit the agent's key under `roles` in `.modonome/config.yaml`. Set its `model` and
   `models`, its `runner`, and its `schedule` or `trigger` as needed.
2. If the agent runs as a session, add a prompt at `prompts/roles/<role>.txt`. A role placed on
   the executed sequence without a prompt is rejected during planning.
3. Run it on its own with `node scripts/agent/run-cycle.mjs --roles <role> --dry-run` to confirm
   the plan resolves the model chain and routes to a reachable target.
4. If the agent is scheduled on a container runner, regenerate the workflow with
   `node scripts/agent/triggers.mjs --write` and commit the result. A crew role stays a dry-run
   by default and runs live only behind the `MODONOME_SCHEDULE_EXECUTE` repository variable.

## Governance

- Both producer roles feed Checkpoint 1 through `scripts/agent/review-proposals.mjs`, so a
  proposal enters the backlog only on an explicit approval.
- The maker and checker always use different model families (ADR-006), enforced in config and at
  plan time.
- The whole loop stays off until an owner arms it (`MODONOME_ARMED`), and paid model spend stays
  at zero until an owner raises `remote_model_budget_usd_per_day`.

The committed models here are recommendations for cost and fitment. The running values are
whatever `.modonome/config.yaml` holds, and the roadmap for the planned roles is Milestone 5 in
[../ROADMAP.md](../ROADMAP.md).
