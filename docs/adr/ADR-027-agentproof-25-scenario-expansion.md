# ADR-027: AgentProof Suite Expansion to 25 Scenarios

**Status:** Accepted
**Date:** 2026-06-26

## Context

AgentProof v1.0 (ADR-003) defined sixteen normative scenarios (AP-01 through AP-16)
covering ratchet gaming, config safety, identity collapse, packet leakage, drift, and
protected-path escalation. Those scenarios all target a single control surface: the diff and
config gates. Pre-launch review identified governance properties that the v1.0 suite did not
exercise at all:

1. The work-item state machine could, in principle, contain a cycle or a deadlock with no
   scenario proving otherwise.
2. When several gates fail at once, nothing proved the failure ordering was deterministic, so
   a flaky verdict could merge bad code on a lucky run.
3. The trust boundary (gates loaded from base-branch code a pull request cannot alter) was
   documented but not adversarially tested.
4. The evidence ledger, model-family distinctness, concurrent work-item mutation, gate
   dependency graph, evidence secret screening, and gate resource caps each asserted a
   governance property in prose with no executable proof.

A reference implementation that claims HARDENED while these properties are unproven overstates
its assurance.

## Decision

1. Expand the normative suite to twenty-five scenarios by adding AP-17, AP-18, AP-19, AP-21,
   AP-22, AP-23, AP-24, AP-25, and AP-26, each with a realistic fixture and both-direction
   assertions (the attack is blocked and the clean control case passes).
2. Bump `agentproof/SPEC.md` to v1.1-draft. v1.0 remains the historical sixteen-scenario
   definition; v1.1 is the twenty-five-scenario definition. The two are non-equivalent, which
   is the version-distinctness case ADR-003 anticipated.
3. Set conformance bands to HARDENED = 25/25, PARTIAL = 20 to 24, UNHARDENED = 0 to 19, in the
   runner and in all three canonical AgentProof documents.
4. Leave AP-20 intentionally unassigned. The gap is documented in the spec and README so it
   reads as deliberate, not as a missing scenario.
5. Add the supporting controls under test: state-machine acyclicity check, gate-dependency
   DAG check, deterministic gate pipeline, evidence integrity and secret scanners, the
   resource-capped gate runner, work-item compare-and-swap transitions, and the shared graph
   and secret-pattern libraries.

The 0.1.0-alpha CHANGELOG entry and ADR-003 keep their original sixteen-scenario language as
the historical record. This ADR supersedes the scenario count, not the portability or
labeling decisions in ADR-003, which still hold.

## Consequences

- The HARDENED claim now rests on twenty-five executable proofs spanning gate integrity,
  state-machine safety, trust boundary, audit-trail integrity, concurrency, and resource caps,
  rather than sixteen plus prose for the rest.
- External implementations targeting v1.1 must pass all twenty-five scenarios. An
  implementation that passes only the original sixteen is a v1.0 HARDENED result, not v1.1.
- The benchmark remains self-certified until a third party runs it, which is still the honest
  characterization carried over from ADR-003.
- The scope statement is unchanged: a HARDENED result certifies gate integrity and the named
  governance properties against known attack classes. It is not a certificate of full
  autonomy governance.
