# Modonome documentation

Navigation index for the `docs/` tree. Root-level docs (`README.md`, `QUICKSTART.md`,
`ADOPTION-GUIDE.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `GOVERNANCE.md`, `SECURITY.md`,
`CONTRIBUTING.md`) stay at the repository root for discoverability. See
[guidelines/markdown-governance.md](guidelines/markdown-governance.md) for the policy that
governs where docs live.

## Specifications

- [specs/governed-autonomy-spec.md](specs/governed-autonomy-spec.md): the normative spec.
- [specs/ratchet-spec.md](specs/ratchet-spec.md): the anti-gaming ratchet spec.
- [knowledge-network-architecture.md](knowledge-network-architecture.md): knowledge network design.

## Governance and compliance

- [compliance/compliance.md](compliance/compliance.md): OWASP, NIST, and EU AI Act control mapping.
- [compliance/openssf-badge-evidence.md](compliance/openssf-badge-evidence.md): OpenSSF Best Practices criteria mapped to artifacts, with a gap ledger.
- [compliance/eu-ai-act-classification.md](compliance/eu-ai-act-classification.md): EU AI Act risk classification.
- [guidelines/markdown-governance.md](guidelines/markdown-governance.md): documentation structure policy.
- [LEXICON.md](LEXICON.md): the one preferred term per concept, enforced in CI by `scripts/check-style.mjs`.

## Enterprise

- [enterprise.md](enterprise.md): enterprise adoption design.

## Autonomy

- [autonomy-plan.md](autonomy-plan.md): the session-independent plan for governed autonomy
  on free models, paired with the WI-026 through WI-040 work-item queue.

## Versioning and operations

- [versioning.md](versioning.md): embedding and upgrade contract.
- [vscode-workflow.md](vscode-workflow.md): VS Code manual trigger workflow.
- [control-panel-modes.md](control-panel-modes.md): the control panel's modes and permission
  model. What host and self-governance mode each let you do, and why self-governance writes
  are reserved to code owners.
- [ops/runner-model-config.md](ops/runner-model-config.md): runner model configuration.
- [ops/merge-governance-setup.md](ops/merge-governance-setup.md): merge governance setup.

## Architecture Decision Records

- [adr/](adr/): the ADRs covering the major design decisions, mostly the cross-repo
  knowledge network series. The markdown governance decision is
  [adr/ADR-031-markdown-governance.md](adr/ADR-031-markdown-governance.md).
  The repo snapshot decision is [adr/ADR-033-repo-snapshot.md](adr/ADR-033-repo-snapshot.md).
  The end-to-end governed operating model (many producers, two checkpoints, common CI) is
  [adr/ADR-040-end-to-end-operating-model.md](adr/ADR-040-end-to-end-operating-model.md).

## Audits

- [audits/claims-audit-2026-07-01.md](audits/claims-audit-2026-07-01.md): claims audit,
  2026-07-01. Supersedes the 2026-06-25 audit below.
- [audits/claims-audit-2026-06-25.md](audits/claims-audit-2026-06-25.md): claims audit, 2026-06-25.

## Research

- [research/README.md](research/README.md): pre-decision research, including the agentic
  governance mesh (RD-027 through RD-032).
