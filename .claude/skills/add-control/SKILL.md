---
name: add-control
description: Add or change a configuration control (a config.yaml key) without tripping the drift guard. Covers the four synced representations, schema version rules, safe defaults, control-panel exposure, tests, and the changelog entry. Use for any change to schemas/config.schema.json or the config surface.
---

# Add a config control

A control has four representations that must stay identical, and
`npm run check:drift` fails the build when any pair disagrees. Change all four in
one commit:

1. **Schema**: `schemas/config.schema.json`. The schema is draft-07 with
   `additionalProperties: false`, so an unregistered key is a validation error, and
   the spec of record for meaning is the Configuration block in
   `prompts/modonome.core.md`.
2. **Template**: `templates/.modonome/config.yaml`, the state scaffolded into host
   repos. The value here is the shipped default.
3. **Core prompt**: the `Configuration` YAML block in `prompts/modonome.core.md`,
   with the same key, same default, and a short trailing comment when the control
   is env-gated. Rebuild the bundle afterward: `npm run build:prompt`.
4. **Migration**: `scripts/migrate-config.mjs`, so an existing host config upgrades
   cleanly (ADR-013, ADR-023).

This touches `schemas/`, `templates/`, and `prompts/`: protected paths. Claim a
work item with `touches_protected_path: true`; the PR needs CODEOWNER review.

## Rules that decide the design

- **Safe default.** New controls ship off, zero, or the restrictive value. The
  activation ladder (off, advisory, default-on) is governed by ADR-024: default-on
  requires an owner ADR with evidence from an advisory window. Wire the capability;
  do not enable it.
- **Arming semantics.** If the control can make the engine act (merge, push,
  rewrite), it reads from the environment or CI in armed mode, never from a file
  the engine can write (ADR-004). Say so in the core prompt comment, as
  `autonomy_enabled` and `auto_merge` do.
- **`schema_version`.** Bump it when a change is anything other than additive with
  a safe default, and teach `migrate-config.mjs` the upgrade. Purely additive keys
  with safe defaults keep the version, and the changelog entry says so explicitly.
- **Naming.** Follow the existing key style (`snake_case`, `require_*` for
  hard-stop booleans, `*_enabled` for capability flags, `max_*` for caps).

## Control panel exposure

Every control must be either visible in a control-panel screen or explicitly
documented as out of scope in `apps/control-panel/exposure.json`, with a sentence
saying why an operator does not tune it per session.
`node scripts/check-control-panel-coverage.mjs` fails otherwise.

If you add it to a screen, respect the per-tab coherence budgets
(`node scripts/check-control-panel-coherence.mjs`) and the panel conventions: reads
are free, writes sit behind `MODONOME_PANEL_WRITE=1`, and the Live/Demo pill stays
honest.

## Tests

- Add a case to `tests/config.test.mjs`: the new key validates, wrong types
  reject, and the default in the template matches the schema.
- `tests/config-key-parity.test.mjs` guards key parity across representations;
  run it and extend it if the control introduces a new nesting shape.
- If the control gates behavior in a script, that script's test file gets a case
  for both values.

## Changelog

Add an entry under `## Unreleased` in `CHANGELOG.md`. The house rule: any change to
a default config control requires a changelog entry and a schema version statement.
Name the key and the files in backticks, state the default and why it is safe,
state whether `schema_version` changed, and cite the governing ADR.

## Verify

```
npm run check:drift
npm run check:prompt
npm run check:control-panel
node --test tests/config.test.mjs tests/config-key-parity.test.mjs
npm run verify
```

All green, then `/preflight` for the push checklist. Never touch the values of
`autonomy_enabled` or `auto_merge` in `.modonome/config.yaml` while you are in
there; those are owner-only arming controls.
