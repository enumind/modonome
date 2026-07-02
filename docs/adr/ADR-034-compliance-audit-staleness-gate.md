# ADR-034: Compliance and audit doc staleness gate

Status: Accepted

## Context

`docs/compliance/` and `docs/audits/` are the repository's externally-facing trust
surface: OWASP/NIST/EU-AI-Act control mappings and the internal claims-vs-code audits
that back them. `docs/audits/claims-audit-2026-06-25.md` went stale in exactly the way
these documents are supposed to prevent elsewhere: six of its rows described code that
had since changed, and nothing caught it until a manual re-audit found the drift six
days later (`docs/audits/claims-audit-2026-07-01.md`).

`docs/guidelines/markdown-governance.md` (ADR-031) already defines `last_reviewed`
front-matter and states that advisory checks are "promoted to blocking once the
back-catalog is migrated." Front-matter coverage across all of `docs/` is far from
migrated (1 of 23 sampled non-ADR docs carried it before this change), so blocking on
presence everywhere would fail nearly the entire tree. But `docs/compliance/` and
`docs/audits/` together are five files, a genuinely small and tractable set.

## Options considered

**A. Leave front-matter and staleness advisory everywhere, including these five files.**
Consistent with the migration-in-progress state of the rest of `docs/`, but this is the
status quo that let the claims audit go stale silently. Rejected: the whole point is to
convert this specific, high-stakes gap into a machine check.

**B. Block on `last_reviewed` presence and a fixed commit-count threshold, identically,
across both `docs/compliance/` and `docs/audits/`.** Simple, one rule. Rejected after
testing it against this repo's own history: `docs/audits/` files cite the most
actively-changing code by design (that is what an audit is for), so a commit-threshold
check flagged this PR's own audit as stale within the same day it was written. A
mechanism that fires immediately on every audit is not a staleness signal, it is noise.

**C. (Chosen) Block on `last_reviewed` presence in both directories, but apply the
commit-count staleness threshold to `docs/compliance/` only.** `docs/compliance/` makes
an ongoing claim ("this is how the system behaves now") that should track code changes
to the paths it cites, and a 15-commit threshold is well-calibrated there (13 commits
touched its actual cited paths across this repository's full history at time of
writing). `docs/audits/` files are point-in-time snapshots by construction: already
dated in their filename, already chained by `supersedes` front-matter to whatever they
replace. Their staleness signal is "has a newer dated audit superseded this one," which
the naming convention and the `supersedes` field already carry; a docs/audits/ file
still must have well-formed `last_reviewed` front-matter, it is just exempt from the
commit-count comparison.

## Decision

Implemented in `scripts/check-md-governance.mjs`:

1. `docs/compliance/*.md` and `docs/audits/*.md` both require `last_reviewed`
   front-matter as a `YYYY-MM-DD` date. Missing or malformed is a blocking violation in
   either directory.
2. Only `docs/compliance/*.md` is additionally checked against a commit-count
   threshold: if more than 15 commits have touched the paths a doc cites in backticks
   since its `last_reviewed` date, that is a blocking violation.
3. `docs/audits/*.md` is exempt from step 2. A doc with `status: superseded` or
   `status: deprecated` in either directory is exempt from step 2 regardless of
   directory, since it is frozen history, not a live claim.
4. The commit comparison pins the since-date to midnight (`YYYY-MM-DD 00:00:00`) rather
   than passing a bare date to `git log --since`, because git's parser resolves a bare
   date that equals the current calendar day using the current wall-clock time, not
   midnight, which would make a same-day review silently invisible to the check.

## Consequences

- The five files in scope were backfilled with front-matter as part of landing this
  ADR, so the gate is live from day one rather than starting as dead code.
- A future audit type that is genuinely a living document rather than a point-in-time
  snapshot should not be placed under `docs/audits/` naming, or it will silently skip
  the commit-threshold check this ADR intends for ongoing claims.
- The 15-commit threshold is calibrated against this repository's history at the time
  of writing and may need revisiting as commit velocity changes; it is a named
  constant (`STALENESS_COMMIT_THRESHOLD`) in one place, not scattered.
