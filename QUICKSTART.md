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

## 4. Turn findings into queued work

```bash
npx modonome queue .
```

This prints the same proposals from step 1, numbered by priority score, and writes nothing.
Queue one or more as schema-valid work items:

```bash
npx modonome queue . 1,3        # queue proposals 1 and 3
npx modonome queue . --all      # queue everything the sweep found
```

Each queued item starts in state `queued` with a goal, an allowed file set, and a failing test
as its fence. Implement it and open a normal pull request for human review. Modonome's role
here is to keep the change small, fenced, and independently checked.

## 5. Stage a lesson

When a review correction or a gate failure teaches something general, add one line to
`.modonome/LESSONS.md`. An owner promotes durable lessons into your canonical docs later.

## Add the gate to your CI

Make the gate-integrity check block a pull request that weakens its own tests or gates. On
GitHub, add the Marketplace action and mark `Modonome Gate Integrity` a required check via a
ruleset. It declares `merge_group`, so it also reports in a merge queue:

```yaml
# .github/workflows/gate-integrity.yml
on:
  pull_request:
  merge_group:
jobs:
  gate-integrity:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: enumind/modonome@v1
```

Findings render in the Security tab as SARIF with stable `MR###` rule codes. On any other CI,
run `npx modonome ratchet` (add `--sarif` or `--json` for machine-readable output). `scaffold`
already drops this workflow into `.github/workflows/gate-integrity.yml` for you.

## Wire it into your agent (MCP)

Register the read-only governance tools with your coding agent so it can check a diff before
it commits, and see the arming posture in-session:

```bash
npx modonome connect . --write        # writes .mcp.json; add --cursor or --vscode as well
```

The MCP tools are read-only (ADR-009) and cannot arm the engine.

## Arming later

Armed mode is a deliberate, owner-only step, split across two keys: `autonomy_enabled` in
`.modonome/config.yaml`, and `MODONOME_ARMED` in your CI or harness environment. Neither alone
arms the engine.

```bash
npx modonome arm .
```

This checks the preconditions Modonome can verify locally, no network call: maker and checker
use distinct model families, `.github/CODEOWNERS` covers everything in `protected_paths_extra`,
and the `require_*` separation-of-duties flags are still on. If they pass, it writes
`autonomy_enabled: true` and prints the exact `gh secret set MODONOME_ARMED` command for the
second key, which it never sets itself. `npx modonome disarm .` reverses both.

Work through the rest of this checklist too: it covers the platform-side settings `arm` has no
way to verify (branch protection, required checks are things GitHub enforces, not something a
local command can confirm without a token).

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
  Score: 25/25
  Level: HARDENED : all 25 gate-integrity scenarios pass (not full autonomy governance)
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

## Cost model

Modonome's cost is entirely the LLM API you use. The tool itself is zero-cost
(MIT, no telemetry, no service). There is no central service call.

| Run type | Turns | Approximate API cost |
|---|---|---|
| Dry-run sweep (read-only) | 2-4 | $0.01 - $0.05 |
| Tier 1 work item (docs, tests) | 6-10 | $0.05 - $0.20 |
| Tier 2 work item (scripts, schemas) | 10-20 | $0.20 - $1.00 |
| Full autonomous cycle (5 items) | 40-60 | $0.50 - $2.00 |

Figures assume Claude Sonnet pricing at June 2026 rates. Haiku runs Tier 1 items
at roughly one-fifth the cost. Opus is appropriate for security-critical Tier 2
items. Match model tier to work item tier with the role and model map in
[docs/ops/runner-model-config.md](docs/ops/runner-model-config.md).

If you run modonome via the Claude Code CLI with a Claude Pro or Teams subscription
(not an API key), the cost is zero beyond your subscription. VS Code with the Claude
Code extension uses the same subscription-based billing.

## Embed it

- Reference: link to the prompt and keep your state local.
- Vendor: copy `prompts/`, `templates/`, `schemas/`, and `scripts/` into your repo and pin a
  release tag.
- Package: import the schemas and scripts, keep config and state local.

Upgrades preserve your config. New controls always arrive with safe defaults, so an update
leaves an engine disarmed unless an owner arms it. See [docs/versioning.md](docs/versioning.md).
