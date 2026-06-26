# ADR-030: Embedding Safety Framework

Status: Accepted

## Context

Embedding Modonome in a host repo risks 7 types of conflicts. These were previously untested.

The 7 conflict types are:
1. Schema version collision in `.modonome/config.yaml`
2. CI job name conflict in `.github/workflows/`
3. Script path shadowing (host scripts with same names as Modonome scripts)
4. Prompt injection in host repo config files
5. Environment variable override attempts
6. Dependency version conflict (conflicting `package.json` entries)
7. Protected-path escalation (host files in paths Modonome treats as governed)

## Decision

A non-destructive preflight-embedding.mjs script checks all 7 conflict types before embedding.
It exits 1 on fatal conflicts, 2 on warnings, 0 when clear. CI runs this in `--target-dir .` mode
to verify the host repo remains compatible after each PR.

The script is non-destructive by design: it reads the target directory but never writes to it.
All findings are reported as structured output with severity levels (ERROR, WARN, INFO).

## Consequences

- **Positive**: Embedding safety is enforced at the CI gate, not discovered at runtime.
- **Negative**: Pre-flight adds ~1s to CI. Non-destructive by design means it cannot auto-fix;
  human review is still required for ERROR items.
