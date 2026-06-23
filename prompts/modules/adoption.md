<!-- modonome:module adoption -->
## Adoption pass

Run this at the start of a new repo or after a major branch change. Write the result to the
status file under `state_dir`.

1. Read repo instructions: `AGENTS.md`, `CLAUDE.md`, `CODEX.md`,
   `.github/copilot-instructions.md`, `CONTRIBUTING`, `README`, and `docs`.
2. Detect the system-of-change boundary: a Git repo, a monorepo, a service catalog, a
   mainframe or packaged-platform export, a low-code workspace, an infrastructure repo, or a
   read-only mirror.
3. Detect the workflow: default branch, branch naming, pull-request rules, merge policy,
   labels, release process, and whether branch protection exists.
4. Detect the gates: package manager, build, typecheck or compile, lint, unit, integration,
   contract or golden, docs, security, and dependency commands.
5. Detect protected surfaces: code owners, CI config, tests, schemas, migrations, auth and
   secrets, generated artifacts, lockfiles, deployment config, and agent instructions.
6. Detect the stack fingerprint: languages, package managers, build systems, test layers,
   ownership model, and the areas with the most rework.
7. Detect available mechanisms: subagents, Skills, MCP tools, `gh`, `glab`, plain `git`, a
   local model gateway, CI APIs, and existing dashboards.

Adopt an existing `.autonomy` directory if the host already uses one. Otherwise use
`state_dir` (`.modonome` by default).

Record an adoption map with: source of truth, decision queue, learning queue, network state,
system-of-change class, protected paths, gates with exact commands, merge authority, UI
surface, and stack fingerprint. The adoption map follows `schemas/adoption-map.schema.json`.

When the system-of-change is a proprietary platform or mainframe, start in read-only mirror
mode. Direct write-back needs platform-specific owner approval, test evidence, rollback
evidence, and release-process alignment.

If a step is ambiguous and acting would be risky, hold and ask the owner. The default is no
action.

## Scaffold missing state only

If a required state file is missing, create the smallest generic version under `state_dir`.
Do not modify `.github`, code owners, lockfiles, or repo-level agent instructions without
explicit owner approval.

Minimum scaffold:

```text
.modonome/
  config.yaml
  STATUS.md
  DECISIONS.md
  LEARNINGS.md
  NETWORK.md
  control-panel.md
  version
```

`STATUS.md` holds the durable hand-off:

```markdown
# Modonome status

Last updated: YYYY-MM-DD

## Resume here
- Current mode: disabled / dry-run / shadow / armed
- Current branch:
- Latest gates:
- Active item:
- Next safe action:

## Done
## In progress
## Blocked
```

`DECISIONS.md` holds owner-gated questions, each defaulting to hold when unanswered.

`LEARNINGS.md` is the staged, bounded, owner-promoted queue described in `gates.md`.

`NETWORK.md` is optional and disabled by default. See `network.md`.
