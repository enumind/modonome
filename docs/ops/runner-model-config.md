---
status: active
owner: "@nateshpp"
last_reviewed: 2026-06-28
canonical: [runner-model-config]
---

# Runner and Model Configuration (WS-H)

Each cost-bearing agent role reads its runner and model from `.modonome/config.yaml`.
The defaults keep all roles on the container runner with hosted Claude models, matching
existing CI behavior. Flip a role to the local runner or a local model endpoint to move
spend onto self-hosted hardware.

## Default assignment

| Role    | Runner    | Model              | Provider  |
| ------- | --------- | ------------------ | --------- |
| maker   | container | claude-sonnet-4-6  | anthropic |
| checker | container | claude-opus-4-8    | anthropic |
| self-govern | container | claude-haiku-4-5   | anthropic |

The `container` runner maps to GitHub-hosted `ubuntu-latest`. The `local` runner maps to
`[self-hosted, mac-mini]` labels.

## Flip a role to the Mac mini runner

Set `runner: local` under the role. The role will be scheduled on whichever runner picks up
the `[self-hosted, mac-mini]` labels:

```yaml
roles:
  maker:
    runner: local
    model: claude-sonnet-4-6
```

The `runners.local.labels` and `runners.local.cli_path` keys control the labels and the
CLI binary used on that runner.

## Flip a role to a local model

Point the role's `model` key at a `models` registry entry whose `provider` is `local`:

```yaml
roles:
  self-govern:
    runner: local
    model: local-default

models:
  local-default:
    provider: local
    base_url: http://mac-mini.local:11434
```

The `base_url` is passed to the CLI call for that role. Any model ID can be used as a
registry key; add entries as needed. The existing hosted-Claude entries remain in the
registry as references.

## Enforcement

When `require_distinct_maker_checker_model` is `true` (the default), `validate-config`
fails if `roles.maker.model` and `roles.checker.model` are the same string. This applies
whether both roles point at hosted models or local models.

Run the validator manually:

```
node scripts/validate-config.mjs .modonome/config.yaml
```

## Resolver

`scripts/agent/resolve-role.mjs` exports `resolveRole(cfg, role)` which reads the config
maps and returns `{ runner, runnerLabels, cliPath, model, modelProvider, modelBaseUrl }`.
CLI flags override the returned values in later pipeline stages (WS-B).
