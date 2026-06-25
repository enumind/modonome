# ADR-032: Network-Level Ratchet

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 9 (Network-Level Ratchet & Conflict Detection)

## Context

Local ratchets (per repo, ADR-019) prevent regression within a single repo. But the
knowledge network is global. A malicious packet published by one bad actor can spread
to many repos before it's detected.

A network-level ratchet watches for patterns of abuse: packets that cause widespread
rejection, packets that contradict each other, packets that fail validation across
multiple repos.

## Decision

1. **Network-level signals to monitor:**

   - **Rejection rate:** what % of importing repos rejected this packet?
   - **Conflict reports:** how many repos report this packet conflicts with others?
   - **False positive rate:** how many repos report this packet's gates trigger incorrectly?
   - **Signature verification failures:** is this packet signed by who it claims?
   - **Propagation velocity:** is this packet spreading faster than trusted packets?

2. **Feedback aggregation (passive, opt-in):**

   Repos can choose to report validation signals to a network observer (or multiple):
   ```yaml
   report_to:
     - https://modonome-observer.example.com
     - ipfs://observer-node-1234
   ```

   This is **opt-in and anonymous**: repos report metrics, not proprietary details.

3. **Network-level gates (not blocks, warnings):**

   When a packet shows suspicious patterns, the network observer publishes a warning:
   ```json
   {
     "warning_type": "high-rejection-rate",
     "packet_id": "sha256:suspicious-packet",
     "rejection_rate": 0.75,
     "reporting_repos": 20,
     "message": "This packet is rejected by 75% of repos that import it. Reconsider.",
     "signature": "ed25519:observer-key"
   }
   ```

   Repos can choose to trust this warning or ignore it.

4. **No central authority, multiple observers:**

   - Different observers may publish different conclusions
   - Repos choose which observers to trust (or run their own)
   - No observer can unilaterally "ban" a packet
   - Bad observers can be ignored or blocked by their users

5. **Malicious packet detection (patterns, not content):**

   The network-level ratchet watches for:
   - Packets that claim to fix a problem but cause the opposite
   - Packets that conflict systematically with trusted packets
   - Packets from the same author that have high failure rates
   - Signatures that don't match the claimed source

   It does NOT inspect packet content (can't judge code correctness).
   It watches for *behavioral patterns* that suggest abuse.

6. **Remediation is social, not technical:**

   If a packet is detected as malicious:
   - The network observer publishes a warning
   - Repos choose not to import it (or unimport if already imported)
   - The bad actor's reputation decreases in trust networks
   - For serious abuse: the source repo may be blocked by users (social action)

   No technical kill switch; remediation is decentralized.

## Consequences

- Malicious packets are detected via observed behavior, not by inspection
- No central authority can censor; only warn
- Bad actors are isolated naturally (fewer repos follow them)
- Network health is observable (via aggregated metrics)
- Observers can be changed or multiplied without lock-in

## Related

- ADR-030 (Cross-Repo Governance Feedback): feeds signals to the network ratchet
- ADR-031 (Semantic Compatibility & Conflicts): conflict detection is a network signal
- ADR-025 (Self-Application Conformance): Modonome publishes signals about its own packets
