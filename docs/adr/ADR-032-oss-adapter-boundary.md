# ADR-032: OSS adapter boundary

Status: Accepted

## Context

Later work in this epic adopts external open-source tools (for example model routers and
local runtimes). Pulling such a tool in as an npm runtime dependency would break the
central promise of the package: it ships with zero runtime dependencies, so an adopter
audits one supply chain, not a transitive tree. It would also drag in whatever license
that tool and its dependents carry, some of which are copyleft or source-available and
incompatible with how adopters embed the package.

The rule is "adapt, don't absorb". A reused tool is a component we call across a boundary,
never code we fold into the published surface. Without an enforced gate, a future PR could
quietly add a dependency or wire in a tool under an unacceptable license, and review
vigilance alone would not catch it.

## Decision

Adopt the boundary contract below and enforce it in CI via `scripts/check-licenses.mjs`.

- Reuse permissive OSS only at a `process`, `sidecar`, or `ci-native` boundary. A reused
  tool runs as a separate process, a co-located service, or a CI-native step. It is never
  an npm runtime dependency of the package.
- The published package keeps zero runtime dependencies. The gate fails if `package.json`
  declares a non-empty `dependencies` field. `devDependencies` stay allowed.
- Every reused component is declared in `adapters.json` with a `name`, `license`,
  `boundary`, and `version`, validated against `schemas/adapters.schema.json`.
- The license allowlist is MIT-category permissive: MIT, ISC, BSD-2-Clause, BSD-3-Clause.
  Apache-2.0 is allowed only when the adapter entry carries a truthy `adr` field pointing
  at an owner note that records the patent-clause review.
- GPL, AGPL, LGPL, BUSL, and SSPL in any version are refused. Any unlisted license is
  refused with a clear message.
- Every reused tool runs behind Modonome's own gates, arming, routing, telemetry, and
  identity rules. The tool is a component; the governance stays ours.
- The built-in zero-dependency path remains the fallback, so the package works with no
  external tool present.

## Consequences

- A deterministic local check (`node scripts/check-licenses.mjs`) blocks a runtime
  dependency or an unacceptable license before adoption, and `check-self-application.mjs`
  keeps the CI workflow honest about running it.
- Adopting a new tool becomes a reviewable manifest edit plus, for Apache-2.0, an owner
  ADR note, rather than a silent dependency addition.
- The manifest ships empty because no tool is wired yet. Each integration PR adds its
  entry when the tool actually lands, so the manifest never implies adoption ahead of the
  work.
