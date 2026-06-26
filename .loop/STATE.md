# Loop state (durable, survives container resets)

This branch (`claude/determined-goldberg-e7sdkh`) is the loop's MEMORY branch.
It is never merged to `main`. Wave work happens on `modonome/wave-N` branches cut
from `origin/main` and merged via PR + auto-merge. On a fresh container, read
`.loop/plan.md` and this file to recover. Ground truth for what is committed is
`git log origin/main` and the open PRs; this file is the human-readable index.

## Base
- `origin/main` = `6944aa9` (Wave 1 and Wave 2 merged). Cut every NEW wave branch from latest `origin/main`.

## Waves
- Wave 1: WS-0, WS-H, WS-A, WS-E  -> PR #14 MERGED into main. DONE.
- Wave 2: WS-B, WS-C              -> PR #15 MERGED (squash) into main (6944aa9). DONE.
- Wave 3: WS-D, WS-F             -> modonome/wave-3 (cut from origin/main 6944aa9). NEXT.
- Wave 4: WS-G                   -> modonome/wave-4

## Stale remote branches (cannot delete from this env)
- modonome/wave-1 and modonome/wave-2 are merged but still on the remote. git push --delete
  is refused by the agent proxy (403/hung-up), the GitHub MCP has no delete-branch tool, and
  api.github.com is blocked. Owner: enable "auto-delete head branches" and delete these two.

## Merge note
- The repo "Allow auto-merge" setting reads as off, so enable_pr_auto_merge fails each wave.
  Per owner direction, PRs are landed by merge (squash) once CI is green and the independent
  checker has signed off. Wave 2 was squash-merged on owner instruction.

## Workstream status
- [x] WS-0  guardrails + run-blocker fixes        (wave-1, merged)
- [x] WS-H  runner/model config layer             (wave-1, merged)
- [x] WS-A  runnable sample apps + planted debt    (wave-1, merged)
- [x] WS-E  quality data corpus + empty-state bite (wave-1, merged)
- [ ] WS-B  in-repo agent harness                  (wave-2) NEXT, Opus core + Sonnet IO
- [ ] WS-C  capture real proof artifacts           (wave-2) Sonnet curate + Opus verify
- [ ] WS-D  dogfood CI + trust boundary            (wave-3) Opus semantics + Sonnet YAML
- [ ] WS-F  site honesty + edit-set gate           (wave-3) Sonnet + Haiku
- [ ] WS-G  final adversarial verification         (wave-4) Opus Workflow fan-out

## Merge mechanism (CONFIRMED WORKING for Wave 1)
- Owner enabled "Allow auto-merge" + branch protection. PR #14 auto-merged on green
  via GitHub's ruleset (a merge commit, not squash). I never ran a manual merge.
- Per wave: build on modonome/wave-N off latest origin/main; open ONE PR; add a wave
  work item with maker id+model; run an independent distinct-model checker (cheapest
  model != wave maker; did not author diff; diff-only; in-loop); record checker id+model
  on the work item (distinct) so check-work-items enforces separation from base; post
  the sign-off as a PR comment; subscribe to PR activity; enable_pr_auto_merge (SQUASH).
  On green GitHub auto-merges. Webhook delivers the "merged" event.
- Wave 1 maker_model = claude-opus-4-8, checker_model = claude-sonnet-4-6.

## Known environment constraints (do not retry, report)
- Cannot configure branch protection / repo settings (api.github.com blocked, no MCP tool).
  Owner handles via docs/ops/merge-governance-setup.md. Owner already enabled it for Wave 1.
- Cannot delete a remote branch (git push --delete returns 403). Merged wave branches
  may linger unless owner enables "auto-delete head branches". Cosmetic only.
- Cannot post a real `modonome/independent-checker` commit status. Separation is enforced
  inside `verify` by check-work-items; the checker sign-off is a PR comment. Branch
  protection should require only `verify` + `ratchet`.

## Verify discrepancy to remember (cost a CI red on Wave 1)
- CI `verify` job runs MORE than `npm run verify`: also `build-release-evidence.mjs --check`
  and `npm pack --dry-run`. BEFORE pushing a wave, run `node scripts/build-release-evidence.mjs --check`
  and `npm run evidence` if stale, plus `npm pack --dry-run`, or CI verify will fail.

## Branch / model discipline (from /loop driver)
- ONE workstream per firing; batch a wave's workstreams into ONE PR.
- Opus 4.8 ONLY for: WS-0 semantics, WS-B core, WS-D semantics, WS-G audit. Never upgrade "to be safe."
- Workflow fan-out ONLY for WS-A / WS-E / WS-G. Single right-sized subagent otherwise.
- Budget: 60k output tokens/firing, 250k global backstop. Prefer pipeline() over barriers.
- WS-D dogfood agent job runs on push-to-main/nightly, NEVER on PRs.
