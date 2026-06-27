# ADR-012: Harness Prompt Integrity

**Status:** Proposed
**Date:** 2026-06-24

## Context

The harness loads `modonome.bundle.md` (or the core + modules) and passes it to the agent.
If the bundle can be modified between the CI trigger and the agent invocation -- by a
malicious PR, a compromised branch, or a supply-chain substitution -- the agent operates
under a tampered prompt with no indication that the invariants have changed.

## Decision

The following controls establish harness prompt integrity:

1. **Prompt is read from the base branch, not the PR head.** For CI jobs that run on pull
   requests, the harness reads `modonome.bundle.md` from the repository's default branch
   (or a pinned SHA), not from the PR head branch. An attacker who modifies the bundle in
   a PR cannot change the prompt the harness uses to evaluate that PR.
2. **Bundle is regenerated in CI, not committed.** `scripts/build-bundle.mjs` runs as part
   of the CI setup step and regenerates `modonome.bundle.md` from the canonical source
   files in `prompts/`. The committed bundle in the repo is a convenience artifact; the
   CI-generated bundle is what the harness uses. This means a tampered committed bundle
   does not affect CI runs.
3. **check-drift.mjs validates consistency.** The drift guard checks that the committed
   bundle matches what `build-bundle.mjs` would produce. A mismatch fails the build,
   alerting the owner that the committed bundle is stale or modified.
4. **Prompt modules in Tier 2.** All files under `prompts/` are Tier 2. Any change to a
   prompt module requires human CODEOWNERS approval and passes the full gate suite before
   merging.

## Consequences

- The harness workflow must include a `build-bundle` step before invoking the agent. The
  `.github/workflows/modonome-auto.yml` template must be updated to reflect this.
- The bundle committed to the repo is for human reference and IDE use. It is not the
  authoritative input to CI runs.
- Supply-chain attacks on prompt content require compromising either the CI runner itself
  or a CODEOWNERS-approved commit to `prompts/`, both of which are high-effort.
