# Quickstart

Modonome runs beside your repo. It starts disabled and in dry-run. Every step below is safe.

## 1. See what it would do

```bash
npx modonome dry-run .
```

This reads your repo, detects the stack and gates, lists protected paths, and proposes a few
bounded pieces of work. It writes nothing.

## 2. Add local state

```bash
npx modonome scaffold .
```

This creates `.modonome/` with a config and state files, all disabled and dry-run. It never
overwrites an existing file. Add `--write` to apply, or run without it to preview.

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

Armed mode is a deliberate, owner-only step. It needs branch protection, required checks,
code-owner review, a separate merge identity, caps, and a rollback path. The arming levers
are read from your environment or CI, never from the config file. See
[GOVERNANCE.md](GOVERNANCE.md).
