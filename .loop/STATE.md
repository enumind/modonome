# Loop state (durable, survives container resets)

This branch (`claude/determined-goldberg-e7sdkh`) is the loop's MEMORY branch.
It is never merged to `main`. Wave work happens on `modonome/wave-N` branches cut
from `origin/main` and merged via PR + auto-merge. On a fresh container, read
`.loop/plan.md` and this file to recover; the task list (WS-0..WS-H) does not
survive resets, so this file is the source of truth for progress.

## Base
- `origin/main` = `173ef22` (tesla work, squashed). Cut every wave branch from latest `origin/main`.

## Waves
- Wave 1: WS-0, WS-H, WS-A, WS-E  -> one PR `modonome/wave-1`
- Wave 2: WS-B -> WS-C            -> one PR `modonome/wave-2`
- Wave 3: WS-D, WS-F              -> one PR `modonome/wave-3`
- Wave 4: WS-G                    -> one PR `modonome/wave-4`

## Workstream status
- [x] WS-0  guardrails + run-blocker fixes        (wave-1) -- committed
- [ ] WS-H  runner/model config layer             (wave-1)
- [ ] WS-A  runnable sample apps + planted debt    (wave-1)
- [ ] WS-E  quality data corpus + empty-state bite (wave-1)
- [ ] WS-B  in-repo agent harness                  (wave-2)
- [ ] WS-C  capture real proof artifacts           (wave-2)
- [ ] WS-D  dogfood CI + trust boundary            (wave-3)
- [ ] WS-F  site honesty + edit-set gate           (wave-3)
- [ ] WS-G  final adversarial verification         (wave-4)

## Branch / model discipline (from /loop driver)
- ONE workstream per firing; batch a wave's workstreams into ONE PR.
- Build models: Haiku=bulk, Sonnet=standard, Opus=judgment.
- Opus 4.8 ONLY for: WS-0 semantics, WS-B core, WS-D semantics, WS-G audit. Never upgrade "to be safe."
- Workflow fan-out ONLY for WS-A / WS-E / WS-G. Single right-sized subagent otherwise.
- Budget: 60k output tokens/firing, 250k global backstop. Prefer pipeline() over barriers.

## Merge governance
- MERGER = GitHub ruleset (branch protection + auto-merge). Never run a merge command;
  never grant the agent direct-push to main.
- Per wave PR: an independent distinct-model CHECKER agent (did NOT author the diff,
  cheapest model != that wave's maker, diff-only scope, in-loop) signs off and posts
  status `modonome/independent-checker`. `check-work-items.mjs` enforces maker_id!=checker_id
  and maker_model!=checker_model from base.
- Subscribe to PR activity to autofix CI. On green, GitHub auto-merges + auto-deletes branch.

## DEFERRED / owner action required
- Branch protection on `main` + repo "auto-merge" setting + "auto-delete head branches"
  CANNOT be configured from this environment: `api.github.com` is blocked by org egress
  policy and the GitHub MCP exposes no branch-protection/ruleset tool. The exact required
  config is captured in `docs/ops/merge-governance-setup.md` (lands on wave-1). The OWNER
  must apply it in GitHub settings before wave-1 auto-merges, else `enable_pr_auto_merge`
  fails gracefully and the wave PR will wait.

## Per-wave maker/checker model assignment (build-time governance)
- Wave 1 maker = this loop (Opus for WS-0/WS-B-design semantics; Sonnet/Haiku delegated).
  Checker for wave-1 PR must be a distinct cheaper model than the wave's dominant maker
  and a distinct identity. Governance-touching waves (WS-0/WS-D/WS-F) use an Opus checker
  only if maker != Opus; otherwise pick Sonnet checker. Record maker_id/checker_id +
  maker_model/checker_model on the wave work item so check-work-items.mjs passes.
