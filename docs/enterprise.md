# Enterprise estates

Enterprise software rarely lives in one clean Git repo. Modonome treats the adoption target
as the system-of-change boundary: the place where source, configuration, metadata, tests,
release evidence, and approvals are controlled. Sometimes that is GitHub. Sometimes it is a
mainframe SCM, a package-platform transport stream, an ALM workspace, or a metadata export
mirrored into a review repo.

## Adoption surfaces

**Shipped in v0.1-alpha:**

| Estate | Adoption surface | Today |
| --- | --- | --- |
| Product app repo | Git files, CI, tests, issues, code owners | Dry-run map, test hardening, small modernization PRs |
| Monorepo | Package graph, owners, affected-test tooling | Bounded packets per package or capability |
| Microservice estate | Service catalog, API contracts, deploy metadata | Cross-service debt themes and contract-test gaps |

**Planned for Milestone 4 (Enterprise estate adapters):**

| Estate | Adoption surface | Designed to support |
| --- | --- | --- |
| Mainframe | COBOL, JCL, copybooks, schedules, exported SCM metadata | Read-only modernization map, job-flow evidence |
| SAP | ABAP, CDS, transports, extensions, change documents | Transport-aware proposals, evidence gaps |
| Oracle | PL/SQL, forms, reports, EBS or Fusion extensions | Dependency and release-evidence mapping |
| Salesforce | Metadata, Apex, flows, profiles, deploy pipeline | Metadata diff review, test coverage gaps |
| ServiceNow | Scoped apps, update sets, flows, scripts, ACLs | Update-set evidence, ACL risk review |
| Low-code or RPA | Exported metadata, bot scripts, run history | Fragile workflow detection, owner-gated proposals |
| Data or BI | SQL, dbt, notebooks, lineage, scheduler config | Lineage-backed quality gates, migration sequencing |

## Mirror mode (roadmap, not shipped)

When the platform has no ordinary Git change flow, Modonome is designed to support mirror mode: read exports, build an adoption map, identify modernization work, and produce owner-reviewable proposals. Direct write-back into a proprietary platform requires platform-specific gates, test evidence, rollback evidence, and owner approval. Until then, Modonome files proposals, produces packets, updates local state, and leaves deployment to the platform's release process. This capability is planned for Milestone 4.

## Cross-repo learning (roadmap, not shipped)

Modonome is designed to support a cross-repo knowledge network where repos can share minimized, classified, provenance-backed knowledge packets. When shipped in Milestone 2, the network will be advisory and off by default. A pattern learned in one repo will be a candidate elsewhere until the local repo validates it through its own gates and owners. There is no central authority that can merge, arm, or override a repo. Design details are in the network module in the prompt and `schemas/knowledge-packet.schema.json`.

## Org-level provisioning and multi-repo posture

Two host-only tools help a team adopt Modonome Guard across many repositories.
Both run against infrastructure you already control. Modonome ships the code, runs
neither of them, and receives nothing back.

- **Terraform module (`terraform/`, [ADR-043](adr/ADR-043-terraform-module.md)).**
  Provisions, per repository, a branch ruleset requiring the `gate-integrity`
  status check and a `.github/CODEOWNERS` file over the governance paths. You apply
  it against your own organization with your own credentials. It never sets
  `MODONOME_ARMED`: arming stays an operator's out-of-band act, so the module only
  surfaces the `gh secret set` command as an output. See
  [terraform/README.md](../terraform/README.md).
- **Fleet Ledger (`scripts/fleet-ledger.mjs`).** Renders a static HTML posture
  table over a directory of already-collected `policy-attestation.json` files
  (ADR-036): one row per repo with its armed/dry-run/disarmed posture,
  capabilities, and content digest. It clones nothing and reaches no network;
  collecting the files is your job. Output is deterministic so two runs over the
  same input match byte for byte.

Two further connectors are consciously deferred, not dropped: an Azure DevOps
pipeline task wrapping `scripts/guard-ratchet.mjs` the same zero-dependency way
`action.yml` wraps it for GitHub Actions, and a Backstage card reading the same
`policy-attestation.json` Fleet Ledger reads. Neither has code yet.

## Support

Modonome is MIT-licensed and free to use. For deployment questions, open an issue or start
a discussion on the [GitHub repository](https://github.com/enumind/modonome).
