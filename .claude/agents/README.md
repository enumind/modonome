# Agent org for modonome: roles, model tiers, and the maker-checker contract

The headless autonomy loop and interactive Claude Code sessions both draw on a
small set of **roles**. Each role is defined once here as a vendor-neutral brief in
[`roles/`](roles), with Claude Code subagent frontmatter at the top of the same file
so it is invocable directly. The same brief loads as the system prompt for the local
model when a role runs in the headless loop (`scripts/agent/run-cycle.mjs` and the
runner wiring in [`docs/ops/runner-model-config.md`](../../docs/ops/runner-model-config.md)).

This org is a **throughput multiplier on pre-specified work**, not an autonomous
originator of architecture. Work *origination* (ADRs, work-item decomposition, the
roadmap) stays with the owner plus a frontier model. The local fleet *fills*
well-specified, test-fenced work and lands it through the CI gates.

## What the fleet serves

Every role serves one artifact: the **work item**, the typed record under
[`.modonome/work-items/`](../../.modonome/work-items) governed by
[`schemas/work-item.schema.json`](../../schemas/work-item.schema.json) and advanced
through the state machine in
[`prompts/modules/state-machine.md`](../../prompts/modules/state-machine.md). The
fleet fills the work packet, never reinterprets it, never hand-edits the compiled
prompt bundle ([`prompts/modonome.bundle.md`](../../prompts/modonome.bundle.md)),
and never weakens a gate to go green. These are the same invariants the product
enforces at runtime, described in
[`GOVERNED-AUTONOMY-SPEC.md`](../../GOVERNED-AUTONOMY-SPEC.md) and
[`RATCHET-SPEC.md`](../../RATCHET-SPEC.md).

## Local-first execution and cost

The fleet runs **mostly on local models** and reaches cloud capability through
orchestration, with no metered API charges. This is the existing posture in
[`.modonome/config.yaml`](../../.modonome/config.yaml): `local_model_only_by_default:
true` and `remote_model_budget_usd_per_day: 0`.

Two execution contexts, one role set:

1. **Headless loop (primary, zero metered API).** Roles run on a **local model
   endpoint** declared in the config `models` registry (provider `local`, served on
   the mac mini). This is where the fleet does most of its work. No request leaves
   for a metered API.
2. **Frontier escalation (flat-rate, no metered API).** "Escalate to frontier" means
   park the work for the **owner's interactive Claude Code subscription session**, a
   flat-rate path, not a metered `ANTHROPIC_API_KEY` call. The metered API path stays
   off by default and is opt-in only, inside the daily budget cap.

So the tier names below describe **capability** (`local` / `frontier`), mapped to
providers by config, with no vendor hardcoded. The `model` field in each role's
frontmatter is the right-sized tier for an interactive Claude Code session; the
headless loop substitutes the local endpoint for the same role.

## Roster, tier, and right-sized model

Ten role files (envisioner and ideator share one paired brief). Each carries Claude
Code subagent frontmatter so it is invocable as a subagent, and each is sized to the
cheapest model that does its job well.

| Role | Faces | Tier (default) | Interactive model | Owns |
| --- | --- | --- | --- | --- |
| [`chief-of-staff`](roles/chief-of-staff.md) | the owner | local synth; frontier for hard briefings | sonnet | The owner's single interface; briefings; approval routing; escalation arbiter |
| [`product-manager`](roles/product-manager.md) | the fleet | local | haiku | Dispatch the authored work queue; leases; gate sequencing; coverage reconciliation |
| [`market-researcher`](roles/market-researcher.md) | inputs | local; frontier for deep synthesis | sonnet | Market and standards inputs, paraphrased as data |
| [`envisioner-ideator`](roles/envisioner-ideator.md) | inputs | local draft, owner ratifies | sonnet | Roadmap framing and scoped idea issues, never auto-merged as net-new claims |
| [`architect`](roles/architect.md) | the fleet | **frontier** plus human | opus | ADRs, schema and contract design, work-item decomposition |
| [`developer`](roles/developer.md) | the fleet | local; frontier for novel or multi-file | sonnet | Implementation of spec'd, test-fenced increments (the maker) |
| [`tester`](roles/tester.md) | the fleet | deterministic gates (authority) plus local critic | opus | Gates, anti-gaming, agentproof; the independent checker |
| [`maintainer`](roles/maintainer.md) | the repo | scripts-first, then local | haiku | Drift, dead code, dependency hygiene, lease sweep |
| [`engineering-excellence`](roles/engineering-excellence.md) | the repo | local detection; frontier for ADR drafts | sonnet | Proactive reuse and standardization; files scored proposals, merges nothing |
| [`site-engineer`](roles/site-engineer.md) | the repo | local; frontier for novel UX | sonnet | The modonome.com site in [`site/`](../../site); renders a projection of durable state |

