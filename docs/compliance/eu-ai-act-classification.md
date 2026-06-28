---
status: active
owner: "@nateshpp"
last_reviewed: 2026-06-28
canonical: [eu-ai-act-classification]
---

# EU AI Act Classification

**Date:** 2026-06-23  
**Enforcement date:** August 2, 2026  
**Status:** Owner advisory. Not a legal opinion. Consult qualified counsel for regulated deployments.

This document classifies Modonome's operating modes under the EU AI Act and identifies
obligations that may arise for operators deploying it in certain contexts.

---

## Operating Mode Summary

Modonome has four operating modes, each with a different risk profile under the EU AI Act.

| Mode | Description | Estimated classification |
|------|-------------|-------------------------|
| Disabled | Read-only. Produces adoption maps and proposals. No write action. | Likely outside scope of the AI Act (no autonomous decision-making) |
| Dry-run | Projects actions, records metrics, takes no write action. | Likely outside scope or minimal-risk |
| Shadow | Read-only comparison of projected decisions against human outcomes. | Likely outside scope or minimal-risk |
| Armed | Writes pull requests, may merge changes autonomously within caps. | Context-dependent (see analysis below) |

---

## Article 6: High-Risk Classification

The EU AI Act classifies an AI system as high-risk if it falls within Annex III. The relevant
categories for Modonome armed-mode deployments are:

**Annex III, Category 4: Critical infrastructure.**  
If Modonome armed mode is used to autonomously modify software that controls or manages
critical infrastructure (energy, water, transport, finance), this deployment may constitute
a high-risk use case.

**Annex III, Category 8: Law enforcement and administration of justice.**  
Not applicable to typical Modonome deployments.

**General-purpose AI (GPAI) provisions:**  
The underlying language model used as the Modonome harness may itself be subject to GPAI
obligations under Articles 51–55. These obligations rest with the model provider, not with
Modonome as a tool layer.

---

## Assessment by Deployment Type

| Deployment context | Classification | Obligations likely triggered |
|-------------------|---------------|------------------------------|
| Internal developer tooling (non-regulated codebase) | Minimal risk | None beyond general transparency |
| SaaS product repo (non-regulated sector) | Minimal risk | None beyond general transparency |
| Financial services software repo | Context-dependent | Human oversight obligation (Article 14); logging and audit trail |
| Healthcare software repo | Context-dependent | Human oversight obligation (Article 14); accuracy and robustness requirements (Article 15) |
| Critical infrastructure software repo | High-risk likely | Full Annex III compliance: conformity assessment, technical documentation, registration |
| Government or public administration repo | Context-dependent | Consult your data protection authority |

---

## Controls That Support Compliance

Modonome's design aligns with several EU AI Act requirements even before formal compliance
work is undertaken.

| EU AI Act requirement | Modonome control |
|----------------------|-----------------|
| Human oversight (Article 14) | Activation ladder requires principal arming. Armed mode gate checklist includes code-owner review. Protected paths always require principal approval. |
| Transparency to deployers (Article 13) | This document, GOVERNANCE.md, docs/compliance/compliance.md, and the Governed Autonomy Specification provide disclosure of capabilities, limitations, and risk controls. |
| Accuracy and robustness (Article 15) | Anti-gaming ratchet prevents gate weakening. Deterministic gates are required before any merge. |
| Record-keeping (Article 12) | Metrics JSONL records all items attempted, gates passed/failed, and merge events. Work items record maker/checker identities and gate results. |
| Incident and anomaly logging | Escalation reason recorded in work item on any gate failure or ratchet rejection. |

---

## Gaps for Regulated Deployments

The following are required for high-risk deployments and not yet fully implemented in v0.1-alpha:

| Requirement | Gap | Planned |
|------------|-----|---------|
| Cryptographically verifiable audit trail | Work items are plain files, not signed | ADR-017 (Ed25519), v0.2 |
| Conformity assessment documentation | Not yet prepared | Owner responsibility |
| EU AI Act registration (Annex III) | Not yet registered | Owner responsibility before deployment in regulated context |

---

## Recommendation for Operators

**Non-regulated deployments (typical use):** Modonome's safe defaults, activation ladder,
and owner-gated learning are sufficient. No additional EU AI Act work is required.

**Potentially regulated deployments:** Before enabling armed mode in a regulated context,
operators should:

1. Confirm whether the target codebase constitutes critical infrastructure or falls within
   another Annex III category.
2. If yes, engage qualified counsel for a conformity assessment.
3. Do not enable `autonomy_enabled` in a regulated context until the assessment is complete.

Dry-run mode is safe to use in any context while the assessment is underway. It takes no
write action and does not constitute an autonomous decision.
