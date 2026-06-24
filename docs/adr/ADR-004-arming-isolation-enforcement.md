# ADR-004: Arming Isolation Enforcement

**Status:** Accepted
**Date:** 2026-06-24

## Context

README.md, SECURITY.md, and `config.yaml` all state that arming levers
(`autonomy_enabled`, `auto_merge`, `max_merges_per_day`) are "read from the environment
or CI in armed mode. A file the engine can write cannot arm it."

Pre-launch review found this is currently enforced by prompt convention, not by code.
No path in `scripts/` or `bin/` checks for a `MODONOME_ARMED` environment variable
before honoring `autonomy_enabled: true` from `config.yaml`. `autonomy_enabled` is a
valid field in `.modonome/config.yaml`, which the agent can write. An agent that ignores
the prompt instruction can arm itself on the next invocation.

The COMPLIANCE.md claim for AG04 and the SECURITY.md trust boundary claim both describe
the intended behavior accurately but overstate its current enforcement basis.

## Decision

Add runtime enforcement in `bin/modonome.mjs`:

1. Before executing any command that reads `autonomy_enabled` from config, check for
   the `MODONOME_ARMED=true` environment variable. If absent, override
   `autonomy_enabled` to `false` regardless of what `config.yaml` says, and emit a
   clear warning: `[modonome] MODONOME_ARMED not set; running in dry-run mode.`
2. Update `scripts/validate-config.mjs` to document that config file values for arming
   levers are advisory; the env var is the authoritative gate.
3. Add a test in `tests/` that invokes the CLI without `MODONOME_ARMED` set and asserts
   that `autonomy_enabled: true` in config does not arm the engine.
4. Update README.md, SECURITY.md, and GOVERNED-AUTONOMY-SPEC.md to say
   "enforced at runtime" (not "by convention" or "in the prompt").

Track as WI-005.

## Consequences

- The structural guarantee is enforced in code, not in prose alone.
- CI and harness operators who want to arm the engine must explicitly set
  `MODONOME_ARMED=true`; this is the correct forcing function for intentional arming.
- The claim in SECURITY.md accurately describes the mechanism.
- A committed attacker who can set CI environment variables could still arm the engine,
  which is the appropriate trust level (CI admin scope, not agent scope).
