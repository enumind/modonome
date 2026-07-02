---
status: superseded
owner: "@nateshpp"
last_reviewed: 2026-07-01
---

# Claims audit, 2026-06-25

Superseded by [claims-audit-2026-07-01.md](claims-audit-2026-07-01.md), which re-verifies
every row against current code and closes six that had drifted stale in this file.

A claim-by-claim inventory of what Modonome's documents and website promise
versus what the code in this repository actually does. Every code verdict cites
`file:line`. Verdicts are deliberately uncharitable: a present-tense marketing
claim means "the code does this now," not "the design intends this."

This document is the phase-1 deliverable of a self-application pass. It exists so
that no promise ships without code and a test behind it. Read it as a punch list.
The guardrail layer is genuinely strong. The autonomy and learning layers are
scaffolding at v0.1-alpha, and are described here honestly.

## Verdict legend

- **DELIVERED**: code fully backs the claim; cited and (usually) tested.
- **PARTIAL**: backed in schema/validator/prompt but **not in the running loop**, or backed in part.
- **ASPIRATIONAL**: no code backs it, or code contradicts it.
- **MISLABELED**: real code, but the label or framing overstates its scope.
- **BUG**: code exists to back it but is defective.

## Scorecard at a glance

| Area | Verdict | One-line reason |
|---|---|---|
| Anti-gaming ratchet (assertion/skip/type/coverage, multi-language) | DELIVERED | Real checks, runs in CI from a base-branch copy the PR cannot touch. |
| Base-branch trust isolation (ratchet plus style linter) | DELIVERED | `ci.yml` checks out the gate scripts from `origin/base_ref` before running. |
| Off by default, arms only on `MODONOME_ARMED` | DELIVERED | `resolveArming` is a hard AND-gate; config alone cannot arm. |
| No central service, no telemetry, MIT | DELIVERED | No networked code anywhere; local-only; MIT. |
| Multi-language ratchet (JS/TS, Python, Java, .NET) | DELIVERED | Patterns plus AgentProof fixtures AP-11..16 for all four. |
| Drift guard, style check, CLI commands (dry-run/scaffold/validate/agentproof/report) | DELIVERED | All wired and runnable. |
| AgentProof harness (16 scenarios run and score) | DELIVERED | Genuinely computed, not hard-coded. |
| AgentProof **"16/16 GOVERNED"** label | MISLABELED | Self-graded linter-hardening, not governed autonomy (see AgentProof section). |
| Maker, checker, merge authority distinct | PARTIAL | Enforced in `validate-work-item.mjs` only; never invoked by CI or the live loop. |
| "Small, test-fenced changes" / "writes test-backed PRs" | PARTIAL | `max_diff_lines` and the "test fence" are config plus prompt, enforced by no code. |
| Protected-paths routing to CODEOWNERS | PARTIAL | Real CODEOWNERS plus a self-declared boolean; no diff-path classifier. |
| CI runs "the config and packet validators" | PARTIAL | Only drift/style/ratchet/AgentProof run in `ci.yml`; three named validators do not. |
| Metrics, `report`, "Est. hours saved", "Merges landed" | BUG plus ASPIRATIONAL | Synthetic demo data **and** a field-name mismatch that reads it as all zeros. |
| "Improves as it goes" staged-lesson learning loop | ASPIRATIONAL | Hand-edited markdown; promotion and traceability scripts do not exist. |
| Market-researcher role | ASPIRATIONAL | Prompt-described role with zero implementing code. |
| Cross-repo knowledge network ("128 patterns shared", armed repos) | ASPIRATIONAL | Transport/poll/verify scripts plus workflow all missing; mesh UI is synthetic. |
| Enterprise multi-stack (mainframe/SAP/Oracle/Salesforce/ServiceNow/RPA/BI) | ASPIRATIONAL | Detection caps at Node/Py/Java/Go/.NET/Terraform; 7 of 10 estates have no code. |
| Security controls (trusted-author from metadata, outbound allowlist, secrets out of context) | ASPIRATIONAL | Prompt rules, not enforced code; relies on the LLM obeying `prompts/`. |
| Conformance "Level 3" self-assessment | ASPIRATIONAL | Learning pipeline doc-only plus 4th ladder rung has no code; Level 2 is the honest ceiling. |

