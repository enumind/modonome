# ADR-016: Knowledge Network Packet Identity, Lineage, and Dedup

**Status:** Accepted
**Date:** 2026-06-25

## Context

`schemas/knowledge-packet.schema.json` today constrains `id` only as `{type: string, minLength: 1}` with no stability or derivation rule. A poll fabric across 6–100 repos delivering nightly pulls will re-deliver the same packets on every cycle. Without a stable, verifiable id, every sync property (dedup, supersession ordering, replay defence) is undefined by the schema and therefore unenforceable in code.

Two independent review seats (sync and security) flagged this as a v0.2 blocker. The red-team pass added a second blocker: the draft spec placed the seen-id and rejected-id ledgers inside `templates/.modonome/NETWORK.md`, a file the agent may append to. That made the replay defence structurally overlap the agent-writable surface (red-team finding H6): an agent could append a forged id entry to NETWORK.md and make a malicious packet appear already-seen, or delete a rejected entry to resurrect a blocked packet. Neither the signing stack (ADR-017) nor the base-branch execution scope (ADR-019) can correct this without first fixing the identity primitive. The identity primitive must come first.

## Decision

**1. `id` is the content hash of the packet body.**
`id = "sha256:" + hex(sha256(canonical-JSON(packet)))`, where canonical-JSON is RFC 8785 JCS implemented in `scripts/lib/canonical-json.mjs`. The hash input excludes volatile and envelope fields: the `signature` object, `published_at`, any catalog-assigned fields, and alias-resolution metadata. The schema tightens `id` to `pattern: "^sha256:[0-9a-f]{64}$"`. The single shared derivation lives in `scripts/lib/packet-id.mjs` (Tier 3, CODEOWNERS-gated).

**2. The validator asserts identity on every packet.**
`scripts/validate-knowledge-packet.mjs` and `scripts/verify-packet.mjs` both call `computeId(packet)` from `scripts/lib/packet-id.mjs` and reject any packet where `packet.id !== computeId(packet)` as tampered. This check runs in the base-branch CI scope established by ADR-019 (the same trust class as `guard-ratchet.mjs`), so the verifier code cannot be subverted by a PR-head edit. A missing or malformed `id` is a hard failure, not a warning.

**3. Dedup and replay state live in a CI-written, agent-read-only ledger, not in NETWORK.md.**
The seen-id ledger and the owner-rejected-id ledger live in `.modonome/network/ledger.jsonl` (append-only). The retry/pending-id ledger lives in `.modonome/network/pending-ids.json`. Both are **written only by the base-branch CI poll job** (`scripts/poll-network.mjs` running under ADR-019 scope); the agent may read them but cannot write or delete entries. A receiver dedups purely on `id` against this ledger: a byte-identical re-publish collapses to the same record; a replayed or previously-rejected `id` is a no-op regardless of any other field. `templates/.modonome/NETWORK.md` may display import state for human review but the verifier never consults it, closing H6: an agent appending or deleting an id in NETWORK.md cannot cause a malicious packet to appear adopted or resurrect a rejected one.

**4. Lineage references content-addressed ids.**
`lineage.supersedes_packet_ids` and `lineage.parent_packet_ids` must contain values matching `^sha256:[0-9a-f]{64}$`. A superseding packet retires a prior packet only after the superseding packet itself passes all local gates (ADR-010: schema validation, redaction check, id-recompute assertion, signature verification against `peer-keys.json`, owner promotion). A superseding packet that fails any gate never retires the still-valid prior packet; the ledger entry for the prior packet remains active.

**5. Content-addressing is what makes Ed25519 signing meaningful.**
Because `id` is the content hash, the Ed25519 signature over the domain-separated JCS digest (ADR-017) effectively signs the id. Signing a packet with an unstable or opaque id would allow body substitution while preserving a valid signature; content-addressing closes that gap. The two ADRs are mutually dependent: ADR-017 requires ADR-016's id stability guarantee, and ADR-016's tamper detection is strengthened by ADR-017's signature check.

## Consequences

- Nightly polls across any number of repos are idempotent: re-delivered packets carry the same `id` and are no-ops against the CI-written ledger, with no separate dedup bookkeeping required in the agent or in NETWORK.md.
- Mutated replays are detectable: a body change shifts the hash, producing an `id` mismatch that `validate-knowledge-packet.mjs` rejects as tampered before any ledger write.
- Supersession ordering is deterministic and gated: a superseding packet cannot retire a prior one unless it clears all local gates, preventing a malformed or adversarial packet from voiding a currently-valid rule by mere reference.
- The replay and dedup defence no longer overlaps the agent-writable surface (H6 resolved): the authoritative state lives in CI-written files the agent cannot forge.
- `scripts/lib/packet-id.mjs` and `scripts/lib/canonical-json.mjs` are Tier 3 protected paths (CODEOWNERS-gated); any change to the canonicalization or hash derivation requires principal review and invalidates all previously issued ids, which is an explicit breaking change.
- Adopters publishing packets from before this ADR must re-derive ids; the existing `{type: string, minLength: 1}` constraint in `schemas/knowledge-packet.schema.json` did not guarantee stable identity, so no migration script can recover prior ids. Previously issued packets are re-published with freshly computed ids.
