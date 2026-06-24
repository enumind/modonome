# ADR-013: Config Downgrade and State Migration

**Status:** Accepted
**Date:** 2026-06-24

## Context

As the config schema evolves, adopters may run an older scaffold version against a newer
engine prompt, or vice versa. Without a migration policy, schema drift silently breaks
validation or, worse, lets invalid config through because old fields are ignored.

## Decision

Config schema changes follow these rules:

1. **Additive changes are non-breaking.** New optional fields with defaults can be added
   to the schema without incrementing the schema major version. Existing configs validate
   against the new schema without modification.
2. **Removals and renames are breaking.** Any field removal or rename increments the
   schema `version` field. `scripts/migrate-config.mjs` must handle migration from
   `version N-1` to `version N`. Migration scripts are cumulative: `migrate-config.mjs`
   can migrate from any supported version to current.
3. **Downgrade is unsupported.** A config at version N cannot be used with an engine that
   only understands version N-1. The engine checks `config.version` at startup and refuses
   to run if the config version exceeds what the prompt declares as supported. The error
   message tells the owner to downgrade the scaffold or upgrade the engine.
4. **Arming levers are never removed.** `autonomy_enabled`, `auto_merge`, and `dry_run`
   are permanent fields. They may be renamed only with a major version bump and a
   migration script that maps the old name to the new one.
5. **State files are versioned separately.** `.modonome/STATUS.md`, `DECISIONS.md`, and
   `LEARNINGS.md` are prose files and are not schema-versioned. Work-item JSON files use
   `schema_version: 1` and follow the same additive-only policy as config; breaking
   changes require a migration pass over `.modonome/work-items/`.

## Consequences

- `validate-config.mjs` enforces the version check on every run. Stale configs fail fast
  rather than silently misbehaving.
- Adopters who pin the scaffold version and upgrade the engine prompt will see a clear
  error and a migration path rather than silent behavior changes.
- The migration script is a Tier 2 file; changes to it require CODEOWNERS approval.
