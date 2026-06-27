# ADR-018: Knowledge Network Import Pipeline and Local Re-Validation Ratchet

**Status:** Proposed
**Date:** 2026-06-25

## Context

`prompts/modules/network.md` makes all imported patterns advisory. ADR-010 requires a validation gate before staging and explicit owner promotion before any packet becomes canonical. The v0.2 network feature adds a publish/import pipeline, a signed catalog, and Ed25519 packet identity, and that pipeline must honour both invariants end-to-end.

The red-team pass against the v0.2 draft found two load-bearing gaps. First (H2): the poller and verifier were not scoped to a specific execution context, meaning an agent turn could invoke them against a PR-head copy of `verify-packet.mjs` or `validate-knowledge-packet.mjs`, turn every signature and redaction check into an attacker-controlled no-op, and then self-assert the `pending-local-validation` label on arbitrary bytes. Second (H4): verification was performed at staging time but not at promotion time; a packet staged while a signing key was active could later be promoted after that key was revoked, because revocation and adoption were separated in time with no re-check.

Both gaps are structural. Fixing H2 requires pinning the verification path to the same execution-scope class as `guard-ratchet.mjs`; the ARCHITECTURE.md "Trust boundaries and security invariants" section already states that validators run from the base branch, not the PR head. The network scripts must join that class. Fixing H4 requires promotion to re-run `verify-packet.mjs` so that revocation and staleness cannot race adoption. This ADR encodes both fixes as invariants, and restates ADR-010 as the network ratchet governing all imported candidates.

## Decision

**1. `scripts/poll-network.mjs` is fetch-filter-verify-stage only, and runs from the protected base branch in CI scope (ADR-019), never in an agent turn.**

The script's execution is strictly bounded:

- **(a)** Read `.modonome/config.yaml` network levers and `.modonome/NETWORK.md` `Allowed peers` / subscribed axes; exit 0 silently if `Mode: disabled`. The agent cannot flip `Mode:`: that field is an owner/CODEOWNERS surface.
- **(b)** Fetch the signed `index.json` from the allowlisted catalog origin and verify its Ed25519 signature and monotonic `sequence` (ADR-015). Any signature failure or sequence rollback aborts the entire poll with a non-zero exit; no packets are staged.
- **(c)** Diff candidate ids against the CI-written seen-id ledger (`.modonome/network/ledger.jsonl`), not against agent-writable `NETWORK.md` (ADR-016). Download only new, non-expired packet bodies for subscribed axes from allowlisted origins via the resolved-IP SSRF guard in `scripts/lib/net-guard.mjs` (no redirect-following; IP validated against loopback, RFC1918, link-local `169.254.0.0/16`, and IPv6 ULA/link-local deny ranges; response size and timeout capped).
- **(d)** For each downloaded packet, `scripts/verify-packet.mjs` runs its ordered check: recompute the content-addressed `id` (reject mismatch); verify Ed25519 signature against the active, in-window key in this repo's committed `.modonome/peer-keys.json` (no TOFU; absent or malformed signature is a hard fail, not a fallback); run `scripts/validate-knowledge-packet.mjs` (schema, per-leaf + decoded-form redaction scan, `classification === "public"` import gate); check anti-replay against both seen-id and owner-rejected-id ledgers; reject if expired or older than the receiver-side `network_catalog_max_age_hours` cap (`expires_at` may only shorten validity, never extend it past this cap).
- **(e)** Atomic temp+rename survivors into `.modonome/network/inbox/` with status `pending-local-validation`, written only by the CI job and recorded in the CI-written audit log (`.modonome/network/audit.jsonl`). The agent can read inbox entries but cannot write them or forge their status label. This closes H2.

`poll-network.mjs` never promotes a packet, never runs local gates, and never edits canonical rules or config. One quarantined packet (id + reason logged) does not abort the batch; a partial fetch stages the verified subset and records missing ids to `.modonome/network/pending-ids.json` for the next cycle. Network unreachable exits 0 with a warning (fail-closed-to-no-adoption); `--strict` mode returns non-zero.

**2. The network ratchet is ADR-010 applied to imported candidates, with mandatory re-verification at promotion.**

A packet staged as `pending-local-validation` is adopted only after all four conditions are met in the receiving repo:

