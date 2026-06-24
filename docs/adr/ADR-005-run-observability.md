# ADR-005: Run Observability

**Status:** Accepted
**Date:** 2026-06-24

## Context

When a modonome invocation produces unexpected output or a governance gate fires
unexpectedly, there is no forensic trail. `.modonome/metrics.jsonl` captures aggregate
work-item event counts, but two problems make it useless for debugging:

1. The metrics schema requires field `event`. `scripts/report.mjs` reads field `type`.
   All counters in the report (gate_passed, gate_failed, merges) show zero for any
   correctly-written metrics event. Schema and code disagree on the field name.
2. Even if the field name were correct, the schema allows only `schema_version`, `ts`,
   and `event`. There is no `item_id`, no `gate_command`, no `gate_output`, no
   `duration_ms`. A team debugging a failed gate has no path to the cause.

Additionally, there is no per-run trace: no record of which files were detected, which
gates were identified, what proposals were generated, or what the exit code was.

## Decision

1. Fix the `event` vs `type` field name mismatch between the schema and report.mjs.
   Pick one and update both. Track as WI-006.
2. Add per-run structured JSON logs to `.modonome/runs/<iso-timestamp>-<command>.json`.
   Each log contains: timestamp, command, argv, target directory, detected stack,
   detected protected paths, proposed work items (dry-run mode), exit code, duration_ms.
   No source code, no secrets. Local files only. Track as WI-007.
3. Keep the last 30 run logs (auto-prune on write). No external service.
4. Add a per-item transition log (item_id, state_from, state_to, gate_command,
   gate_stdout, gate_stderr excerpt max 500 chars, duration_ms) to metrics.jsonl on
   every state transition. Track as WI-007.

## Consequences

- Teams can debug unexpected behavior without reading source code.
- The run log is the forensic trail for compliance audits in regulated environments.
- The metrics/report field name mismatch is fixed; the report shows real counts.
- Adds approximately 30 lines across the script entry points and one import.
