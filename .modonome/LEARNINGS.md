# Learnings, staged candidate conventions

Binding rules live in the repo's canonical instructions. This file is a short queue
of candidate lessons captured from real correction signals, plus a machine-readable
record of lessons that have been promoted into a deterministic gate.

Rules:
- Capture only on a gate failure, a review fix, a production incident, or repeated rework.
- One line per lesson, generalized, dated, and evidence-backed.
- Cap at 20 staged entries. When full, promote or prune. Never auto-evict.
- Entries older than 30 days need a promote-or-prune review.
- A lesson becomes binding only when an owner promotes it into a deterministic gate and
  records it in the Promoted block below.

Staged format:
- [YYYY-MM-DD] (signal: gate|review|incident|rework) lesson - evidence: ref

## Staged

- [2026-06-28] (signal: gate) Generated/vendored browser files with intentional eval-like patterns need both `//! nosemgrep:` and `// lgtm[...]` annotations so CodeQL and semgrep agree on the deliberate exception. The CSP `unsafe-eval` allowance in `site/_headers` is the canonical evidence record. - evidence: CodeQL js/eval-call alert on site/support.js; nosemgrep was present but lgtm was absent.

## Promoted

Promoted learnings carry full traceability so an auditor can trace any rule back to the
correction signal that produced it. The block below is validated in CI by
`scripts/check-learning-traceability.mjs` and is queryable with
`scripts/audit-learnings.mjs <gate-substring>`.

```json
[
  {
    "id": "L-001",
    "lesson": "Shipped sample telemetry must conform to its schema and must never be presented as real measured data.",
    "correction_signal_id": "docs/audits/claims-audit-2026-06-25.md",
    "observation_date": "2026-06-25",
    "promotion_date": "2026-06-25",
    "evidence_summary": "Audit found .modonome/metrics.jsonl used non-schema fields (type, id) and carried synthetic merge events presented as telemetry.",
    "gate_added": "Self-application metrics conformance check plus schema-conformance test",
    "gate_location": "scripts/check-self-application.mjs"
  },
  {
    "id": "L-002",
    "lesson": "Every path named in CODEOWNERS must also appear in protected_paths_extra, so protection is real rather than nominal.",
    "correction_signal_id": "docs/audits/claims-audit-2026-06-25.md",
    "observation_date": "2026-06-25",
    "promotion_date": "2026-06-25",
    "evidence_summary": "bin/ was protected by CODEOWNERS but missing from protected_paths_extra in config.",
    "gate_added": "CODEOWNERS versus protected_paths_extra agreement check",
    "gate_location": "scripts/check-self-application.mjs"
  },
  {
    "id": "L-003",
    "lesson": "Use crypto.randomBytes() or crypto.randomUUID() for all entropy-requiring values in server-side scripts. Math.random() is not cryptographically secure and triggers CodeQL js/insecure-randomness.",
    "correction_signal_id": ".github/workflows/codeql.yml",
    "observation_date": "2026-06-28",
    "promotion_date": "2026-06-28",
    "evidence_summary": "CodeQL flagged three Math.random() calls in scripts/mcp-server.mjs used for temp file name generation. Fixed with crypto.randomBytes(8).toString(\"hex\"); regression gate added to check-repo-hygiene.mjs.",
    "gate_added": "Scan of scripts/*.mjs for Math.random() usage; exits 1 if found",
    "gate_location": "scripts/check-repo-hygiene.mjs"
  }
]
```
