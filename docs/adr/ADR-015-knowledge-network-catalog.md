# ADR-015: Knowledge Network Catalog Design

**Status:** Proposed
**Date:** 2026-06-25

## Context

v0.2 introduces an opt-in central catalog so a packet proven in one repo can be discovered by others, with hash-only identity and no ranking. `prompts/modules/network.md` forbids a central ranking/routing authority and mandates minimum disclosure; `ARCHITECTURE.md` forbids a central service and rests CI integrity on validators running from the protected base branch. The red-team pass found that a correctly-signed-but-stale index can be replayed to withhold a security packet's supersession (H11): signature validity alone does not prove freshness.

The catalog must therefore be transport, not authority. All trust decisions stay in-repo, in CI scope (ADR-010, ADR-019). The catalog itself must carry no logic that could become a single point of failure, a ranking surface, or an availability dependency.

## Decision

1. **Catalog is a static store, not a service.** A dedicated git repo (or a signed HTTP directory / object store) holds `/catalog/index.json` (a manifest array of lightweight records) plus `/catalog/packets/<id>.json` (immutable signed bodies). It is trivially mirrorable, cacheable, and survivable: no query API, no availability dependency, no SPOF logic. Adding a catalog origin to a consumer's allowlist is **Tier 4** (owner decision only).

2. **Record shape is schema-pinned with structurally prohibited fields.** `schemas/catalog-index.schema.json` (Tier 3, protected path under `schemas/`) uses `additionalProperties: false`. Each record is `{ id, published_at, expires_at, modernization_axis, signal, classification, source_stack_fingerprint, sig (Ed25519 over id), pubkey_id, size, url }`. Structurally prohibited: `name`, `description`, `ranking_score`, `stars`, `adoption_count`, `owner_identity`, `contact`. The schema is the enforcement; prose does not survive tooling evolution.

3. **`index.json` is append-only, signed, and carries a monotonic sequence (anti-rollback, H11).** A detached Ed25519 signature covers the index *including* a monotonically increasing integer `sequence` and `generated_at`. `scripts/poll-network.mjs` verifies the signature before trusting any record, then rejects any index whose `sequence` is below the last one it successfully processed. The last-seen sequence lives in the CI-written ledger (`.modonome/network/ledger.jsonl`), not in agent-writable `NETWORK.md`. A rollback to an earlier validly-signed index (used to suppress a fix's supersession) is detected and aborts the poll. The index is the trust root for *discovery*, not for *adoption*.

4. **Selection is entirely local; no server-side filter or rank.** The poller fetches `index.json`, verifies signature + sequence, then downloads only bodies whose `id` it has not imported and whose `modernization_axis` / `signal` the local repo subscribes to. No scoring exists anywhere: not in the catalog, not in the poller. Adoption remains the ADR-010 local re-validation contract (own gates + independent checker + owner decision + measured impact).

5. **Opt-in/opt-out are owner-gated pull requests.** A repo joins or leaves by a PR against the catalog repo adding or removing its record; the catalog repo's CI validates each record against `schemas/catalog-index.schema.json` before merge. Per the protected-path posture (`scripts/`, `schemas/`, `.github/` always ≥ Tier 3 via CODEOWNERS), adding a catalog origin to a consumer's allowlist is **Tier 4** and cannot be claimed autonomously.

## Consequences

- "Never a central authority" is literally true: the catalog is bytes, and all trust decisions happen in-repo against committed, CODEOWNERS-gated state evaluated by base-branch CI code (ADR-019).
- Index rollback to withhold a supersession is detectable via the signed monotonic `sequence` (red-team H11); a stale-but-signed replay aborts the poll instead of silently dropping a fix.
- No ranking or routing surface can be added without a CODEOWNERS-visible change to `schemas/catalog-index.schema.json`. The prohibited-fields posture is enforced by `additionalProperties: false`, not prose.
- Every opt-in/opt-out is an auditable commit in the catalog repo, validated against schema before merge.
- The design is portable to GitHub, S3, R2, or Codeberg (anything that can serve signed static bytes), with no service to operate and no SPOF to attack.
- See `docs/catalog-format.md` (layout, sequence semantics, fixtures), `schemas/catalog-index.schema.json` (record contract), ADR-019 (base-branch execution scope), `prompts/modules/network.md` (no central ranking/routing authority), and `ARCHITECTURE.md` (no central service; base-branch validator invariant).
