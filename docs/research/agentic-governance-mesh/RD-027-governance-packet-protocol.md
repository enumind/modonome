# RD-027: Governance Packet Protocol

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 7 (Governance Packet Protocol)

## Context

Modonome's knowledge packets today are understood by Modonome's code. To enable a global
governance mesh, where any system can participate, we need an open, implementation-agnostic
protocol for governance packets.

## Decision

1. **Governance Packet Protocol (GPP) v1: JSON-based wire format**

```json
{
  "gpp_version": "1.0",
  "packet_id": "sha256:abc123def456...",
  "packet_type": "gate|learning|pattern|role",
  "source": {
    "repo": "github.com/org/repo",
    "published_at": "2026-06-25T14:30:00Z",
    "author": "user@org.com",
    "signature": "ed25519:base64-signature",
    "public_key_uri": "https://github.com/org/repo/keys/governance.pub"
  },
  "metadata": {
    "title": "Fix for cache invalidation in checker",
    "description": "Prevents checker gaming via observation window",
    "tags": ["checker", "gaming"],
    "requires_schema_version": ">=1.0, <2.0",
    "applies_to_roles": ["checker", "architect"],
    "maturity": "stable|advisory|experimental"
  },
  "content": {
    "type": "gate",
    "targets": ["scripts/guard-ratchet.mjs"],
    "changes": [
      {
        "file": "scripts/guard-ratchet.mjs",
        "operation": "add-check",
        "description": "Detect checker disengagement"
      }
    ]
  },
  "evidence": {
    "correction_signal": "github.com/enumind/modonome/pull/42",
    "observation_date": "2026-06-01",
    "trace_id": "ADR-022"
  },
  "compatibility": {
    "incompatible_with": ["packet_id:sha256:xyz789..."],
    "supersedes": ["packet_id:sha256:old123..."],
    "depends_on": ["packet_id:sha256:dep456..."]
  }
}
```

2. **Signing via Ed25519 over canonical JSON (deterministic serialization)**

3. **Packet ID is content-addressed: `sha256:hex(sha256(canonical_json))`**

4. **Maturity states: stable | advisory | experimental**

5. **Packet types: gate | learning | pattern | role | integration**

6. **Transport is decoupled (HTTP, Git, IPFS, email)**

7. **Extensibility via `x-vendor:field` namespaces**

## Consequences

- Packets are self-describing and inspectable without Modonome code
- Third-party systems can adopt GPP and participate in the mesh
- Format is versioned and stable
- Protocol becomes a community standard, not a Modonome feature
- Enables interoperability across governance systems

## Related

- ADR-017 (Packet Signing)
- ADR-024 (Capability Promotion Gate)
- RD-028 (Trust Network & Discovery)
