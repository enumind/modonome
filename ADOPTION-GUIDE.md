# Adoption guide

This guide shows how to embed Modonome into an existing app, service, platform, or
infrastructure repo while keeping the repo's stack and governance as they are.

## Principles

1. Start read-only.
2. Adopt the host repo's instructions, CI, code owners, branch rules, package manager,
   release process, design system, scanners, secrets management, and compliance checks.
3. Scaffold only missing state files.
4. Keep every work item bounded by an edit set, a test fence, and a rollback note.
5. Keep maker, checker, and merge authority separate.
6. Treat every imported lesson as advisory until the local repo validates it.

## Install

```bash
# preview what it would do (read-only)
npx modonome dry-run .

# drop disabled, dry-run state files
npx modonome scaffold . --write

# validate the config
npx modonome validate .modonome/config.yaml
```

An adopting repo keeps state locally. Modonome begins with local state and runs without a
central service.

## The adoption pass

When you run a dry-run, Modonome reads repo instructions, detects the system-of-change
boundary, the workflow, the gates, the protected paths, and the stack, then records an
adoption map. It adopts an existing `.autonomy/` directory if you have one, otherwise it uses
`.modonome/`.

## Quick config

Three levers matter on day one. The rest have safe defaults.

```yaml
autonomy_enabled: false   # stays off until you arm through CI or env
dry_run: true             # project actions, read-only
protected_paths_extra: [] # add any path the engine should leave untouched
```

The full lever reference is `schemas/config.schema.json` and `templates/.modonome/config.yaml`.

## Stack examples

Node and TypeScript:

```yaml
gates:
  - command: pnpm typecheck
    blocking: true
  - command: pnpm test
    blocking: true
protected_paths_extra: [package.json, pnpm-lock.yaml, tsconfig.json]
```

Python:

```yaml
gates:
  - command: ruff check .
    blocking: true
  - command: pytest
    blocking: true
protected_paths_extra: [pyproject.toml, requirements.txt, alembic]
```

See `examples/node-typescript` and `examples/python-service` for working repos with captured
dry-run transcripts. For mainframe and packaged-platform estates, see
[docs/enterprise.md](docs/enterprise.md).

## Strengthening your app

The loop is steady: observe friction, define bounded work, implement locally, check
independently, run gates, record evidence, stage a lesson, and let an owner promote durable
rules. Good outcomes look like a new test after a failure is understood, a repeated review
correction promoted into a convention, or a manual release step turned into a gate.

## Strengthening Modonome

Modonome improves through recorded evidence that an owner promotes. It captures lessons only from real
correction signals, stages them in `.modonome/LEARNINGS.md`, and an owner promotes the durable
ones into docs, config, tests, or templates. Quality is measured by adoption and reduced
repeat failure.

## Arming checklist

Keep Modonome disabled until all of these hold: required CI is known and reproducible, branch
protection or equivalent exists, code-owner or owner review is honored, protected paths are
mapped, maker and checker and merger identities are distinct, caps are set, the kill switch is
visible, dry-run behavior has been reviewed, and cross-repo publishing stays off until a data
policy is approved.
