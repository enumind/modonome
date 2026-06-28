# RD-030: Cross-Repo Governance Feedback

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 9 (Network-Level Ratchet & Conflict Detection)

## Context

When Repo B imports and validates Repo A's packet, that validation is valuable signal.
If Repo B successfully promoted the packet to default-on, that's evidence the packet
works. If Repo B rejected it, that's evidence it may not be compatible.

Today, this signal stays local to Repo B. Repo C (another follower of A) doesn't benefit
from B's validation.

Cross-repo feedback creates a web of trust: "I trust B's judgment, B validated A's packet,
so I have more confidence in A's packet."

## Decision

1. **Validation signal: repos publish feedback on imported packets**

   When a repo imports a packet and reaches a decision, it publishes a signal:
   ```json
   {
     "signal_type": "validation",
     "packet_id": "sha256:abc123",
     "source_repo": "github.com/google/platform",
     "importing_repo": "github.com/startup/app",
     "decision": "promoted|rejected|archived",
     "observation_window_days": 7,
     "metrics": {
       "false_positives": 0,
       "gate_passes": 42,
       "gate_failures": 0,
       "user_satisfaction": 0.95
     },
     "feedback": "Checker gaming detection works perfectly. Zero false positives over 7 days.",
     "signature": "ed25519:...",
     "published_at": "2026-07-01"
   }
   ```

2. **Trust depth: follow the chain of trust**

   ```yaml
   trust_depth: 2
   follows:
     - github.com/google/platform          # depth 1 (direct)
       follows:
         - github.com/nateshpp/modonome    # depth 2 (transitive)
   ```

   If Repo C trusts Repo B, and Repo B validated Repo A's packet, Repo C can see B's
   validation signal. This enables discovery: "What has my trusted peers found?"

3. **Feedback aggregation (optional): consensus on packet quality**

   Multiple repos' feedback can be aggregated (locally or via a search service):
   ```json
   {
     "packet_id": "sha256:abc123",
     "validation_count": 5,
     "promoted_by": ["github.com/google/platform", "github.com/startup/app", ...],
     "rejected_by": ["github.com/enterprise/bank"],
     "average_satisfaction": 0.92,
     "consensus": "stable_with_caveats"
   }
   ```

   This is *not* a ranking; it's observed evidence. Different repos can draw different
   conclusions from the same data.

4. **Negative feedback is public and valuable:**

   If Repo B rejects Repo A's packet, that's signal: "This packet didn't work for us."
   Other repos can learn from B's negative experience without repeating it.

5. **No privacy violation:**

   Feedback includes only:
   - Packet ID (content hash, not source code)
   - Metrics (pass/fail counts, satisfaction)
   - Short text (no details about internal systems)

   No information about the importing repo's internal state or proprietary decisions.

## Consequences

- Repos benefit from each other's validation work
- Trust networks propagate signal, not packets alone
- Bad packets are identified faster (consensus emerges naturally)
- Good packets gain confidence through use
- No central authority needed to aggregate feedback; it's emergent

## Related

- RD-028 (Trust Network & Discovery): feedback flows through trust networks
- RD-031 (Semantic Compatibility & Conflicts): feedback helps detect conflicts
- RD-032 (Network-Level Ratchet): uses feedback to detect malicious patterns