- The receiving repo records its own passing gates against the proposed pattern (local gates, not the origin repo's gates): "earned locally, re-passes locally".
- An independent checker (ADR-006) verifies the gate evidence.
- An owner decision is made; if the pattern touches any path under `scripts/`, `schemas/`, `templates/`, `prompts/`, `.github/`, or `bin/`, this is Tier 4 and requires explicit principal decision.
- A measured local impact is recorded.

The origin repo's gate results count for nothing locally; the origin is transport, not authority.

**Promotion re-runs `scripts/verify-packet.mjs`** against the current `.modonome/peer-keys.json` and the receiver's `network_catalog_max_age_hours` cap at the moment of promotion. A packet whose signing key is now revoked, expired, or absent from the allowlist, or whose entry is now stale under the receiver cap, **cannot be promoted**. It is auto-quarantined per ADR-017 step 4 and recorded in the rejected-id ledger. Verification and adoption are no longer separated in time; revocation and staleness cannot race adoption. This closes H4.

**3. Import-side classification and redaction gates; `classification` and `redaction_status` are untrusted self-assertions.**

`poll-network.mjs` stages only packets where `classification === "public"`. This is a necessary condition, not a sufficient one. `classification` and `redaction_status` are self-asserted by the publisher; the receiver's per-leaf + decoded-form redaction scan in `scripts/validate-knowledge-packet.mjs` is authoritative (closes H9). A misconfigured publisher whose packet carries `classification: "internal"` is rejected by the receiving repo even though the publish-side `validate-knowledge-packet.mjs` already blocks `restricted` and `confidential`.

`data_residency_constraint` is recorded in the packet schema (`schemas/knowledge-packet.schema.json`) and surfaced in tooling output as "field present, not enforced in v0.2". The field is advisory in v0.2 and its unenforced status is visible in the staging log, not buried in prose documentation. Enforcement (skip-on-mismatch) is deferred to v0.3.

**4. Dedup, rejected, and retry ledgers are CI-written and agent-read-only.**

Two ledger files exist, both written only by the base-branch CI job running `poll-network.mjs`:

- `.modonome/network/ledger.jsonl`: an append-only event log holding both *seen-id* entries
  (successfully staged or previously processed) and *rejected-id* entries (owner-rejected
  packet ids); a rejected id stays recorded so it is not re-presented in subsequent cycles.
- `.modonome/network/pending-ids.json`: partial-fetch retry set; missing ids from an interrupted batch.

The agent cannot write any of these files (closes H6). The CI-written audit log (`.modonome/network/audit.jsonl`) records every fetch, stage, quarantine, rejection, and expiry event; it is append-only and agent-read-only.

**5. The agent cannot self-enable, self-promote, or forge ledger or inbox state.**

The following are owner/CODEOWNERS/CI surfaces that the agent may read but never write:

- `Mode:` and `Allowed peers` in `.modonome/NETWORK.md`.
- `.modonome/peer-keys.json` and the catalog-origin allowlist (CODEOWNERS-gated, Tier 3+).
- All CI-written ledger files and inbox status labels.

`network_opt_in` and `network_opt_out` work items in `schemas/work-item.schema.json` carry unconditional `touches_protected_path: true` and `owner_decision_required: true`; they cannot be claimed autonomously. Adding a catalog, enrolling a peer key, or changing `Mode:` is Tier 4 and requires an explicit owner decision. Key enrollment additionally requires an out-of-band fingerprint confirmation through a channel independent of the catalog transport. Committing a key to `peer-keys.json` is not authentication; the out-of-band match is (ADR-008 analogue).

## Consequences

- Repo sovereignty and the CODEOWNERS boundary are preserved end-to-end: all verification code and all staging/label writes execute from the protected base branch in CI scope (ADR-019), outside agent scope. The subverted-verifier attack class (H2) is closed structurally, not by convention.
- Imported patterns are strictly additive and cannot regress the host pipeline: `poll-network.mjs` never promotes, never edits canonical rules, and fails closed to no-adoption on network error, signature failure, or sequence rollback.
- A revoked key or stale inbox entry cannot be promoted: promotion re-runs `scripts/verify-packet.mjs` immediately before the owner acts, so revocation and staleness cannot race adoption (H4 closed).
- The staging surface is bounded and auditable: all inbox entries carry CI-attested provenance; the CI-written audit log records every import event; the agent's read-only view of the inbox is complete but the agent cannot forge it.
- Promotion remains a human act exactly as ADR-010 demands: local gates, independent checker (ADR-006), owner decision, and measured local impact are all required before any imported pattern becomes canonical.
- `classification` and `redaction_status` are treated as untrusted throughout the import path; the receiver's `scripts/validate-knowledge-packet.mjs` redaction scan is the authoritative confidentiality control.
- The `data_residency_constraint` field ships as advisory in v0.2 with a visible "not enforced" note in tooling output; enforcement in v0.3 requires no schema change.
- `scripts/poll-network.mjs`, `scripts/verify-packet.mjs`, `scripts/validate-knowledge-packet.mjs`, `scripts/sign-packet.mjs`, and their `scripts/lib/*` dependencies are all Tier 3 protected paths; changes require CODEOWNERS approval and cannot be merged from a PR head execution context.
