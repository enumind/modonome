# ADR-017: Knowledge Network Packet Signing and Key Management

**Status:** Proposed
**Date:** 2026-06-25

## Context

Ed25519 signing is on the v0.2 network roadmap, but signing only adds authenticity
if its load-bearing details ship with it. The security seat warned that without
pinned canonicalization, a committed key allowlist, fixed signature placement, and a
fixed check order, a signature is ceremony: an attacker can re-serialize, strip,
downgrade, or self-certify around it.

There is no canonical-JSON in the repo today: `scripts/lib/jsonschema.mjs` uses raw
`JSON.stringify`, which is insertion-order-dependent and unsafe to sign over. We are
a single org with no PKI, so the trust root must be committed repo state, not a CA.

The red-team pass added two gaps a naive signing design leaves open:
- **H3 (enrollment has no out-of-band root):** a catalog or repo compromise at enroll
  time could supply an attacker key, so "first poll pins the key" (TOFU) just moves
  the forgery one step earlier to enrollment.
- **H4 (revocation gated only at fetch):** a packet staged before its key was revoked
  could still be promoted later, because verification and adoption are separated in
  time.

Enrolling a peer key or enabling signing is **Tier 4** work (protected paths under
`scripts/`, `schemas/`, `templates/`, plus the live `.modonome/peer-keys.json`);
owner decision only. All verification runs from the protected base branch in CI scope
(ADR-019), outside agent scope.

## Decision

1. **Canonicalization and domain separation.** `signed_bytes =
   UTF8('modonome.knowledge-packet.v1\n') || JCS(packet minus the signature object)`,
   computed by the shared `scripts/lib/canonical-json.mjs` (RFC 8785 JCS).
   `scripts/sign-packet.mjs` and `scripts/verify-packet.mjs` recompute identically.
   `additionalProperties: false` on `schemas/knowledge-packet.schema.json` bounds the
   canonicalization surface so there are no unsigned smuggle fields.

2. **Committed, CODEOWNERS-gated peer-key allowlist with out-of-band enrollment. No
   TOFU (H3).** `.modonome/peer-keys.json` (seed `templates/.modonome/peer-keys.json`;
   schema `schemas/peer-keys.schema.json`) records `{ alias, ed25519_pubkey_b64,
   added_by, added_at, status: active|revoked, not_before, not_after }`. A packet
   verifies only against an `active`, in-window key in **this** repo's file.
   **Committing a key is not authentication:** the pubkey fingerprint MUST be confirmed
   through a channel independent of the catalog/transport (peer owner stating it in a
   signed commit, the org directory, or verbal confirmation) before the Tier 4
   CODEOWNERS edit lands; `added_by` records the human who performed that out-of-band
   verification. `sign-packet.mjs` and `verify-packet.mjs` print the short fingerprint
   so owners can compare. This pushes the "first tampered poll pins an attacker key"
   attack back to enrollment, where an independent channel blocks it. This reuses the
   ADR-008 trusted-author-allowlist pattern: the committed file **is** the trust list
   and editing it is the gated human action. TOFU is rejected.

3. **Embedded detached signature + hard ordered import check.** Add a top-level
   `signature` object `{ alg: 'ed25519', key_alias, pubkey_b64, sig_b64, signed_at }`
   that covers `JCS(packet minus signature)` but travels in the same file.
   `scripts/verify-packet.mjs` enforces, in order: (1) schema; (2)
   `scripts/validate-knowledge-packet.mjs` redaction/classification gate; (3) signature
   present and well-formed (**absence is a hard failure under signing mode, never a
   downgrade to unsigned**); (4) `key_alias` resolves to an `active`, in-window key AND
   `signature.pubkey_b64` byte-equals the allowlisted key; (5) Ed25519 verify over
   recomputed `signed_bytes`; (6) anti-replay (id already imported / rejected /
   superseded / expired-or-past-receiver-cap). All of this runs from base-branch CI
   scope (ADR-019).

4. **Rotation and revocation via the same gated file, enforced at both promotion and
   fetch (H4).** Rotation: add a new (possibly versioned) alias with overlapping
   `not_before`/`not_after` windows. Revocation: flip `status` to `revoked`, a
   CODEOWNERS-gated edit; the allowlist **is** the live revocation list, no CRL/OCSP.
   Because a packet staged Monday may be promoted Wednesday after its key was revoked
   Tuesday, **promotion re-runs `verify-packet.mjs` against the current
   `.modonome/peer-keys.json`**: a staged inbox entry whose key is now revoked/expired,
   or whose receiver-side max-staleness has elapsed, is auto-quarantined and **cannot
   be promoted**. Verification and adoption are no longer separated in time. This is
   ADR-010's "re-verify under your own gates" applied to key state.

5. **Private keys are harness/CI secrets.** `scripts/sign-packet.mjs` reads
   `MODONOME_SIGNING_KEY` from env, injected like `ANTHROPIC_API_KEY` (ADR-011); never
   written to agent-readable files, never in the prompt. Signing is authenticity-only;
   the redaction gate remains the confidentiality control and still trips on a leaked
   `BEGIN PRIVATE KEY` in any packet body.

## Consequences

- Signatures are interoperable and binding: any peer recomputes the same
  domain-separated JCS bytes, so a re-serialized or field-reordered packet fails verify.
- An attacker key cannot be enrolled without defeating an independent out-of-band
  channel; a catalog or transport compromise alone cannot seed trust (H3 closed).
- A key compromise discovered after a packet is staged is caught at promotion, not
  silently adopted (H4 closed); revoked/expired/stale entries auto-quarantine.
- A compromised agent turn cannot sign arbitrary packets. The private key is a CI
  secret outside agent scope (ADR-011).
- Catalog compromise cannot forge an adoptable packet; at most it can withhold or
  replay, both caught by anti-replay and the base-branch verifier (ADR-019).
- Key rotation and revocation need no new infrastructure: both are CODEOWNERS-gated
  edits to `.modonome/peer-keys.json` (Tier 4).
- New surface is protected-path code: `scripts/sign-packet.mjs`,
  `scripts/verify-packet.mjs`, `scripts/lib/canonical-json.mjs`,
  `schemas/peer-keys.schema.json`. See ADR-008 (trusted-author allowlist), ADR-010
  (re-verify-under-own-gates), ADR-011 (CI-env-var trust scope), ADR-019 (base-branch
  execution).
