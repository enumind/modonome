# Quickstart

Modonome runs beside your repo. It starts disabled and in dry-run. Every step below is safe.

## 1. See what it would do

```bash
npx modonome dry-run .
```

This reads your repo, detects the stack and gates, lists protected paths, and proposes a few
bounded pieces of work. It is read-only.

## 2. Add local state

```bash
npx modonome scaffold .
```

This creates `.modonome/` with a config and state files, all disabled and dry-run. It
leaves existing files untouched. Add `--write` to apply, or run without it to preview.

If your repo already uses `.autonomy/`, Modonome adopts it instead.

## 3. Review and adjust

Open `.modonome/config.yaml`. Confirm the protected paths, the gates, and the caps. Keep
`autonomy_enabled` and `auto_merge` off. Validate your config:

```bash
npx modonome validate .modonome/config.yaml
```

## 4. Turn one finding into a change

Pick one proposed item. Define a work packet (goal, allowed files, a failing test as the
fence). Implement it. Open a normal pull request for human review. Modonome's role here is to
keep the change small, fenced, and independently checked.

## 5. Stage a lesson

When a review correction or a gate failure teaches something general, add one line to
`.modonome/LEARNINGS.md`. An owner promotes durable lessons into your canonical docs later.

## Arming later

Armed mode is a deliberate, owner-only step. Work through this checklist before setting
`MODONOME_ARMED=true` in your CI or harness environment.

**Platform gates**

- [ ] Branch protection is active on the target branch (no direct push to main)
- [ ] At least one required CI check is enforced before merge
- [ ] `.github/CODEOWNERS` (or platform equivalent) lists at least one human reviewer
      on every Tier 2 path (`scripts/`, `bin/`, `schemas/`, `templates/`, `prompts/`, `.github/`)

**Identity and secrets**

- [ ] Your git identity for agent commits uses the GitHub noreply address:
      `<id>+<username>@users.noreply.github.com`
- [ ] `ANTHROPIC_API_KEY` (or equivalent) is stored as a CI secret, not in a tracked file
- [ ] `MODONOME_ARMED` is set to `"true"` only in the CI environment, not locally

**Config review**

- [ ] `auto_merge` in `.modonome/config.yaml` is `false` (keep it off until merge quality
      is confirmed over several cycles)
- [ ] `max_rework_cycles` and `lease_minutes` caps are set to reasonable values
- [ ] Run `npx modonome validate .modonome/config.yaml` and confirm it exits 0

**Rollback**

- [ ] You have a documented rollback path: closing or reverting any agent-opened PR is
      sufficient; no data is written outside the repo

Once all boxes are checked, set `MODONOME_ARMED=true` in your CI secrets or harness
environment and trigger a dry run to confirm the gate activates correctly. The arming
variable is read from your environment, separate from the config file the agent can edit.

## What success looks like after the first week

Run the report command to see governance activity and your AgentProof score:

```bash
npx modonome report .
```

Until you arm the engine, the report shows no activity, because dry-run mode proposes work
but writes and merges nothing:

```
Modonome Governance Report
==========================
Target:     .
Period:     no activity recorded yet
Generated:  2026-06-26

No metrics recorded yet. Run a dry-run sweep to generate activity:
  npx modonome dry-run .

AgentProof Score
----------------
  Score: 16/16
  Level: HARDENED : all 16 gate-integrity scenarios pass (not full autonomy governance)
```

Once you arm the engine, the metrics file the engine writes at runtime begins to populate, and
the same command summarizes real activity (items attempted, gates passed and failed, ratchet
rejections, and merges landed). The numbers are read from `.modonome/metrics.jsonl`, which the
engine writes; the report never invents them. A ratchet rejection in that summary is the system
working correctly: an attempt to weaken a test was caught and revised before it could merge.

A full dry-run output example is at [examples/dry-run-transcript.txt](examples/dry-run-transcript.txt).

## Running from VS Code

To trigger a single work item from VS Code without a scheduled harness, see
[docs/vscode-workflow.md](docs/vscode-workflow.md). It covers model selection,
turn caps, and how to review and merge the resulting PR.