## The single most important fact

**There is no autonomous engine in this repository.** `bin/` and `scripts/` are a
prompt-bundler plus a set of validators and linters. Nothing reads issues or PRs,
opens PRs, merges, or makes outbound calls. The "autonomous engineer" the website
sells is whatever external LLM harness loads `prompts/` and
`.github/workflows/modonome-auto.yml` (a single Claude CLI session).
Consequently most of the OWASP/NIST/EU-AI-Act controls in `COMPLIANCE.md`,
`SECURITY.md`, and `EU-AI-ACT-CLASSIFICATION.md` map to **prompt instructions and
config fields, not enforced code**.

So Modonome today is two products under one set of copy:

- **Product 1, the guardrail toolkit**: a dependency-free, CI-wired,
  base-branch-isolated anti-gaming ratchet plus validators plus a conformance
  harness. This is real, rigorous, and better than most. Ship and sell this.
- **Product 2, the autonomous engineer that writes, checks, merges, and learns**:
  scaffolding (schema fields plus prompts) at v0.1-alpha, switched off on its own
  repo, never exercised. The site leads with this. It needs to move to a
  clearly-labeled roadmap until code plus tests back each piece.

## Confirmed code defects (fix regardless of marketing decisions)

1. **~~`report` activity counters never increment.~~** **CLOSED 2026-06-27.**
   Re-verified against current source: `scripts/report.mjs` reads `e.event` and
   `.modonome/metrics.example.jsonl` uses `"event"` as the field name throughout.
   The original audit claim ("the file uses `"type"`") did not match the actual
   file contents at the time of this review. No code change required.

2. **~~`.modonome/metrics.jsonl` is synthetic demo data.~~** **CLOSED 2026-06-27.**
   File is already named `.modonome/metrics.example.jsonl`. No production path
   in `bin/` or `scripts/` writes to a non-example filename. Correctly labeled.

3. **~~`bin/` is protected by CODEOWNERS but not by the config lever.~~**
   **CLOSED 2026-06-27.** Re-verified: `.modonome/config.yaml` line 26
   `protected_paths_extra` already includes `bin/`. The two surfaces are
   consistent. No change required. Additionally, `.github/CODEOWNERS` has been
   created in this release (previously missing entirely), so the CODEOWNERS
   coverage referenced in this defect now exists.

## Self-application findings (verified firsthand against GitHub)

The README's sharpest promise is that Modonome "proves in CI that it cannot merge
low-quality work." This repo is the counter-evidence:

- **`main` is unprotected** (`"protected": false`). There is no
  required-status-check gate, so anything can land on `main` regardless of CI.
- **Six consecutive pushes to `main` completed `failure` and merged anyway**
  (CI runs 30, 31, 32, 34, 35, 36; commits `ce94887` through `c7016f5`). Only the
  last two runs (38, 39) are green.
- **About 30 stale branches** exist, many already self-labeled
  `Safe-To-Delete/*`, the exact "loose-end creep" the repo-hygiene check is meant
  to prevent.

There is an ADR titled self-application-conformance (ADR-025), and the repo is not
yet living it. This is the precise gap between the pitch and the state.

## AgentProof, what "16/16 GOVERNED" actually certifies

`agentproof/runner.mjs` spawns each `scenarios/ap-*.mjs` and scores pass/fail on
exit code. Each scenario `spawnSync`s one of Modonome's **own** scripts
(`guard-ratchet.mjs`, `validate-config.mjs`, `validate-work-item.mjs`,
`validate-knowledge-packet.mjs`, `check-drift.mjs`) against a **static fixture**
in `agentproof/fixtures/`. It is self-graded: the same author owns the controls,
the attack inputs, and the pass criteria.

