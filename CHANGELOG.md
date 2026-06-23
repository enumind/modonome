# Changelog

All notable changes to Modonome are recorded here. This project follows semantic
versioning. Any change to a default config lever requires an entry and a schema
version decision.

## 0.1.0-alpha

- First public release.
- Master prompt as a cacheable core plus on-demand modules, with a generated bundle.
- Config, work-item, adoption-map, knowledge-packet, and metrics schemas at schema_version 1.
- Enforcing scripts: build-prompt, scaffold, dry-run-sweep, guard-ratchet, validate-config,
  validate-knowledge-packet, migrate-config, check-style, check-drift.
- Two runnable examples with captured dry-run transcripts.
- Safe defaults throughout. The cross-repo network ships off and is advisory by design.
