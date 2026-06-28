---
status: active
owner: "@nateshpp"
last_reviewed: 2026-06-28
canonical: [markdown-governance]
---

# Markdown governance policy

Status: Accepted

This policy governs where documentation lives, how it is named, how it evolves, and how
it stays coherent. The goal is one predictable home for every kind of content, a single
source of truth per topic, and a CI gate that makes violations visible immediately.

The companion ADR is [docs/adr/ADR-031-markdown-governance.md](../adr/ADR-031-markdown-governance.md).
Enforcement lives in `scripts/check-md-governance.mjs`.

## What is machine-enforced versus reviewed

This section is deliberately honest about teeth. A rule that the script does not check
is a convention, not a guarantee.

Machine-enforced (CI fails the build):

- Root allow-list.
- Protected-file manifest (agent-critical files must exist at their declared path).
- Link integrity (every relative Markdown link resolves to a real file).
- ADR number uniqueness (no `ADR-NNN` used in both `docs/adr/` and research).
- Audit file naming pattern.
- Canonical uniqueness (no two active docs claim the same `canonical` topic key).

Advisory (CI warns, does not fail) during the migration window:

- `lowercase-kebab-case` naming inside `docs/`.
- Front-matter presence and completeness on existing docs.
- Docs index coverage (every top-level doc listed in `docs/README.md`).
- Near-duplicate titles and absolute self-links.

Advisory checks are promoted to blocking once the back-catalog is migrated. New files
should satisfy them from day one.

## Root allow-list

These Markdown files may live at the repository root. No others.

| File | Why it stays at root |
|---|---|
| `README.md` | GitHub and npm project discovery. |
| `CHANGELOG.md` | Conventional location; release tooling expects it. |
| `CONTRIBUTING.md` | GitHub surfaces it in the contribution flow. |
| `CODE_OF_CONDUCT.md` | GitHub community health file. |
| `SECURITY.md` | GitHub vulnerability-reporting flow. |
| `GOVERNANCE.md` | GitHub community profile governance surface. |
| `AGENTS.md` | AI agent discovery; read by `scripts/dry-run-sweep.mjs` at a root path. |
| `RELEASE-EVIDENCE.md` | Generated data file; written by `scripts/build-release-evidence.mjs` at a root path. |
| `QUICKSTART.md` | High-traffic first-visit doc; bookmarked and forked externally. |
| `ADOPTION-GUIDE.md` | High-traffic onboarding companion to the quickstart. |
| `ARCHITECTURE.md` | High-traffic explanation entry point. |
| `ROADMAP.md` | High-traffic public milestone doc; read by `scripts/check-repo-hygiene.mjs`. |

Any other root Markdown file fails the build. To add one, justify it here and add it to
the allow-list in `scripts/check-md-governance.mjs`.

## Where content belongs

| Content type | Location | Example |
|---|---|---|
| Quickstart, adoption, onboarding | root or `docs/` | `QUICKSTART.md`, `docs/enterprise.md` |
| Architecture and design narrative | root or `docs/` | `ARCHITECTURE.md` |
| Normative specifications | `docs/specs/` | `docs/specs/ratchet-spec.md` |
| Governance and compliance | root or `docs/compliance/` | `GOVERNANCE.md`, `docs/compliance/compliance.md` |
| Architecture Decision Records | `docs/adr/` | `docs/adr/ADR-031-markdown-governance.md` |
| Pre-decision research | `docs/research/` | `docs/research/agentic-governance-mesh/RD-027-...` |
| Audit and claims reports | `docs/audits/` | `docs/audits/claims-audit-2026-06-25.md` |
| Operational runbooks | `docs/ops/` | `docs/ops/runner-model-config.md` |
| Documentation policy | `docs/guidelines/` | `docs/guidelines/markdown-governance.md` |
| Example walkthroughs | `examples/<name>/` | `examples/demo-app/WALKTHROUGH.md` |
| Benchmark documentation | `agentproof/` | `agentproof/SPEC.md` |
| Scaffold templates | `templates/.modonome/` | `templates/.modonome/STATUS.md` |
| Prompt modules | `prompts/` | `prompts/modules/network.md` |
| Runtime state | `.modonome/` | `.modonome/STATUS.md` (never move) |

