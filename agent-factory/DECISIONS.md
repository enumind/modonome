# Decisions

Architecture decisions for agent-factory, with rationale. Append new ones; do not
rewrite history. Each entry: context, decision, why, and what would reverse it.

## D1: The factory is a separate repo from modonome
- Context: modonome is a published, clean governance engine ("governed autonomy for any
  repo"). The factory is meta-tooling for operating and evolving many repos with agents.
- Decision: keep the factory out of the modonome repo entirely.
- Why: avoids convoluting modonome for adopters (a `git clone` would otherwise ship a
  Python CrewAI driver), and the factory drives many repos so it cannot live inside one.
- Reverse if: the factory ever becomes modonome-specific (it should not).

## D2: modonome owns governance; the factory shells its scripts
- Decision: the factory never reimplements gates, the ratchet, validation, state
  transitions, or metrics. It shells out to the target repo's Node scripts
  (`scripts/guard-ratchet.mjs`, `validate-work-item.mjs`, `transition-work-item.mjs`,
  `run-gate-pipeline.mjs`, `tick.mjs`).
- Why: one contract, one source of truth, no drift. The same logic runs in CI and in
  the factory.

## D3: Local-first, zero metered API
- Decision: maker runs on a local model (Qwen in LM Studio) via the gateway; checker
  runs via the local `claude` CLI on the owner's flat-rate subscription, with
  `ANTHROPIC_API_KEY` unset and a guard that aborts if it is set.
- Why: matches the owner's constraint and modonome's posture
  (`local_model_only_by_default: true`, `remote_model_budget_usd_per_day: 0`).

## D4: Maker and checker run different model families
- Decision: enforce family distinctness at the factory boundary
  (`FleetConfig.assert_distinct_families`) and again on the work item via
  `validate-work-item.mjs`. Qwen (maker) and claude-cli (checker) are different families.
- Why: modonome's `require_distinct_maker_checker_model` exists to avoid shared blind
  spots; two Qwen instances would be the same family and rejected.

## D5: No autonomous merge in Phase A
- Decision: the loop ends at `merge_ready`, parked for the owner.
- Why: with only maker and checker there is no separate merge authority, so an
  autonomous merge would violate maker is not merger. A product-manager merge role is a
  later batch.

## D6: Common workers shared across repos; per-repo fleets via a registry
- Decision: the factory maintains one engine and a registry of repo bindings. Common
  workers (local maker, claude-cli checker, gateway) are shared; a repo may override one.
- Why: one shared local model serves many repos rather than a model per repo; adding a
  repo is config-only.

## D7: Structured-edit maker, not unscoped shell access
- Decision: the maker returns `{path: new_contents}` limited to the work item's
  `allowed_edit_set`; the runner applies, then gates. The model never gets shell or
  unscoped file access.
- Why: deterministic and safe for a local model; the runner enforces the edit fence,
  diff cap, and protected-path ban.

## D8: Phase A drives modonome only; Phase B generalizes to many repos
- Decision: ship the single-repo loop first (live today), then add the cross-repo
  scheduler, fair multi-model gateway, more roles, and the knowledge-network tie-in.
