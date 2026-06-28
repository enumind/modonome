# RD-029: Packet Lifecycle & Versioning

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 8 (Federated Discovery & Trust Networks)

## Context

Governance packets are not immutable in purpose. A fix for a bug may become obsolete when
the underlying issue is addressed. A pattern may be superseded by a better approach. A
learning may be promoted into the core and no longer needed as a packet.

Without a lifecycle model, the network accumulates stale or redundant packets. Users don't
know which version to import or whether a packet is still relevant.

## Decision

1. **Packet lifecycle states:**

   - **Published:** freshly created, not yet observed in production
   - **Advisory:** proposed, imported by repos in observation mode (ADR-024)
   - **Stable:** proven through observation window, imported as default
   - **Superseded:** replaced by a newer packet (explicitly marked)
   - **Archived:** no longer applicable (documented why)
   - **Deprecated:** older version, kept for history but not recommended

2. **Versioning scheme: packet_id doesn't change; state changes via amendment**

   When a packet evolves:
   - Original packet ID (content hash) never changes
   - A new amendment packet references the original
   - Amendment is signed and published separately
   - Example:
     ```json
     {
       "packet_id": "sha256:abc123",
       "type": "amendment",
       "amends": "sha256:abc123",
       "new_state": "archived",
       "reason": "Superseded by sha256:xyz789",
       "amendment_signature": "ed25519:...",
       "published_at": "2026-07-01"
     }
     ```

3. **Compatibility matrix: what repo versions is this packet compatible with?**

   ```json
   {
     "requires_schema_version": ">=1.0, <2.0",
     "requires_modonome_version": ">=0.2, <1.0",
     "compatible_with_roles": ["checker", "architect"],
     "incompatible_with_packets": ["sha256:bad-packet-1"],
     "tested_on_estates": ["product-app", "monorepo", "microservice"]
   }
   ```

   Each repo checks compatibility before importing. If a packet requires schema v2 and you're
   on v1, import is blocked until you migrate.

4. **Deprecation path: how to retire a packet gracefully**

   When a packet becomes obsolete:
   - Publish an amendment marking it as `deprecated` or `archived`
   - Provide a migration path: "import sha256:xyz789 instead"
   - Keep the original packet available for historical reference
   - Include the deprecation reason in the amendment

5. **Snapshot versioning (optional): freeze a packet at a point in time**

   For long-term stability, a repo can publish a snapshot of a packet:
   ```json
   {
     "packet_id": "sha256:snap-v2-2026-06",
     "type": "snapshot",
     "snapshot_of": "sha256:abc123",
     "frozen_at": "2026-06-25T14:30:00Z",
     "frozen_reason": "locked for our v2 release"
   }
   ```

   This allows a repo to lock in a packet version even if the original evolves.

## Consequences

- Packets have clear lifecycle; repos know what state each packet is in
- Amendments allow evolution without breaking content-addressed IDs
- Compatibility metadata prevents imports that would break
- Stale packets can be archived but remain visible in history
- Long-term projects can snapshot packets for stability

## Related

- RD-027 (Governance Packet Protocol): amendment is a packet type
- ADR-024 (Capability Promotion Gate): drives progression through lifecycle states
