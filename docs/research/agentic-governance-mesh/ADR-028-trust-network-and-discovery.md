# ADR-028: Trust Network & Discovery

**Status:** Proposed  
**Date:** 2026-06-25  
**Milestone:** 8 (Federated Discovery & Trust Networks)

## Context

Modonome's Milestone 2 planned a central catalog (opt-in, hash-only, no ranking). This
creates a bottleneck: someone has to maintain and index the catalog.

A true WWW for governance packets requires decentralized discovery. Repos should find
packets through trust networks, not a central index.

## Decision

1. **Trust networks replace central catalog:**

   Each repo maintains a `governance-follows.yaml`:
   ```yaml
   follows:
     - github.com/google/platform      # I trust their learnings
     - github.com/kubernetes/core      # I watch their innovations
     - github.com/nateshpp/modonome    # I track the reference impl
   ```

   When repo B follows repo A, B subscribes to A's published packets. Discovery is
   transitive: if B trusts A and A trusts C, B can see packets from C (with a trust
   depth limit).

2. **Packet announcement via gossip protocol:**

   When a repo publishes a packet:
   - It announces to followers (via a webhook, ActivityPub-like feed, or a DHT)
   - Followers can re-announce to their followers
   - Packets propagate through the network like memes

   No central indexer required; the network gossips.

3. **Multiple discovery mechanisms (no single standard):**

   a) **GitHub Releases / Discussions API:**
      Repos publish packets as releases tagged with `gpp:gate`, `gpp:learning`, etc.
      Others watch releases; discovery via GitHub's existing APIs.

   b) **ActivityPub-like feeds (future):**
      Repos publish to an AP-compatible feed. Aggregators can index without
      controlling the network.

   c) **Distributed Hash Table (DHT):**
      Packets are keyed by content hash in a DHT (like BitTorrent). Discovery via
      peer announcements.

   d) **Email lists / RSS feeds (simplest):**
      Repos publish packets to a mailing list or RSS feed. Low-tech, decentralized.

   Each transport is equally valid. No transport is canonical.

4. **Local indexing (each repo chooses what to track):**

   Repos maintain a local `.modonome/packet-index.yaml`:
   ```yaml
   packets:
     sha256:abc123:
       source: github.com/google/platform
       published: 2026-06-25
       type: gate
       title: Cache invalidation fix
       maturity: stable
       imported_at: 2026-06-26
       status: advisory|promoted|archived
   ```

   This is a local cache; it's not the source of truth. The source of truth is the
   packet itself (on the original repo or a CDN).

5. **Search happens locally or via trusted peers:**

   ```bash
   # Local search (what I've already imported)
   modonome search "checker gaming" --local

   # Peers search (ask trusted repos what they know)
   modonome search "checker gaming" --peers

   # Web search (call out to a search service if you trust it)
   modonome search "checker gaming" --service indexer.example.com
   ```

   No single search service is required. Users can choose or run their own.

6. **No central authority, no ranking:**

   - Packets are not ranked by "downloads" or "stars"
   - Repos see what their trusted peers trust
   - Value emerges from use, not from a central algorithm
   - If a search service becomes malicious, switch to another

## Consequences

- Discovery is decentralized; no single point of control
- Repos have choice in what discovery mechanism to use
- Network effects emerge naturally (more repos = more packets = more value)
- Trust is explicit (you choose who to follow)
- Spam is managed by blocking bad actors, not by central moderation
- Fragmentation is possible (different clusters of trust), but acceptable

## Related

- ADR-027 (Governance Packet Protocol): defines the packet format
- ADR-024 (Capability Promotion Gate): governs how packets are adopted
- ADR-030 (Cross-Repo Governance Feedback): trust propagation
