# Autonomy plan: governed autonomy on free models

This document is the durable, session-independent source of record for the autonomy
upgrade. It is paired with one work item per PR under `.modonome/work-items/`
(`WI-026` through `WI-040`). A fresh session executes the plan by reading this doc and the
queued work items, with no dependence on any chat history.

## Context

Modonome is a governed-autonomy CLI (Node >=20, ESM, zero runtime dependencies) whose real
asset is deterministic safety scaffolding: the anti-gaming ratchet, structural
maker/checker separation, AgentProof, and the arming gate. The self-govern loop today is a
conformance demo rather than effective autonomy: it targets a toy app, its checker
telemetry is stubbed, it measures no before/after impact, and when it executes it is bound
to the bundled agentic CLI (`@anthropic-ai/claude-code`) plus a paid key.

The thesis is that these gates make trust independent of model strength, so autonomy can
run safely on free or local models. The weaker the model, the more the ratchet earns its
keep. The owner constraint is absolute: zero spend on model keys in development and at
runtime, by default.

A load-bearing finding: the current runner spawns the bundled CLI, which speaks the
Anthropic wire protocol and edits files itself. `buildRunnerEnv`
(`scripts/agent/run-cycle.mjs`) only sets `ANTHROPIC_BASE_URL`. Free endpoints such as
GitHub Models speak the OpenAI chat-completions protocol and are not agentic, so pointing
`ANTHROPIC_BASE_URL` at them does not work. The free path needs a new transport and a new
way to turn model output into file changes.

## Design principles (apply to every PR)

1. Provider registry (`scripts/agent/providers.mjs`) maps a provider name to
   `{ transport, costClass, authEnv, defaultBaseUrl }`. Fully config-driven and agnostic.
2. Cost class drives the budget gate: a role is billable only when `costClass` is `paid`;
   `free` and `local` never require budget. Existing configs behave identically.
3. Zero cost by default, frontier paid models on explicit opt-in (point a role at a paid
   provider, raise `remote_model_budget_usd_per_day`, and arm). The budget and arming gates
   stay the guardrails.
4. Transport drives execution: `anthropic-cli` keeps the current path; `openai-http` uses
   a new zero-dep client plus an execution mode (single-shot patch or agentic tool loop).
5. Generic role dispatch so future crew roles are added in config, not core code. Maker to
   checker separation of duties stays first-class.
6. Execution-target routing plus a durable action queue, so a role whose model is only
   reachable from a specific environment is routed to a worker that can reach it.
7. Configurable triggers per agent: schedule, event, chain, or manual, producing queued
   actions on native primitives.
8. Adapt, do not absorb: reuse permissive-licensed (MIT category) open source only at
   process, sidecar, or CI-native boundaries. Never add an npm runtime dependency to the
   core. A license-allowlist gate enforces this deterministically.
9. Session-independent execution: this doc plus the work-item queue are the source of
   record, so no session re-derives the plan.
10. Zero paid calls in development and CI: every new path is tested against a local mock
    OpenAI-compatible server; live free-model calls run only in a nightly, arming-gated,
    opt-in job.

## PR sequence and work items

Execute in ascending work-item id. Each item is claimable only when its listed dependencies
are `done`. Protected-path items (touching `scripts/`, `schemas/`, `prompts/`, `.github/`)
stop at owner review and squash-merge through the UI.

| WI | PR | Title | Depends on |
| --- | --- | --- | --- |
| WI-026 | 1 | Provider registry and cost classification | none |
| WI-027 | 2 | License-allowlist and adapter-boundary gate | none |
| WI-028 | 3 | OpenAI-compatible client library and mock server | WI-027 |
| WI-029 | 4 | Provider-native runner path, single-shot patch mode | WI-026, WI-028 |
| WI-030 | 5 | Agentic tool-loop execution mode, adapt-first | WI-027, WI-029 |
| WI-031 | 6 | Execution-target routing and durable action queue | WI-026 |
| WI-032 | 7 | Configurable trigger and orchestration layer | WI-031 |
| WI-033 | 8 | GitHub Models workflow wiring | WI-029, WI-031, WI-032 |
| WI-034 | 9 | Real checker telemetry | WI-029 |
| WI-035 | 10 | Impact measurement in report | none |
| WI-036 | 11 | Real-repo dry-run-sweep into a work-item feed | none |
| WI-037 | 12 | Deterministic task-priority scoring | WI-036 |
| WI-038 | 13 | Compounding learning finalize | none |
| WI-039 | 14 | Prompt behavioral-regression suite | none |
| WI-040 | 15 | Generic role registry | WI-026, WI-029 |

Each work item's `allowed_edit_set` is the exact file boundary for its PR, and its `gates`
are the verification commands to run. The per-PR scope, test approach without any paid API
call, and the item advanced (ADR or roadmap milestone) are recorded in the plan-mode brief
retained by the owner and summarized in the sections above.

## Model selection per PR (cost and quality)

A resuming session uses the named model tier for the PR it picks up.

- Mechanical and config-shaped (WI-035, WI-036, WI-038): a small fast model is sufficient.
- Transport and logic, test-heavy (WI-028, WI-029, WI-034, WI-037, WI-039): a mid model.
- Architecture and security-sensitive (WI-027, WI-030, WI-031, WI-032, WI-040, plus the
  design review of WI-026): the strongest model, for blast radius and boundary judgment.

## How any fresh session resumes

1. Read this doc and list `.modonome/work-items/` for `state: queued` items. Pick the
   lowest id whose dependencies are `done`.
2. Set the commit identity `nateshpp <107772539+nateshpp@users.noreply.github.com>`, create
   a governance-compliant branch (no denylisted prefix), and claim the item via
   `scripts/transition-work-item.mjs`.
3. Implement strictly within the item's `allowed_edit_set`, using the model tier above.
4. Run the item's `gates` plus `npm run verify`, `npm run check:style`, and
   `npm run test:coverage`. Self-review before opening the PR.
5. Open a small PR, remove the auto-appended footer, and move the item to `merge_ready`.
   Protected-path items wait for owner review. On merge, transition the item to `done`.
6. An interrupted session lets the lease expire and the item returns to `queued`, so the
   next session resumes with no lost state.

This keeps token cost low, keeps quality high through per-juncture model choice and a
self-review, and keeps governance intact because every step runs through the existing gates
and the arming gate.
