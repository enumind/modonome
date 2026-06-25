# Release readiness: hardened alpha

Date: 2026-06-25
Target: v0.2 hardened alpha
Recommendation: GO, with the follow-up verification noted below.

This report records a quality campaign across the repository's artifacts and a go or no-go
call for a hardened alpha release. It reflects measured results. Where a gap appeared, the
register below shows its severity and whether it is closed.

## Operating model

The campaign ran through an expert panel (governed agent autonomy, DevSecOps, supply-chain
security, and open-source developer tooling), a product triage step that assigned severity,
and five quality lanes. Findings flowed through a remediation loop: surface, triage, fix,
re-test, and review. Every release-blocking finding is closed before this report gives a go.

## Lane results

| Lane | Scope | Result |
| --- | --- | --- |
| Functional | CLI commands, arming matrix, scaffold, validate, report, test suite | Pass. 58 of 58 tests pass. `help` exits 0, an unknown command exits 2. The arming matrix arms only when config opt-in and `MODONOME_ARMED` both hold. |
| Security | AgentProof, ratchet coverage, base-branch trust, arming isolation, supply chain | Pass. AgentProof scores 16 of 16. The base-branch restore defeats a pull request that neuters the ratchet (demonstrated). One coverage gap was found and fixed (see GAP-1). |
| Non-functional | Node version, render, drift and style guards | Pass. Runs on Node 20 and Node 22. Drift and style guards pass. All six architecture diagrams render. |
| Environment | Stack coverage, CI portability | Pass. Dry-run verified on the Node and TypeScript example. The ratchet carries JavaScript, TypeScript, Python, Java, and .NET coverage through AgentProof. The enforcing scripts run as plain `node`, so GitHub Actions, GitLab, and Jenkins follow by parity. |
| Documentation | Links, command examples, diagrams, claims, style | Pass. Internal links resolve after GAP-2. Documented commands exist in `bin/modonome.mjs`. Style guard passes with no em dashes and no contrastive phrasing. |

## Gap register

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| GAP-1 | P1 | The anti-gaming ratchet detected assertion removal in `.test.ts` and `.test.js` but missed `.test.mjs`, `.test.cjs`, `.test.mts`, and `.test.cts`. The project's own suite uses `.test.mjs`, so the flagship gate had a coverage gap on its own extension. | Closed. The test-file and source regexes now cover ESM and CommonJS extensions. A regression fixture (`agentproof/fixtures/ratchet-mjs-assertion-removal.patch`) and test assert the fix. AgentProof holds 16 of 16. |
| GAP-2 | P2 | The header badge in `agentproof/README.md` linked to `agentproof/SPEC.md`, which resolves incorrectly from inside the `agentproof/` directory. | Closed. The link now points to `SPEC.md`. |
| GAP-3 | P2 | The CI trust boundary was documented as structural ("runs from the base branch") while the workflow ran the pull request's own copy of the enforcing scripts. | Closed. `ci.yml` now restores the ratchet and the house-style linter from the base-branch copy on pull requests, and the docs describe the mechanism accurately. |
| FU-1 | Follow-up | The hardened `ci.yml` is verified by local simulation of the base-restore mechanism. The end-to-end pull-request path runs on the first real pull request after this change merges. | Open. Confirm the `ratchet` and `verify` jobs pass on the first pull request. |

## Scope notes

- Positive framing was applied to the narrative and front-door documents. The deep
  specifications keep their precise normative language (for example "MUST NOT" in
  `GOVERNED-AUTONOMY-SPEC.md`), because that wording is load-bearing for the controls it
  defines.
- The alpha limitations already listed in `README.md` and `ROADMAP.md` stay accurate:
  signed work items, OpenTelemetry emission, and before-and-after measurement arrive in
  later milestones. They are recorded as known scope, and they sit outside the hardened
  alpha gate.

## Hardened-alpha gate checklist

| Control | State |
| --- | --- |
| Branch protection with a required ratchet check | Owner action at release time |
| CODEOWNERS on all protected paths, including `bin/` | Present |
| Arming isolation through `MODONOME_ARMED` | Verified |
| Enforcing scripts run from a trusted base-branch copy | Implemented, FU-1 to confirm on first pull request |
| AgentProof 16 of 16 | Verified |
| Drift, style, and test suite green | Verified |
| Architecture diagrams render | Verified |

## Recommendation

GO for hardened alpha. Every P1 and P2 finding is closed and re-tested. FU-1 is a
confirmation step on the first pull request rather than a blocker, because the base-restore
mechanism is demonstrated locally. The owner arms branch protection and the required check
at release time, the last two controls that live in repository settings.
