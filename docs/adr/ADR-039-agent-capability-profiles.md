# ADR-039: Agent Capability Profiles and the Always-Run Crew

**Status:** Accepted  
**Date:** 2026-07-04  
**Milestone:** 5 (Market researcher and envisioner roles)  
**Builds on:** ADR-006 (checker independence), ADR-024 (capability promotion gate), ADR-038 (checker as an author-agnostic review service), WI-040 (generic role registry)

## Context

WI-040 made role dispatch a generic registry: any key under `cfg.roles` resolves to a valid
descriptor and can join the executed sequence with no core-code change. But a role carried
only a single `runner` and `model`. A real crew (a maker, a checker or reviewer, a researcher,
and other roles) needs more per agent:

- **Skills and tools.** What an agent is for, and what it is permitted to use, as declarative
  tags the loop and prompts can read.
- **Model choice as a prioritized list with fallback.** One agent should be able to prefer a
  paid frontier model and fall back to a free or local one when there is no budget, or when the
  first choice is unreachable at runtime.
- **A control-panel surface** for all of the above, so an operator configures the crew without
  hand-editing YAML.

This also extends ADR-038's model. There, the checker stopped being private to the internal
loop and became an author-agnostic review service, because the maker is one producer among
many (the loop, a human, an agent session) and the trust boundary is the merge gate. The
run-side counterpart is: the maker channel may vary, but the checker and other integrity
agents should run over the resulting change regardless of who produced it. To run a crew, the
crew first has to be describable.

## Decision

1. **Extend each role into an agent capability profile.** Alongside `runner`, `model`,
   `provider`, and the existing fields, a role may declare:
   - `models`: a prioritized fallback list, highest priority first. When set, the loop tries
     these in order; an explicit `model` stays the authoritative primary, and a role with only
     `models` resolves its first entry as the primary.
   - `skills`: declarative capability tags (for example `adversarial-review`, `cite-sources`).
   - `tools`: declarative tags for the tools the agent is permitted (for example
     `read-only-fs`, `web-search`).
   Skills and tools grant no capability by themselves; they are read by the loop and prompts.
   Actual tool execution is gated and sandboxed separately (follow-up), so declaring a tool is
   not the same as being able to run it.

2. **Prioritized model with budget-aware fallback.** `resolveRoleModelChain(cfg, role)` resolves
   the list into ordered, fully-resolved model descriptors. `selectUsableModel(chain, {budget})`
   picks the first affordable one: a local or free model is always affordable, a paid model needs
   budget above zero, and nothing affordable returns null rather than a silent downgrade. This is
   the static, cost-aware half of fallback. Runtime unreachability fallback (try a model, catch,
   move to the next) is the loop's job, tracked as follow-up.

3. **The control panel edits capability profiles.** A dedicated Agents tab in Settings lets an
   operator pick an agent and edit its skills, tools, and prioritized model list, so the crew is
   configurable from the panel as well as from YAML.

4. **The always-run crew (integrity).** The maker is a channel-variable producer; the checker,
   and other integrity agents such as a researcher when configured, run over the resulting change
   regardless of who produced it. This ADR makes the crew describable; wiring the extended
   sequence with per-agent model fallback into the running loop is the follow-up below.

## Consequences

Positive:

- A whole crew (maker, checker, researcher, and more) is describable in config and editable from
  the control panel, which is what lets the loop later run more than the maker/checker pair.
- Cost stays first: a prioritized list falls back to free or local by default, so richer crews do
  not silently increase spend.
- The researcher is defined as the first non-maker/checker integrity agent, giving Milestone 5 a
  concrete anchor.

Negative and risks:

- Declaring a tool is not executing one. Until tool execution is built and gated, `tools` is
  descriptive only, and the gap between "declared" and "enforced" must be clear in the UI and
  docs so no one assumes a sandbox that does not yet exist.
- More configurable agents mean more ways to misconfigure a crew; the distinct-model rule
  (ADR-006) now checks the primary of each chain, but broader crew-composition checks are not
  yet in place.

## Implementation status

Shipped with this ADR:

- Schema: `roles.*.models`, `roles.*.skills`, `roles.*.tools`.
- Resolution: `resolveRoleModelChain` and `selectUsableModel` in `scripts/agent/resolve-role.mjs`,
  with `resolveRole` now surfacing skills and tools and resolving the primary from a `models`
  list. The distinct-model safety rule uses that same primary.
- A `researcher` capability profile in `.modonome/config.yaml`, deliberately off the active
  `role_sequence` (maker to checker) so loop behavior is unchanged.
- A control-panel Agents tab that edits skills, tools, and the prioritized model list per agent.
- Tests in `tests/agent-capability-profile.test.mjs`.

Follow-up work, each under its own gates:

1. WI-041: the loop honors the model chain, adding runtime fallback (try, catch, next) past an
   unreachable model, beyond the static budget selection shipped here.
2. WI-042: the researcher runs in an extended role sequence over the maker's output, as an
   always-run integrity agent per ADR-038's model.
3. WI-043: tool execution becomes real and gated, so a declared `tool` is enforced by a sandbox
   rather than descriptive only.