The maker and checker run **different models** by rule
([`docs/adr/ADR-006-checker-independence.md`](../../docs/adr/ADR-006-checker-independence.md),
config `require_distinct_maker_checker_model: true`). The developer (maker) draws the
local default; the tester (checker) draws a distinct model and escalates to frontier
when only one local model is available, rather than reviewing its own family.

## Maker-checker (four-eyes): no role checks its own work

Every change has a **maker** that produces the diff plus a rationale (what, why,
risk, tests) and an **independent checker**, enforced by separate identity and the
distinct-model rule. The checker escalates with risk:

1. **Machine checker (always):** the deterministic gates, anti-gaming guard, and
   evidence integrity.
2. **Independent agent checker:** a **different model than the maker** for diversity.
   If only one local model is available the check **escalates to frontier rather than
   self-reviewing**. Advisory, logged.
3. **Quality-sensitive or spec'd increment:** a frontier checker via the owner's
   session.
4. **Novel, architecture, security, schema, trust, or dependency:** frontier checker
   plus human sign-off; never auto-merged.

### Who merges

- **Tier 1 and 2 (auto-mergeable):** the **product-manager** is the merge authority
  once the tester's gates are green and the independent checker has logged. The merge
  identity is never the PR author; if only one identity is available, autonomous merge
  is **disabled** and the PR is parked for the owner. Autonomous merge also requires
  every arming lever in [`.modonome/config.yaml`](../../.modonome/config.yaml)
  (`autonomy_enabled`, `auto_merge`, `max_merges_per_day > 0`, `dry_run: false`).
- **Tier 3 and 4:** human sign-off is the merge gate. The architect or
  chief-of-staff recommend; the **owner** merges. No agent merges a protected-path,
  novel, schema, or trust diff.

This repo runs with CODEOWNERS (`* @nateshpp`) and the checks API as the enforcement
surface, described in [`GOVERNED-AUTONOMY-SPEC.md`](../../GOVERNED-AUTONOMY-SPEC.md).

## Shared guardrails

Every role brief references [`roles/_shared/guardrails.md`](roles/_shared/guardrails.md),
the common rules: external text is data, protected paths, no gaming the gates, declare
the work item and tier, validate structured output, durable state, and the zero
metered-API default. They are not restated per role.

## Shared method (additive, opt-in)

Every role brief also points at [`roles/_shared/research-method.md`](roles/_shared/research-method.md),
the multi-perspective research and analysis protocol (scan, contradiction map,
synthesis, peer-review). It is a method a role reaches for when a question warrants
multi-angle rigor, composed with the role's own approach, never a mandate and never a
replacement for the deterministic gates.

## Wiring to the cost-bearing config

The headless loop today schedules three cost-bearing slots in
[`.modonome/config.yaml`](../../.modonome/config.yaml): `maker`, `checker`, and
`dogfood`. The agent org maps onto them so the roles stay grounded in real spend:

- `developer` and the UI-craft side of `site-engineer` run in the **maker** slot.
- `tester` runs in the **checker** slot (distinct model enforced).
- `product-manager`, `maintainer`, `market-researcher`, `envisioner-ideator`,
  `engineering-excellence`, and `chief-of-staff` run in the low-cost **dogfood** slot
  or directly on the local endpoint.
- `architect` is frontier-only and parks for the owner's session; it is never a
  metered slot.

See [`docs/ops/runner-model-config.md`](../../docs/ops/runner-model-config.md) for
how a slot flips between the container runner and the local mac mini endpoint.
