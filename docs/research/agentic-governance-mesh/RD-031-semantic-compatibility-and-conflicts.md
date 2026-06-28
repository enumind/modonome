# RD-031: Semantic Compatibility & Conflicts

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 9 (Network-Level Ratchet & Conflict Detection)

## Context

Repos import multiple packets. Two packets may conflict: they both try to set the same
gate in incompatible ways, or they contradict each other's learnings.

Example:
- Packet A says: "Checker must engage on every run" (require_engagement: true)
- Packet B says: "Allow passive approval for Tier 1 work" (allow_passive_tier_1: true)

These are semantically incompatible. A repo that imports both will have undefined behavior.

Without conflict detection, incompatible packets silently co-exist, leading to bugs.

## Decision

1. **Explicit incompatibility declaration:**

   Packets declare what they're incompatible with:
   ```json
   {
     "packet_id": "sha256:abc123",
     "content": {
       "title": "Enforce checker engagement on all tiers",
       "enforces": "require_engagement=true",
       "incompatible_with": [
         {
           "packet_id": "sha256:xyz789",
           "reason": "xyz789 allows passive approval on Tier 1; abc123 requires engagement on all tiers"
         }
       ]
     }
   }
   ```

2. **Semantic tags: what does this packet affect?**

   Packets are tagged with what they modify:
   ```json
   {
     "semantic_tags": [
       "checker:engagement",
       "tier:1",
       "role:checker"
     ]
   }
   ```

   When importing a new packet, check its tags against already-imported packets.
   Overlapping tags may indicate conflict; warn the user.

3. **Conflict detection at import time:**

   When importing packet B:
   - Check if any already-imported packet declares incompatibility with B
   - Check if B's semantic tags overlap with others
   - If conflict found: block import or require explicit override with rationale
   - Example:
     ```
     $ modonome import sha256:xyz789
     CONFLICT: This packet is incompatible with sha256:abc123
     Already imported: "Enforce checker engagement on all tiers"
     New packet: "Allow passive approval for Tier 1 work"
     
     These contradict. Proceed? (override with --force and document in DECISIONS.md)
     ```

4. **Resolution strategies (all explicit):**

   a) **Replace:** unimport the old packet, import the new one
   b) **Coexist:** document the override in `.modonome/DECISIONS.md` with rationale
   c) **Reject:** don't import the new packet

   No silent resolution. The repo owner decides.

5. **Transitive conflict detection (optional):**

   If Repo A imports X and Y (which conflict), and Repo B follows Repo A,
   Repo B sees the conflict in A's decisions (because DECISIONS.md is traceable).

## Consequences

- Conflicts are detected before they cause silent bugs
- Repos understand the trade-offs in their packet choices
- Incompatible packets can coexist only with explicit documentation
- Conflicts are propagated through the network as signal
- No automatic "resolution"; humans decide

## Related

- RD-030 (Cross-Repo Governance Feedback): feedback includes conflict reports
- RD-032 (Network-Level Ratchet): detects widespread conflicts (signal of bad packet)
