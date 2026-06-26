# ADR-028: Portability Validation Strategy

Status: Accepted

## Context

Modonome is designed to be embedded in host repos. Without portability validation,
embedding could silently break governance controls or pollute the host repo.

## Decision

5 hostile-repo fixture scenarios validate embedding safety. A check-portability.mjs
script runs these fixtures in CI. Embedding is considered safe only when all 5 fixtures pass.

The fixtures cover:
- `schema-collision`: a host repo with a conflicting `.modonome/config.yaml` schema version
- `ci-job-conflict`: a host repo with CI job names that clash with Modonome's jobs
- `prompt-injection-host`: a host repo containing prompt injection attempts in its config files
- `shadowing-attack`: a host repo with files that shadow Modonome scripts
- `env-pollution`: a host repo with environment variables that attempt to override Modonome behavior

## Consequences

- **Positive**: Portability is verified, not assumed.
- **Negative**: 5 fixture repos add maintenance burden; fixtures must be updated when embedding interface changes.
