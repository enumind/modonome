<!-- Copyright Modonome contributors. -->
<!-- SPDX-License-Identifier: MIT -->

<!-- modonome:module gates -->
## Deterministic gates

Adopt the repo's existing gates. If none are present, propose a minimal set and ask the owner
before adding a heavy process.

Gate categories: format and lint, typecheck or compile, unit tests, integration tests,
contract or golden or eval tests, docs link and drift checks, security and dependency checks,
UI build and accessibility checks when the UI changes, and release smoke checks when
packaging changes.

Record the exact command, the result, and any skipped gate with a reason.

## Anti-gaming ratchet

Reject changes that make gates pass by weakening the gates. The ratchet ships as a script
(`scripts/guard-ratchet.mjs`) that runs in CI, outside the agent loop, so it cannot be talked
past. It is a floor, not the whole checker. A clean ratchet does not mean a change is correct.

Signals the ratchet rejects:

- fewer test assertions in changed tests without owner approval
- added `.skip`, `.only`, `xit`, `fit`, disabled suites, or narrowed test data
- weakened assertions, snapshots, goldens, eval criteria, or contract fixtures
- added broad type escapes such as `any`, unchecked casts, disabled linters, or suppressed
  compiler errors without a tracked exception
- weakened compiler strictness, coverage thresholds, required checks, or branch protection
- deleted tests, migrations, schemas, security checks, or protected docs
- hand-edited generated artifacts instead of their source
- dependency or lockfile churn unrelated to the packet

The ratchet uses only zero-false-positive checks. A gate that cries wolf trains people to
ignore it, which is worse than no gate. Anything fuzzier stays advisory for a human reviewer.

## Learning and self-improvement

The engine can learn and evolve, but never by silently rewriting its own rules.

Capture: a follower or checker captures a candidate lesson only after a real correction
signal: a gate failure, a review fix, an incident, repeated rework, a reverted merge, a false
positive or negative, a market or standards shift, or a cost anomaly. Capture runs through a
validating command, not an open-ended summary, so the store stays accurate.

Stage: add one generalized, evidence-backed, dated line to `LEARNINGS.md`. Deduplicate by
fingerprint. Cap the queue at twenty entries. When full, promote or prune. Never auto-evict.
Entries older than thirty days need a promote-or-prune review.

Promote: an owner or a designated maintainer promotes a durable lesson into the canonical repo
instructions, config, tests, or templates, then deletes the promoted entry from the queue. Add
or adjust a deterministic gate when one fits.

Prune: remove stale, low-confidence, duplicate, or superseded lessons with a note.

External trends: market and standards scans are off by default. When enabled they produce
sourced proposals, never roadmap changes. Net-new claims need owner approval.

Proposal priority score:

```text
score = safety + user_value + repo_fit + reuse + evidence - effort - blast_radius - uncertainty
```

A high score means route for review, not merge automatically.
