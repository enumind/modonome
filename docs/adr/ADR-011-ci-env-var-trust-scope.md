# ADR-011: CI Environment Variable Trust Scope

**Status:** Accepted
**Date:** 2026-06-24

## Context

The GitHub Actions harness passes `ANTHROPIC_API_KEY` and `MODONOME_ARMED` as environment
variables. Additional secrets (PATs, deployment keys) may also be present in CI. Without
an explicit trust-scope definition, a compromised harness prompt or injected tool call
could read or exfiltrate arbitrary CI secrets.

## Decision

CI environment variable trust scope is bounded as follows:

1. **Minimum secrets.** The harness injects only the secrets the agent actually needs:
   `ANTHROPIC_API_KEY` (for the LLM call) and `MODONOME_ARMED` (for arming check). No
   other secrets are injected into the agent process environment unless explicitly listed
   in the harness configuration (a Tier 2 file).
2. **No secret echo.** The harness workflow must not echo secrets to stdout or write them
   to files accessible to the agent. GitHub Actions masks secret values in logs; this
   masking must not be disabled.
3. **MODONOME_ARMED is boolean.** The arming variable carries no additional payload. The
   harness sets it to the literal string `"true"` or does not set it. Scripts that read
   it must treat any value other than `"true"` as unarmed.
4. **Secrets are not passed through the prompt.** The harness prompt (the text passed to
   `claude --print`) must not contain the values of any secrets. If the agent needs to
   perform an authenticated action, the harness injects the credential into the process
   environment and the agent calls the tool that reads it from the environment.
5. **Least-privilege PAT.** If a GitHub PAT is needed (for PR creation or branch push),
   it is scoped to `contents:write` and `pull_requests:write` on the target repo only.
   It is not a personal access token with org-wide scope.

## Consequences

- The modonome-auto.yml workflow requires two secrets: `ANTHROPIC_API_KEY` and
  `MODONOME_ARMED`. Any addition to this list is a Tier 2 change.
- Adopters who copy the harness template must not add broad-scope secrets without updating
  their threat model.
- This ADR does not prevent the agent from reading non-secret env vars (e.g. `CI=true`,
  `GITHUB_SHA`), which carry no credentials.
