# ADR-031: Markdown governance

Status: Accepted

## Context

The repository accumulated 17 Markdown files at the root and 94 in total. Documentation
was scattered: date-stamped audits sat loose beside ADRs, specifications mixed with
compliance docs, and pre-decision research ADRs reused numbers already taken by accepted
ADRs (`ADR-027` through `ADR-030` existed in both `docs/adr/` and `docs/research/`).

Because Modonome agents generate documentation continuously, a one-time tidy is not
enough. Without an enforced policy, sprawl and incoherence return. Three failure modes
matter most:

1. Root noise that hurts first-visit discoverability.
2. Duplicate or contradictory documents with no single source of truth.
3. Moves that silently break hardcoded script paths or learning traceability.

## Decision

Adopt the policy in [docs/guidelines/markdown-governance.md](../guidelines/markdown-governance.md)
and enforce its objective rules in CI via `scripts/check-md-governance.mjs`.

Key points:

- A fixed root allow-list. High-traffic docs (`QUICKSTART.md`, `ADOPTION-GUIDE.md`,
  `ARCHITECTURE.md`, `ROADMAP.md`, `GOVERNANCE.md`) stay at root for discoverability and to
  avoid external link rot. Internal specifications, compliance, audits, and enterprise docs
  move under `docs/`.
- A protected-file manifest asserts that agent-critical files exist at their declared path,
  so a future cleanup pass cannot silently relocate runtime state or script-referenced docs.
- Link integrity, ADR number uniqueness, audit naming, and canonical uniqueness are
  blocking. Front-matter, kebab-case, and index coverage are advisory during migration and
  become blocking once the back-catalog is migrated.
- Pre-decision research uses the `RD-NNN` prefix so it never collides with the accepted ADR
  sequence. The six colliding research ADRs were renumbered to `RD-027` through `RD-032`.
- Markdown deletion is deny-by-default. A grep for inbound links is unsafe because
  load-bearing files are reached only by hardcoded script paths.

## Consequences

- Contributors and agents have one predictable home for each kind of document and a fast
  local check (`node scripts/check-md-governance.mjs`).
- The single-source-of-truth rule becomes deterministic through `canonical` keys rather
  than relying on review vigilance.
- A follow-up may add a semantic coherence judge (contradiction and staleness detection
  against the canonical doc) and a generated `docs/README.md`. These are deferred so this
  change stays deterministic and low-risk.