Disambiguation for the governance, compliance, and spec overlap:

- A normative rule that a conforming implementation must satisfy goes in `docs/specs/`.
- A mapping from an external control framework (OWASP, NIST, EU AI Act) to Modonome
  behavior goes in `docs/compliance/`.
- The operating contract for how the project itself is run goes in `GOVERNANCE.md`.

## Naming

Files inside `docs/` use `lowercase-kebab-case`. Exceptions: `README.md`, the
`ADR-NNN-description.md` pattern in `docs/adr/`, and the `RD-NNN-description.md` pattern in
`docs/research/`. Files in `agentproof/` and `examples/` may keep `UPPERCASE.md` where it
matches GitHub convention.

## ADR and RD lifecycle

Create an ADR when a non-trivial design choice is made with alternatives considered, when
a prior ADR is reversed, or when an external requirement is encoded. Do not create one for
cosmetic or trivial changes.

Status flow: `Proposed` then `Accepted`, then optionally `Superseded` or `Deprecated`. A
`Proposed` ADR must carry a milestone or move to `docs/research/` within 30 days.
`Superseded` entries link to the superseding ADR by number. ADRs are never deleted and
numbers are never reused.

Pre-decision exploration uses the `RD-NNN` prefix in `docs/research/` so it never collides
with the accepted ADR sequence. Promote an RD to an ADR (with a fresh, non-reused ADR
number) when the decision is actually made.

## Audit files

Audit reports live in `docs/audits/` and follow `<type>-YYYY-MM-DD.md`, for example
`docs/audits/claims-audit-2026-06-25.md`. Audit files are never deleted; they are the
compliance trail. When a newer audit supersedes an older one, add one line at the top of
the older file pointing to the newer one.

## Front-matter standard

Every doc under `docs/` should carry YAML front-matter:

```yaml
---
status: active        # active | draft | superseded | deprecated
owner: "@nateshpp"    # a CODEOWNERS handle
last_reviewed: 2026-06-28
canonical: [topic-key]  # topics this doc is the single source of truth for (optional)
supersedes: path/to/old.md   # optional
---
```

`canonical` is the coherence lever. Each topic key has exactly one active owner doc. Other
docs link to it rather than restating it. The gate fails if two active docs claim the same
key.

## Coherence rules

- Single source of truth. Each fact has one home. Cross-link to it; do not copy it.
- No duplicate documents. If two files carry the same information, merge them or delete one
  and repoint every link.
- Cross-links use repository-relative paths. Do not hardcode `https://github.com/<repo>/blob`
  links to in-repo files; they break on forks and branches.
- A `correction_signal_id` in `.modonome/LEARNINGS.md` must be a repo path that exists.
  Moving or renaming an audit file requires updating every learning that references it.

## Deletion is deny-by-default

Agents must not delete Markdown autonomously. A grep for inbound links is not sufficient:
several load-bearing files (for example `ROADMAP.md` and `RELEASE-EVIDENCE.md`) are reached
only by hardcoded script paths, not by Markdown links, and would read as orphans. Deletion
requires an owner-approved work item and a `.modonome/DECISIONS.md` entry stating which of
these is true:

1. No file links to it and no script references its path.
2. Its content is stale or fully absorbed elsewhere, with the target named.

Audit files are never deleted regardless.

## PR checklist for Markdown changes

- [ ] New file is in the correct directory per the content table.
- [ ] New file under `docs/` uses `lowercase-kebab-case` and carries front-matter.
- [ ] Moved or renamed: every inbound Markdown link is updated.
- [ ] Moved or renamed: every script that hardcodes the old path is updated.
- [ ] Moved or renamed: any `correction_signal_id` in `.modonome/LEARNINGS.md` is updated.
- [ ] Audit file moved: `RELEASE-EVIDENCE.md` regenerated with `npm run evidence`.
- [ ] Deletion: owner-approved work item plus `DECISIONS.md` entry exist.
- [ ] Root file: it is on the allow-list.
- [ ] `docs/README.md` updated if the change adds or removes a navigable entry.
- [ ] `node scripts/check-md-governance.mjs` passes locally.
