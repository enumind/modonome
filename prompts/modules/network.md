<!-- Copyright Modonome contributors. -->
<!-- SPDX-License-Identifier: MIT -->

<!-- modonome:module network -->
## Cross-repo knowledge network

Load this module only when `repo_network_enabled` is set. Cross-repo autonomy is a
higher-risk capability than single-repo autonomy. The default is off and dry-run. The network
helps local repos by sharing evidence, patterns, and operating knowledge. It never becomes a
central authority. A central ranking or routing catalog is out of scope for version 1.

Principles:

- Repo sovereignty: each repo's owners, instructions, gates, protected paths, data policy,
  and merge authority stay final.
- Stack independence: normalize knowledge by intent, evidence, risk, and interface contract,
  not by framework or language.
- Minimum disclosure: share the smallest useful abstraction. Prefer hashes, taxonomies,
  metrics, capability names, and generalized lessons over files, code, logs, or identifiers.
- Evidence over narrative: every imported pattern carries source type, confidence, age,
  validation status, and local applicability notes.
- Verified reuse over publication volume: reward local adoption with passing gates and
  independent checks, not the act of publishing.
- Owner-gated propagation: a lesson learned in one repo is advisory elsewhere until local
  checks and owners promote it.

Knowledge packet (see `schemas/knowledge-packet.schema.json`):

```yaml
id:
source_repo_alias:                 # hashed by default
source_stack_fingerprint:
published_at:
signal: gate | review | incident | rework | modernization | security | cost | market
classification: public | internal | confidential | restricted   # defaults to restricted
redaction_status: redacted | synthetic | aggregate | blocked
topic:
application_capability:
modernization_axis: test_coverage | dependency_upgrade | api_contract | data_model | runtime | security | observability | ux | release_flow | decommissioning
problem_pattern:
pattern:
evidence:
  - type:
    ref:
    confidence:
validation:
  commands:
    - command:
      result:
      run_id:
  checker:
    id:
    independent: true
  anti_gaming_result:
lineage:
  parent_packet_ids: []
  supersedes_packet_ids: []
  adoption_refs: []
affected_capabilities: []
risks: []
measured_impact:
  before:
  after:
local_validation_required: true
owner_decision_required: true
expires_at:
```

Publishing rule: a packet is written only after `scripts/validate-knowledge-packet.mjs`
passes. That script scans for secrets, personal data, internal hostnames, code blocks, and
identifier formats and blocks the publish when it finds them. Classification defaults to
restricted when unset. The source repo alias is hashed and run identifiers are stripped unless
an owner approves otherwise.

Import rule: imported packets are advisory. A packet becomes adopted only after the local repo
records its own gates, an independent checker, an owner decision when required, and a measured
impact.

Prohibited: sharing raw source, secrets, customer data, or private identifiers without owner
approval; applying another repo's convention as a binding rule; opening, approving, merging,
or closing work across repos from a central authority; accepting self-reported quality as
sufficient evidence; ranking teams or individuals.

Enabling network behavior, changing packet policy, adding a catalog, or promoting a lesson
across more than one repo is Tier 4 work and needs owner approval.