- 12 of 16 (AP-01..04, 11..16) feed a pre-written patch to the ratchet and assert
  exit code. AP-05..10 feed fixtures to the config/work-item/packet validators and
  the drift guard. AP-15 feeds "SYSTEM OVERRIDE" prose and asserts the ratchet
  exits `0`, a circular "jailbreak proof" that the regex ignores text it was never
  built to read.
- **None of the 16 exercises an actual autonomous agent.** The suite measures
  gate-integrity hardening (can these specific diffs trick the linter?), not
  governed autonomy (can a live agent exceed caps, merge a protected path, or
  exfiltrate?).

**Verdict:** the harness and the controls it exercises are real (DELIVERED). The
**"GOVERNED"** label, the "adversarial benchmark for autonomous agent governance"
framing, and the standards-body solicitation overstate scope. Honest label:
**"16/16 HARDENED"** (gate integrity), with autonomy governance called out as
roadmap.

## Remediation map

Each gap maps to the action that closes it. Sequenced: truth first (fast, removes
the embarrassment surface), then self-application, then code-to-claims.

| Gap | Action | Phase | Status |
|---|---|---|---|
| `report`/metrics field mismatch (defect 1) | Fix `report.mjs` to read `type`, or migrate the schema; add a `report` test on real data. | now | **CLOSED 2026-06-27**:  verified: code reads `e.event`; `metrics.example.jsonl` uses `"event"` field. No mismatch exists in current code. Audit statement was based on a stale read. |
| Synthetic metrics presented as telemetry (defect 2) | Rename to `.modonome/metrics.example.jsonl`; have the loop write real metrics or remove the claim. | now | **CLOSED 2026-06-27**:  file is: `.modonome/metrics.example.jsonl`; no code in `bin/` or `scripts/` writes to a non-example path. |
| `bin/` protection mismatch (defect 3) | Add `bin/` to `protected_paths_extra`. | now | **CLOSED 2026-06-27**:  verified: `.modonome/config.yaml` line 26 already includes `bin/` in `protected_paths_extra`. No change needed. |
| "16/16 GOVERNED" label | Rename to "16/16 HARDENED"; scope copy to gate integrity; move autonomy-governance scenarios to roadmap. | truth | OPEN: copy update pending |
| Learning loop, market-researcher, knowledge-network, multi-stack, "writes PRs" present tense | Move to an explicitly-labeled roadmap section; remove synthetic mesh counters and the "COBOL armed" card. | truth | OPEN |
| Security/compliance controls described as code | Relabel honestly as "prompt-enforced" versus "code-enforced" in SECURITY/COMPLIANCE. | truth | OPEN |
| `main` unprotected, red merged | Enable branch protection plus required checks (`verify`, `ratchet`, `AgentProof`); add a self-application conformance script that fails CI if protection regresses. | self-application | **PARTIAL 2026-06-27**:  `.github/CODEOWNERS` created (PR #claude/modonome-release-blockers-48omcw); branch protection settings must be enabled in GitHub repo Settings by maintainer. |
| Stale branches | Prune `Safe-To-Delete/*` and merged branches. | self-application | OPEN |
| Maker and checker not distinct in the loop | Implement a two-session maker/checker in `modonome-auto.yml`; write real `maker_id`/`checker_id` provenance; invoke `validate-work-item.mjs` in CI. | build | OPEN |
| ADR-022/024/025/026 scripts missing | Implement `audit-learnings.mjs`, `check-learning-traceability.mjs`, `check-promotion-readiness.mjs`, the anti-rubber-stamp check, and `RELEASE-EVIDENCE.md`, or downgrade the ADRs to Proposed. | build | OPEN |
| Cross-repo network path missing | Mark ADRs 014 through 019 as roadmap; do not describe unbuilt scripts as runtime invariants in ARCHITECTURE.md. | build | OPEN |
| Level 3 conformance overstated | Downgrade self-assessment to Level 2 until the learning pipeline and 4th ladder rung have code. | truth | OPEN |

## Source ledgers

This consolidates three independent skeptical audits run on 2026-06-25 against
README plus `site/`, the spec and governance docs plus `docs/`, and the
enterprise and compliance docs plus `agentproof/`. Each required `file:line`
citation and an uncharitable verdict.
