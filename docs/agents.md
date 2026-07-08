---
status: active
owner: "@nateshpp"
last_reviewed: 2026-07-08
canonical: [agents]
---

# Agents, roles, runners, and models

Modonome runs a small crew of agents under one principle applied at two governed checkpoints:
nothing advances without an independent check. A proposal reaches the backlog only past a check
of the proposal, and a diff reaches `main` only past an independent checker plus common CI. The
full flow is in [adr/ADR-040-end-to-end-operating-model.md](adr/ADR-040-end-to-end-operating-model.md);
the structure decision is in [adr/ADR-044-agent-org-structure.md](adr/ADR-044-agent-org-structure.md).

This is the canonical reference: the roster, the config fields, how to route a role's spend, and
worked recipes. `docs/agent-org.md` and `docs/ops/runner-model-config.md` now redirect here. The
single source of record for the running values is always `.modonome/config.yaml`.

## Why this matters more than it looks

Every role is config-driven, not hardcoded: a runner, a model or a prioritized model fallback
chain, a cost class, optional skills/tools/schedule. A new crew role needs zero code changes
(`scripts/agent/resolve-role.mjs` falls back to a generic descriptor for any role name present in
config but absent from its built-in defaults). Combined with the provider registry's fail-closed
cost semantics (an unrecognized provider resolves to *paid* rather than silently escaping the
budget gate, `scripts/agent/providers.mjs`), this is a real per-role model-routing and
cost-control system, not a single hardcoded agent behind a marketing name.

## The crew

| Agent | Kind | Purpose | Fires on | Recommended model (cost and fitment) |
|---|---|---|---|---|
| `maker` | producer | Implements one scoped work item behind a failing test | a work item in the backlog | `claude-sonnet-4-6`, with a local fallback. The price and quality balance for bounded diffs. |
| `checker` | integrity | Independent review of the diff plus the gates; must be a different model family from the maker | after the maker | `claude-opus-4-8`. Adversarial depth; the distinct-family rule is enforced (ADR-006). |
| `researcher` | producer | Grounded proposals from the repo and backlog (Checkpoint 1) | a schedule or a manual run | `claude-sonnet-4-6`, falling back to `local-default`. Grounded drafting does not need a frontier model. |
| `self-govern` | integrity | Modonome applying its own governance to itself | nightly schedule | `claude-haiku-4-5-20251001`. Cheap and frequent. |
| `envisioner` | producer | Scoped innovation proposals grounded in an owner-approved direction (`DECISIONS.md`, `ROADMAP.md`) | weekly schedule (`0 6 * * 1`), independent-check gated like the researcher | `claude-opus-4-8`, with a local fallback. Ideation benefits from a frontier model; the low weekly cadence bounds the cost. |
| `marketresearcher` | producer | Opt-in scan of the ecosystem and standards; sourced, paraphrased findings only. Named without a hyphen: `scripts/agent/render-prompt.mjs` requires a role name matching `^[a-z]+$` | weekly schedule (`0 7 * * 1`), behind `market_scan_enabled` (default off) | `claude-haiku-4-5-20251001`, with a local fallback. Cost-first, matching `local_model_only_by_default`. |

`maker` and `checker` are the first-class separation-of-duties pair and always run. The others are
crew roles that run on their own schedule or trigger and stay off the default `role_sequence`, so
a plain cycle still runs exactly the maker then the checker. **`researcher`, `envisioner`, and
`marketresearcher` are configured today but not on the active sequence** (WI-042, ADR-039/040):
they run only via an explicit `--roles` invocation or their own schedule, never as a side effect
of a default cycle.

## How an agent is configured

Every agent is a key under `roles` in `.modonome/config.yaml`. The full field set is defined in
`schemas/config.schema.json`. No code change is needed to add or retune an agent.

- `runner`: `local` (a self-hosted runner, for example a Mac running local models) or `container`
  (an `ubuntu-latest` runner). Runner definitions live under `runners`, mapping to labels
  (`[self-hosted, mac-mini]` for `local`) and the CLI binary to invoke.
- `model` and `models`: the primary model, and an optional prioritized fallback list. A paid
  frontier choice can fall back to a free or local model when there is no budget or when the
  first choice is unreachable at runtime (`isUnreachableError` in `run-cycle.mjs` retries only on
  network unreachability, never on a real answer, an auth failure, or a bad status). Model
  definitions and their providers live under `models` and `providers`; cost class and transport
  are resolved by `scripts/agent/providers.mjs`.
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

`scripts/agent/triggers.mjs` reads these fields, derives the execution order for `after-role`
chains (consumed by `resolveRoleSequence` in `scripts/agent/run-cycle.mjs`), and renders the
scheduled-crew workflow `.github/workflows/modonome-schedule.yml`, so a scheduled crew role never
needs a hand-edited workflow.

