# Schema Collision Fixture

This repo simulates a host that already has a `.modonome/config.yaml` before Modonome
is embedded. The existing config uses `schema_version: 99`, which is incompatible with
Modonome's expected `schema_version: 1`.

Threat: Modonome silently reads the host's config and operates with wrong settings,
or the host's config overwrites Modonome's during a scaffold step.

Expected preflight behavior: FAIL (schema_version mismatch detected).
