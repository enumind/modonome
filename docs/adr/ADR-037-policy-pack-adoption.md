# ADR-037: Policy-Pack Adoption Tooling

**Status:** Accepted  
**Date:** 2026-07-03  
**Milestone:** 6 (Self-governance hardening)  
**Builds on:** ADR-036 (Policy-pack manifest and disclosure attestation)

## Context

ADR-036 built `.modonome/policy-attestation.json`, a content-addressed manifest disclosing
the governance policy this repository enforces. Its own "Consequences" section named the one
thing it deliberately left undone: "cross-repo adoption tooling ... is deferred; this ADR
adds neither a config lever nor a network path." The artifact was built to be "the portable
pack format an adopter can vendor and diff," but nothing could yet vendor or diff it.

The requirement for that tooling is specific: a policy pack must never be vendorable into
another repository with its credit to modonome silently erased. Two things this repository
already has do not fit that requirement. The knowledge-packet system (ADR-014 through
ADR-019) solves bilateral cryptographic trust between repositories that have already
exchanged keys out-of-band through `.modonome/peer-keys.json` ("no TOFU"); its closest
provenance field, `source_repo_alias`, is deliberately optional and coarse for privacy, and
the catalog design explicitly prohibits identity or ranking fields. None of that fits a
credit claim that must survive vendoring between repositories with no prior relationship at
all. What already exists and does fit is content-addressing: the manifest's own
`content_digest`, extended to cover a required credit field.

## Decision

Add a required `generator` block to the manifest body: `{ name, homepage, repository }`,
populated from `package.json` so it is never a second literal to keep in sync. This bumps
`manifest_version` from 1 to 2. Because `generator` is both schema-required
(`additionalProperties: false`, non-empty strings) and inside the hashed body, a pack cannot
drop its credit and remain schema-valid, and cannot have its credit altered without either
recomputing `content_digest` (a distinguishable, later-covered case; see Consequences) or
being caught immediately by the same self-consistency check `--check` already performs.

Add three commands to `scripts/build-policy-attestation.mjs` (`modonome attest`), all reusing
existing machinery rather than introducing new cryptography:

- `--show [file]` and `--verify [file]` generalize the existing local-only commands to accept
  an optional foreign file path, defaulting to today's local-artifact behavior when omitted.
  Both now surface the pack's generator credit, or note plainly when a pre-v2 pack claims
  none.
- `--diff <file>` is read-only and always succeeds (never a pass/fail gate): it rebuilds this
  repo's own live manifest and reports the field-level differences in capabilities, the
  branch denylist, protected paths, gates, and posture, always alongside the foreign pack's
  generator credit. A human uses this to decide whether to adopt.
- `--adopt <file> --alias <name>` is the adoption step. It schema-validates the foreign pack,
  checks `content_digest` self-consistency, verifies the embedded signature if present, and
  only then vendors the file to `.modonome/policy-packs/<alias>.json`. It refuses, writing
  nothing, on any of those three failures, including a pack whose credit was stripped
  outright (fails schema) or altered without a matching digest (fails self-consistency).

## Consequences

- A vendored pack can be inspected (`--show`), compared (`--diff`), and adopted (`--adopt`)
  without any of those operations weakening the base-pinned trust boundary the underlying
  manifest already preserves (ADR-036): none of this reads policy back into the detectors.
- **What this guarantees, precisely:** a specific, already-published pack cannot be silently
  modified in transit or by a careless process (hand-edit, lossy pipeline, naive
  find-and-replace) without `--check`/`--verify`/`--adopt` catching the digest mismatch
  immediately. Schema validation independently guarantees no schema-valid `manifest_version`
  2+ pack can omit the credit block at all.
- **What this does not guarantee:** `content_digest` is a plain hash, not a keyed MAC, so a
  determined actor can edit the body, including the generator block, and correctly recompute
  a new self-consistent digest. That produces a different, self-consistent artifact, not a
  silently-stripped copy of the original; distinguishing "republished under new, honest terms"
  from "the same pack with credit erased" is not a problem tooling can solve, because at that
  point they are, by construction, different files. No scheme can prevent someone from
  authoring an uncredited artifact from scratch, and this one does not try. For a pack where
  that distinction matters, sign it: the existing optional Ed25519 signature (reused as-is,
  no new key material) covers the full body, so a signed pack cannot be re-derived with
  different credit by anyone who lacks the original private key, closing exactly the gap an
  unsigned pack leaves open.
- No new capability flag and no `check-promotion-readiness.mjs` involvement: `--diff` and
  `--adopt` are on-demand, human-invoked tooling, the same category as `modonome compliance`
  or `snapshot --pack`, not an autonomous background action ADR-024's gating model governs.
- No CI wiring for `--diff`/`--adopt`; they are not a repo-local invariant. The existing
  `--check` freshness gate is unchanged in behavior, and now also covers the `generator`
  field once a pack is regenerated.
- This repository has no real foreign pack to adopt today, so `.modonome/policy-packs/` is
  not created or committed here; a committed, fabricated "adopted" file would be the same
  self-application smell `check-self-application.mjs` already forbids for a committed
  `metrics.jsonl` (shipping synthetic activity as real). Tests exercise `--adopt` against a
  temp directory via a scoped `MODONOME_ROOT` override, never the real repository tree.

## Related

- ADR-014 through ADR-019 (Knowledge network): the separate, bilateral-trust mechanism this
  ADR deliberately does not touch or converge with.
- ADR-017 (Signing and keys): the Ed25519 and canonical-JSON machinery reused as-is for the
  policy attestation's optional signature, unchanged by this ADR.
- ADR-024 (Capability promotion gate): why this ADR's new commands do not require a
  capability flag.
- ADR-036 (Policy-pack manifest and disclosure attestation): the manifest and freshness gate
  this ADR extends.
