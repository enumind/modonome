# ADR-044: The agent org structure and its configurability

**Status:** Accepted  
**Date:** 2026-07-07  
**Milestone:** 5 (Market researcher and envisioner roles)  
**Builds on:** ADR-006 (checker independence), ADR-038 (checker as an author-agnostic review service), ADR-039 (agent capability profiles), ADR-040 (end-to-end operating model), WI-032 (configurable trigger and schedule layer)

## Context

A recurring request is to give Modonome a "robust agent org," in the spirit of collections
like agency-agents: a roster of specialists, each able to run on a chosen model, runtime,
schedule, and trigger (a local model, a hosted Claude model, and so on). The risk in answering
that with a new subsystem is duplication. Modonome already has most of the machinery:

- The `roles` map in `.modonome/config.yaml` is a generic registry. Any key becomes an agent
  with no core-code change (`resolveRole` in `scripts/agent/resolve-role.mjs`, WI-040).
- Each role already carries `runner`, `model`, a prioritized `models` list, `skills`, `tools`,
  `provider`, and `transport` (ADR-039), resolved against a provider and cost registry
  (`scripts/agent/providers.mjs`).
- The operating model is two governed checkpoints: research to backlog, and make to merge
  (ADR-040). Every producer, whether the internal loop, a human with a coding agent, or a
  scheduled run, converges on the same CI.

Two gaps remained. First, the per-role `schedule` and `trigger` fields were not consumed by
anything, so scheduling meant hand-editing a workflow. WI-032 closes that: `schedule` and an
object `trigger` are now wired, and `scripts/agent/triggers.mjs` derives an execution order from
`after-role` chains and emits `.github/workflows/modonome-schedule.yml`. Second, there was no
single document that states the org: the roster, what each agent is for, and how it is
configured. ADR-040 has the flow but not the roster. This ADR records the structure, and the
canonical roster lives in `docs/agent-org.md`.

## Decision

1. **The agent org is the `roles` registry, governed by two checkpoints.** There is no separate
   agent framework. An agent is a config entry; a producer agent advances a proposal to the
   backlog only past an independent check, and a diff to `main` only past an independent checker
   plus common CI (ADR-040). This is what makes a larger crew safe: every producer passes the
   same two checks regardless of which model or runtime produced it.

2. **Adopt the specialist-roster pattern as governed, config-only crew roles, not a flat
   personality dump.** A specialist is a role in `.modonome/config.yaml` with its own capability
   profile, not a free-standing prompt outside the governance boundary. This keeps the roster
   inside the maker/checker/owner structure rather than beside it.

3. **Every agent is configurable on model, runtime, schedule, and trigger from config alone.**
   The role fields (`schemas/config.schema.json`) are: `runner` (local or container), `model`
   and a prioritized `models` fallback list, `skills` and `tools` (declarative tags), `provider`
   and `transport`, `schedule` (`cron`, `timezone`), `trigger` (a string shorthand or an object
   with `type`, `after`, `cron`), and `execution_target`. `trigger.after` chains a role after
   others; ordering reuses `scripts/lib/graph.mjs` and fails closed on a cycle or a dangling name
   before any model call.

4. **Keep the crew lean.** Today it is `maker`, `checker`, `researcher`, and `self-govern`. The
   only planned additions are `envisioner` (scoped innovation proposals with a weekly priority
   score) and `market-researcher` (an opt-in ecosystem scan, flag-gated by `market_scan_enabled`,
   default off). Both are Milestone 5 roles and both are governed producers that feed Checkpoint
   1, so they add no new trust surface. The bar for a new role is a distinct purpose that no
   existing role covers.

5. **The roster is a single source of truth.** `docs/agent-org.md` (canonical key `agent-org`)
   holds the roster table, the per-agent configuration reference, and the "how to add or change
   an agent" steps. Other docs link to it rather than restating the roster.

## Consequences

- One legible picture: a reader or an operator can name every agent, see what fires it, and know
  which model and runtime it uses, from one page backed by one config file.
- Configurability is real, not aspirational: `schedule` and `trigger` are consumed (WI-032), so a
  scheduled crew role needs a config edit, not a hand-written workflow.
- More configurable agents mean more ways to misconfigure a crew. This is bounded by existing
  guards: the distinct maker/checker model rule (ADR-006), fail-closed trigger ordering (WI-032),
  and the control-panel coverage gate that requires every config lever to have an operator
  surface (`scripts/check-control-panel-coverage.mjs`).

## Implementation status

Shipped:

- The generic role registry (WI-040) and agent capability profiles (ADR-039).
- The configurable trigger and schedule layer (WI-032): schema fields, `scripts/agent/triggers.mjs`,
  `resolveRoleSequence` consumption, and the generated `.github/workflows/modonome-schedule.yml`.
- This ADR and the canonical roster in `docs/agent-org.md`.
- Per-agent `schedule` and `trigger` editors in the control panel Agents tab (WI-046).
- The `envisioner` and `marketresearcher` roles, with prompts and capability profiles (WI-053).
  `marketresearcher` carries no hyphen because `scripts/agent/render-prompt.mjs` requires a role
  name matching `^[a-z]+$`.

Follow-up, each under its own gates and tracked against Milestone 5:

- A config-to-runtime generator that emits the container-runner workflow and local schedules
  from the same config, plus a freshness gate (the crew-only schedule generator from WI-032
  covers scheduled roles; a unified generator including the maker/checker pair is not yet built).
- A "Regenerate runtime" action in the control panel wired to the gated write path.
- The proposal priority score surfaced in `report` and the panel.
