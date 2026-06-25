# ADR-023: Config Schema Migration Contract

**Status:** Accepted  
**Date:** 2026-06-25  
**Milestone:** 6 (Self-governance hardening)

## Context

The config schema (schemas/config-schema.json) is the source of truth for configuration
levers. When a new lever is added or an existing one changes structure (e.g., `max_open_prs`
changes from number to an object with `soft_limit` and `hard_limit`), existing repositories
must migrate their `.modonome/config.yaml` files.

Today, config migrations are implicit. A repo that hasn't been touched in 6 months has an
old config; when the owner updates Modonome, the prompt may read the config and find missing
or obsolete keys. The behavior is undefined (fallback to defaults, error, silent misbehavior).

Schema evolution without a migration contract is a source of silent drift and bugs.

## Decision

1. **Define the contract:**
   - A `schema_version` field in `config.yaml` pins the version the config was written for.
   - Every bump to `schema_version` in `schemas/config-schema.json` requires a corresponding
     migration function in `scripts/migrate-config.mjs`.
   - The migration function takes a config dict and returns a dict conforming to the new
     schema, or throws with a clear error if migration is impossible (e.g., a lever was removed
     with no replacement).

2. **Implement `scripts/migrate-config.mjs`** with:
   - A function per version transition (e.g., `migrate_1_to_2`, `migrate_2_to_3`)
   - Each function is composable; `migrate_3_from_0` calls `migrate_0_to_1`, then
     `migrate_1_to_2`, then `migrate_2_to_3`.
   - Clear comments on why the change was made (link to ADR).
   - Rollback instructions if migration fails.

3. **CI gate `check-schema-migration.mjs`:**
   - On every `schemas/config-schema.json` change that bumps `schema_version`, fail the build
     unless `scripts/migrate-config.mjs` has a migration function for the new version.
   - Run a backward-compatibility fixture that applies an old config through all migrations
     and verifies the result conforms to the new schema.
   - This gate is Tier 2 (requires CODEOWNERS approval).

4. **On adoption and upgrade:**
   - The adoption pass runs `migrate-config.mjs` automatically.
   - The engine checks `config.yaml:schema_version` on every turn and auto-migrates if needed.
   - A log message documents each migration applied.

## Consequences

- Config schema changes are deliberate and documented.
- Repos never have "orphaned" config; they're migrated on first run.
- Breaking changes are caught in CI before merge.
- Migration failures are explicit, not silent.

## Related

- schemas/config-schema.json: the canonical lever set.
- ADR-024 (Capability Promotion Gate): leverages this to gate new feature flags.
