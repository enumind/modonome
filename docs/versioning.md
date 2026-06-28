---
status: active
owner: "@nateshpp"
last_reviewed: 2026-06-28
canonical: [versioning]
---

# Versioning and embedding

Modonome is built to be vendored into many repos and upgraded safely.

## Engine-owned and host-owned

- Engine-owned, overwritten on upgrade: `prompts/`, `schemas/`, `scripts/`. Treat these like
  vendored artifacts. Do not hand-edit them in a host repo.
- Host-owned, never touched on upgrade: `.modonome/config.yaml` and the state files
  (`STATUS.md`, `DECISIONS.md`, `LEARNINGS.md`, `NETWORK.md`, `control-panel.md`).
- Templates under `templates/.modonome/` are seeds. An upgrade updates the seed. A host opts
  in to seed changes through the migration, never by a silent overwrite.

## Schema version

Every config carries `schema_version`. Schemas carry it too. When the engine adds a lever, it
bumps the version and ships a migration step.

## Migration

```bash
npx modonome migrate .modonome/config.yaml
```

Migration adds any missing lever with its safe default and bumps `schema_version`. A missing
lever always migrates to the disabled, dry-run value, so an upgrade can never arm an engine.
Host overrides are preserved.

## Pinning

Reference and submodule embeddings pin a release tag. Do not track a moving branch. The
`.modonome/version` file records the engine version a host vendored from, so tooling can
detect host edits to engine-owned files and run the right migration.

## Compatibility rule

A framework update may add safer defaults and new checks. It must never silently enable
autonomy, auto-merge, network egress, or remote model spend in a host repo. Any change to a
default lever requires a changelog entry and a schema-version decision.