These are operator settings, not repository constants. The control panel's Agents tab
(`apps/control-panel/`) edits an agent's model chain, skills, and tools directly against
`.modonome/config.yaml` through the gated writer, so an agent's model is a control-panel choice
rather than a fixed one. See [control-panel-modes.md](control-panel-modes.md) for the panel's
permission model.

## Provider registry and cost classes

`scripts/agent/providers.mjs` maps a provider name to its transport, cost class, and auth
environment variable:

| Provider | Transport | Cost class | Auth env |
|---|---|---|---|
| `anthropic` | `anthropic-cli` | paid | `ANTHROPIC_API_KEY` |
| `local` | `openai-http` | local (no charge, no network dependency) | none |
| `github-models` | `openai-http` | free (no charge, still remote) | `GITHUB_TOKEN` |
| `openai-compatible` | `openai-http` | free | `OPENAI_API_KEY` |

An unrecognized provider name resolves to the paid/`anthropic-cli` default rather than throwing,
so an unknown provider never silently escapes the budget gate. A role's cost class is billable
only when it resolves to `paid`; `remote_model_budget_usd_per_day: 0` plus
`local_model_only_by_default: true` means paid spend is structurally impossible until an owner
raises the budget.

## Worked recipes

**Maker on a local model, checker on a frontier model, $0/day budget:**

```yaml
remote_model_budget_usd_per_day: 0

roles:
  maker:
    runner: local
    model: local-maker
  checker:
    model: claude-opus-4-8   # stays paid-capable; budget gate blocks it until raised

models:
  local-maker:
    provider: local
    base_url: http://localhost:11434
```

The maker runs at zero cost; the checker is configured but cannot spend until an owner raises
`remote_model_budget_usd_per_day` above 0. `require_distinct_maker_checker_model` still enforces
that the two are never the same string, local or hosted alike.

**A fully local, zero-cost maker/checker pair** (useful for testing the loop against a local or
free endpoint with no metered spend):

```yaml
remote_model_budget_usd_per_day: 0

roles:
  maker:
    model: local-maker
  checker:
    model: local-checker

models:
  local-maker:
    provider: local
    base_url: http://localhost:11434   # local server or free gateway
  local-checker:
    provider: local
    base_url: http://localhost:11435   # a distinct endpoint strengthens model-family distinctness
```

For providers other than Anthropic, run an Anthropic-compatible gateway (for example LiteLLM, or
an Ollama proxy) and point `base_url` at it. None of this changes the arming posture: the
autonomous loop stays off until an owner arms it (`MODONOME_ARMED`).

**Add a custom crew role with zero code changes:**

1. Add a key under `roles` in `.modonome/config.yaml` with a `model` or `models`, a `runner`, and
   a `schedule` or `trigger`. A role absent from the built-in defaults inherits the generic
   fallback (container runner, the generic maker model) and resolves like any other role.
2. If the role runs as a session, add a prompt at `prompts/roles/<role>.txt`. A role on the
   executed sequence without a prompt is rejected during planning, before any model call.
3. Dry-run it in isolation: `node scripts/agent/run-cycle.mjs --roles <role> --dry-run`, to
   confirm the plan resolves the model chain and routes to a reachable target.
4. If the role is scheduled on a container runner, regenerate the workflow with
   `node scripts/agent/triggers.mjs --write` and commit the result. A crew role stays a dry-run by
   default and runs live only behind the `MODONOME_SCHEDULE_EXECUTE` repository variable.

## Enforcement

- Both producer roles (`researcher`, `envisioner`) feed Checkpoint 1 through
  `scripts/agent/review-proposals.mjs`, so a proposal enters the backlog only on an explicit
  approval.
- The maker and checker always use different model families (ADR-006), enforced in config and at
  plan time. When `require_distinct_maker_checker_model` is `true` (the default),
  `validate-config` fails if `roles.maker.model` and `roles.checker.model` are the same string,
  hosted or local alike: `node scripts/validate-config.mjs .modonome/config.yaml`.
- The whole loop stays off until an owner arms it (`MODONOME_ARMED`), and paid model spend stays
  at zero until an owner raises `remote_model_budget_usd_per_day`.

`scripts/agent/resolve-role.mjs` exports `resolveRole(cfg, role)`, which reads the config maps and
returns `{ runner, runnerLabels, cliPath, model, modelProvider, modelBaseUrl }`. CLI flags override
the returned values in later pipeline stages.

The committed models here are recommendations for cost and fitment. The running values are
whatever `.modonome/config.yaml` holds, and the roadmap for the planned roles is Milestone 5 in
[../ROADMAP.md](../ROADMAP.md).
