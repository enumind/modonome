# ADR-024: Capability Promotion Gate

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 6 (Self-governance hardening)  
**Prerequisite for:** Milestone 2, Milestone 5

## Context

The roadmap includes features that expand the engine's authority:
- Cross-repo knowledge network (Milestone 2): allow importing patterns from other repos
- Market researcher and envisioner roles (Milestone 5): allow market scans and forward-looking proposals
- Future roles and integrations yet to be planned

These features are powerful and necessary for long-term value. They are also high-risk:
they introduce new trust boundaries (other repos, external data), new attack surfaces
(packet injection, proposal poisoning), and new sources of wrong decisions (stale market data,
over-confident proposals).

Shipping them as defaults (or with weak defaults) invites adoption risk. Shipping them
off-by-default but with no promotion path means they never ship (they're just code branches
that rot).

The solution is a promotion gate: features start off, ship in shadow or advisory mode,
accumulate evidence of safety and value, and graduate to default-on via an explicit owner
ADR and a fixed observation window.

## Decision

1. **Feature flag naming:**
   - New capabilities ship behind flags in the config schema:
     - `repo_network_enabled`: false
     - `market_scan_enabled`: false
     - Future: `envisioner_enabled`: false
   - Each flag is documented in the schema with the milestone it targets and the promotion
     criteria.

2. **Default states and observation windows:**
   - **off:** Feature is disabled. No code runs, no side effects.
   - **advisory:** Feature runs read-only. It proposes or reports but takes no action.
     Observation window: N weeks (typically 4-6) in a subset of production repos.
     Metrics tracked: engagement, false-positive rate, user feedback.
   - **default-on:** Feature is enabled by default. Users can opt out.
     Preceded by: owner ADR + evidence from advisory window + resolved open questions.

3. **Promotion ADR template** requires:
   - Feature name and flag name
   - Observation window length and evidence collected
   - False-positive / over-confidence rate (if applicable)
   - User feedback summary
   - Unresolved questions (if any)
   - Rollback and escape hatch (how to disable if problems emerge post-promotion)

4. **CI gate:** A `check-promotion-readiness.mjs` gate runs on every Milestone 2/5 change:
   - If a capability flag is being changed from advisory or advisory-proposed to default-on,
     the change must be paired with an ADR meeting the template above.
   - The ADR must reference resolved observations and closed questions.
   - Fail if the ADR is missing or incomplete.
   - This is Tier 3 (requires owner approval).

5. **Self-application:** Modonome's own capability roadmap (Milestone 2 and 5) must follow
   this gate. No feature ships as default until the team can point to evidence and a
   promotion ADR in the Modonome repo itself.

## Consequences

- High-risk features ship with time-limited and evidence-based safeguards.
- The community can see the evidence and the reasoning for promotion.
- A feature that turns out to be high-risk stays in advisory or gets rolled back,
  with a clear process and no shame.
- The bar for default-on is clear: evidence, not faith.

## Related

- Milestone 2 (Cross-repo knowledge network): first feature to use this gate.
- Milestone 5 (Market researcher and envisioner): second feature.
- ADR-019 (Knowledge Network Execution Scope): covers the scope controls for Milestone 2.
