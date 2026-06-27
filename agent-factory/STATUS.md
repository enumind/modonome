# Status

## Now
- Phase A built and verified locally: 125 tests green, ruff clean.
- Components in place:
  - `gateway/` OpenAI-compatible proxy with a global concurrency semaphore.
  - `fleet_runner/` engine: tools (modonome script wrappers), llms (local maker +
    claude-CLI checker), agents (structured-edit maker), crew (maker -> checker loop),
    registry (per-repo fleets over common workers), scheduler (cross-repo dispatch),
    run_one (single-item CLI).
  - Packaging (pyproject, console scripts), fleet.config.yaml, fleets/registry.yaml.
  - Evolution docs: README, DECISIONS, LEARNINGS, ROADMAP, AGENTS.

## Pending (needs the owner's machine)
- Live go-live run requires LM Studio serving Qwen and the `claude` CLI on the
  subscription. Follow the runbook in README.md. The container used for development has
  neither, so the live maker/checker pass is the owner's step.
- Confirm the chosen modonome work item is queued, Tier 1, and non-protected.

## Not started
- Phase B: cross-repo scheduling at scale, a fair multi-model gateway, more roles
  (product-manager merge authority, maintainer global tick), and the knowledge-network
  tie-in. See ROADMAP.md.

## Mode
- No autonomous merge. The loop parks at `merge_ready` for the owner.
- No metered API: local maker via gateway, checker via claude CLI subscription.
