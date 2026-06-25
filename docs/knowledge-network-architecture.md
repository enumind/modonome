# Cross-Repo Knowledge Network: v0.2 Architecture

**Status:** Final for owner decision (Tier 4)
**Date:** 2026-06-25
**Spec of record:** `prompts/modules/network.md`, `schemas/knowledge-packet.schema.json`,
`scripts/validate-knowledge-packet.mjs`
**Default:** OFF. Pull-only. Sovereignty non-negotiable.

## 1. Purpose and scope

The knowledge network lets a pattern that was *earned* in one repo (proven by passing that
repo's own gates with independent-checker evidence) travel to other repos in the same
single-org estate. Every receiving repo re-verifies the pattern under its **own** gates
before adoption. Nothing crosses on trust alone.

This document fixes the v0.2 architecture: what ships, what is deferred, the transport/sync
model, the catalog format, the signing/key model, the import (network-ratchet) pipeline, and
the **execution-scope** the network code runs in (the change that makes all of it real). It
binds the network to modonome's existing structural invariants: the CI boundary
(ARCHITECTURE.md "Trust boundaries and security invariants": validators run **from the base branch,
not the PR head**), CODEOWNERS-gated protected paths, `validate-knowledge-packet.mjs`, the
ADR-010 trust model, the ADR-011 CI-env-var trust scope, and the ADR-008 trusted-author
allowlist analogy. It adds the minimum new surface required.

The network feature is enabled only when `repo_network_enabled` is set in
`.modonome/config.yaml`, and even then defaults to dry-run (`repo_network_dry_run`). The
per-repo `.modonome/NETWORK.md` `Mode:` line defaults to `disabled`. Enabling network
behavior, adding a catalog, or enrolling a peer key is **Tier 4** work and requires an
explicit owner decision.

## 2. The execution-scope correction (read this first)

The red-team pass found the load-bearing flaw: the signing/identity/redaction edifice is only
as trustworthy as the *code that runs the checks*, and that code was unspecified as to
**where it executes**. ARCHITECTURE.md makes CI integrity rest on validators running **from
the base branch, not the PR head**. CODEOWNERS protects *merge*, not *execution of a
working-tree copy before merge*. A poll invoked from a feature branch (or inside an agent
turn) would run that branch's possibly-subverted `verify-packet.mjs` / `canonical-json.mjs` /
`packet-id.mjs`, turning every signature, id, and redaction check into an attacker-controlled
no-op.

**Resolution (ADR-019, new):** the network poll/verify/validate path joins the same
base-branch CI-execution trust class as `guard-ratchet.mjs`. `poll-network.mjs`,
`verify-packet.mjs`, `validate-knowledge-packet.mjs`, and every `scripts/lib/*` they load run
**from the protected base branch in CI scope**, never from a PR head and never as an in-agent-turn
invocation. The job refuses to run unless its checkout is the protected branch and the
on-disk hash of each network script matches its base-branch hash. The inbox status
(`pending-local-validation`) and the audit/ledger files are **written only by this CI job**;
the agent can read them but cannot forge them. Without this, every other mitigation below is
theater. It ships in v0.2 as a hard precondition, not a nicety.

## 3. What v0.2 ships (and what it does not)

The panel split on scope: the YAGNI seat argued for git-native pull plus the import gate and
nothing else; three builder seats (sync, security, catalog) argued the load-bearing details
(content-addressing, signing, a pinned catalog record) must ship or the feature is unsafe the
moment it reaches more than one peer. **Resolution: ship the trust-critical core, defer the
convenience and inbound-surface layers.** The deciding principle is modonome's own: *code over
prose for anything load-bearing, minimum new attack surface, owner-gated.* The import gate,
the catalog format, and the base-branch execution scope are load-bearing for the v0.2
promise; an inbound webhook listener is not.

### Ships in v0.2

1. **Base-branch CI execution for the whole network path.** (ADR-019.) `poll-network.mjs`,
   `verify-packet.mjs`, `validate-knowledge-packet.mjs`, and their `scripts/lib/*` run only
   from the protected base branch in CI scope, with a self-hash guard against running a
   PR-head copy. Inbox status and audit/ledger writes are CI-scope-only. This is the
   precondition for the signing/identity stack below to mean anything.
2. **Content-addressed packet identity.** `id = "sha256:" + hex(sha256(canonical-JSON(packet
   minus volatile/signature fields)))`. Shared library `scripts/lib/canonical-json.mjs`
   (RFC 8785 JCS) and `scripts/lib/packet-id.mjs`. `validate-knowledge-packet.mjs` asserts
   `packet.id === computeId(packet)` and rejects mismatches as tampered. (sync + security
   seats converged.)
3. **Catalog as a signed static flat-file index in a dedicated git repo.** No service, no
   ranking, no query API. `schemas/catalog-index.schema.json` with `additionalProperties:
   false` and a prohibited-fields posture (no `name`, `ranking_score`, `stars`,
   `adoption_count`, `owner_identity`). The signed index carries a **monotonic `sequence`**
   that the receiver enforces against rollback (§7, H11). `docs/catalog-format.md` defines the
   layout. Opt-in/opt-out are pull requests against the catalog repo.
4. **Ed25519 signing/verification with out-of-band key enrollment.** `scripts/sign-packet.mjs`
   (reads the private key from `MODONOME_SIGNING_KEY`, harness/CI env, never agent-readable;
   ADR-011 analogue) and `scripts/verify-packet.mjs`. Signatures cover a domain-separated JCS
   digest of the packet sans signature envelope. A committed, CODEOWNERS-gated peer-key
   allowlist (`.modonome/peer-keys.json`, schema `schemas/peer-keys.schema.json`) is the trust
   root: **no TOFU**. Enrollment requires an **out-of-band fingerprint confirmation**:
   committing a key is not authentication; an independent-channel fingerprint match is (§6,
   H3). Both scripts print the short fingerprint so owners can compare.
5. **`scripts/poll-network.mjs`: pull-only, side-effect-bounded, CI-scope import.** Outbound
   HTTPS GET only, **redirect-following disabled**, resolved-IP SSRF guard (not regex-on-URL),
   response size and timeout capped (§7, H10). Verifies the signed index and its monotonic
   sequence, downloads only new/non-expired bodies for subscribed axes, recomputes id,
   verifies signature against the local allowlist, runs `validatePacket()`, and stages
   survivors as **advisory, pending-local-validation** into `.modonome/network/inbox/`. It
   never promotes, never runs local gates, never edits canonical rules. Fail-closed-to-no-adoption.
6. **The network ratchet (local re-validation contract) with promotion-time re-verification.**
   A staged packet is adopted only after the receiving repo records its own passing gates, an
   independent checker, an owner decision, and a measured impact: exactly ADR-010, applied to
   imported candidates. **Promotion re-runs `verify-packet.mjs`**: a packet whose signing key
   is now revoked/expired, or whose receiver-side max-staleness has elapsed, **cannot be
   promoted** (§6, H4). Verification and adoption are no longer separated in time.
7. **Auto-generated NETWORK.md sections, with the authoritative ledgers moved off the
   agent-writable surface.** The dedup/seen-id ledger, the rejected-id ledger, and the
   retry/pending-id ledger live in CI-written, agent-read-only stores
   (`.modonome/network/ledger.jsonl`, `pending-ids.json`), not in NETWORK.md. NETWORK.md
   *displays* import state for humans but the verifier never trusts it. The owner-edited
   sections (`Mode:`, `Allowed peers`, `Owner decisions`) stay manual (§7, H6).
8. **Structure-bounded redaction, not pattern-whack-a-mole.** The confidentiality control is
   **deny-by-default on structure**: free-text fields are length-capped and, where possible,
   constrained to enum/taxonomy; the scanner runs **per leaf string** (not over a single
   concatenated `JSON.stringify` blob) plus a decoded-form pass (base64/hex) for the secret
   patterns. Extended `SECRET_PATTERNS` (GitHub `ghp_`, JWT, Slack `xox`, link-local
   `169.254`), tightened RFC3339-UTC timestamps, required `expires_at`, an import-time
   `classification === "public"` gate, and quasi-identifier checks across `measured_impact`,
   `source_stack_fingerprint`, **and the previously-unbounded `evidence` / `validation` /
   `risks`** (§8, H7/H8/H9). `classification` and `redaction_status` are treated as untrusted
   self-assertions; the receiver's scan is authoritative.

### Deferred to v0.3 (explicitly, with triggers)

- **Webhook receiver / any inbound listener.** An inbound HTTP endpoint inverts the pull-only
  trust direction and adds request-auth, replay, DoS, and a pre-validation parse path:
  permanent protected-path maintenance burden for zero capability over polling. Trigger to
  revisit: a measured need for sub-poll-cycle propagation latency that an estate cron cannot
  meet. If ever built, it must be a non-authoritative *hint* that re-enters the exact
  base-branch `poll-network.mjs` verify path, writing only to
  `.modonome/network/webhook-inbox/`, never to the staging surface directly.
- **Real-time / P2P sync, catalog ranking/scoring, peer auto-discovery / gossip.** All
  reintroduce a routing or ranking authority the design forbids. Discovery stays a governance
  act (owner edits `Allowed peers`).
- **Data-residency enforcement and per-alias aggregation budgets.** Recorded as known gaps
  (§9); shipped as schema/config *fields* in v0.2 where cheap, enforced in v0.3.

## 4. End-to-end flow

```
 PUBLISHING REPO (source)                          RECEIVING REPO (any stack)
 ───────────────────────                           ──────────────────────────
 local gates pass                                  [Mode: disabled] -> exit 0 (no-op)
 + independent checker                                       │
 + measured impact                                           │ Mode: opted-in (Tier 4 owner act)
        │                                                    ▼
        ▼                                          CI JOB on PROTECTED BASE BRANCH
 generate packet (advisory)                        (ADR-019: never PR head, never agent turn;
        │                                           self-hash guard on all network scripts)
        ▼                                                    │
 validate-knowledge-packet.mjs                              ▼
   - schema (additionalProperties:false)           poll-network.mjs (outbound HTTPS GET only,
   - per-leaf + decoded redaction / classification   no redirects, resolved-IP SSRF guard)
   - id == sha256(canonical body)   ◄── tamper check        │ 1. fetch + verify signed index.json
        │ pass                                               │    (Ed25519 + monotonic sequence;
        ▼                                                    │     reject rollback; abort all on fail)
 sign-packet.mjs (MODONOME_SIGNING_KEY,            │
   harness/CI env, never agent-readable)           │ 2. diff vs CI-written seen-id ledger;
        │                                          │    download only NEW, non-expired bodies
        ▼                                          │    for SUBSCRIBED axes
 publish: append signed body to catalog repo       ▼
 via PULL REQUEST (opt-in is owner-gated)          per-packet, in order (verify-packet.mjs):
        │                                          │ a. schema validation
        ▼                                          │ b. validate-knowledge-packet.mjs (redaction)
 ┌──────────────────────────────────────┐         │ c. signature present + well-formed (absence = HARD FAIL)
 │ CATALOG = dumb signed static bytes    │         │ d. key_alias -> ACTIVE, in-window key in THIS
 │ (dedicated git repo / signed HTTP dir)│         │    repo's peer-keys.json AND pubkey byte-equals
 │  /catalog/index.json (signed, seq#)   │         │    the allowlisted key (out-of-band enrolled)
 │  /catalog/packets/<id>.json (immutable)│        │ e. Ed25519 verify over recomputed signed_bytes
 │  NO ranking. NO query API. NO service.│         │ f. recompute id (reject mismatch); anti-replay:
 └──────────────────────────────────────┘         │    reject if id in seen-id/rejected ledger or
                                                   │    superseded; reject if expired OR older than
                                                   │    receiver max-staleness (expires_at can only
                                                   ▼    SHORTEN validity, never extend it)
                                                   atomic write (temp+rename) to
                                                   .modonome/network/inbox/ (status pending-local-validation,
                                                   written by CI job only); quarantine one bad packet,
                                                   continue batch
                                                            │
                                                            ▼
                                                   NETWORK RATCHET (local re-validation = ADR-010):
                                                   - PROMOTION re-runs verify-packet.mjs:
                                                     revoked/expired key OR stale entry => cannot promote
                                                   - this repo runs ITS OWN gates against the pattern
                                                   - independent checker (ADR-006)
                                                   - owner decision (Tier 4 if it touches a protected path)
                                                   - measured local impact recorded
                                                            │ owner promotes
                                                            ▼
                                                   adopted; NETWORK.md "Packets imported" updated
                                                            (display only; ledger is CI-written)
```

The catalog is *transport*, not authority. Selection (which axes, which peers) is entirely
local. The only trust decisions happen in-repo, in CI scope, against committed,
CODEOWNERS-gated state. The code making those decisions runs from the base branch.

## 5. Sync decision: polling-first, why

**Decision: outbound pull (poll) is the source of truth; there is no fast path that trusts
freshness.** Reasoning, in priority order:

1. **Firewall/trust posture.** Most estate repos sit behind firewalls with no inbound HTTP.
   Pull is a single outbound HTTPS GET to a signed URL: no inbound ports, no listener to
   attack. This is why polling is the right default for a corporate estate, and why
   MCP-server-only (not CI-portable) and P2P mesh (overkill for a single org) were rejected.
2. **CI portability + base-branch execution.** A nightly/per-cycle `node
   scripts/poll-network.mjs` runs in any CI (Actions, Jenkins, GitLab) with only network
   egress, matching the ARCHITECTURE.md invariant that modonome "needs no central service."
   Critically, it runs **from the base branch in CI scope** (ADR-019), the same trust class as
   `guard-ratchet.mjs`: a scheduled CI job, never an agent-turn invocation. We keep a
   first-class script (not raw `git fetch`) because id-recompute, signature verification,
   expiry, atomic staging, and SSRF defense live in it.
3. **Staleness is the safe direction, but only with a receiver-side cap.** Because adoption
   requires local gates regardless, a stale, replayed, out-of-order, or missed packet can
   never cause a wrong adoption, only a missed opportunity. So `published_at` / `expires_at` /
   catalog `generated_at` are **advisory metadata, not trust inputs**. Two corrections from the
   red-team pass: (a) `expires_at` is attacker-controlled, so it may only **shorten** validity,
   never extend it past the receiver's own `network_catalog_max_age_hours` cap; (b) the
   `network_clock_skew_seconds` tolerance (default 300) is applied **conservatively only**:
   ambiguous-at-the-boundary is treated as expired, never as fresh (§7, H5). Ordering uses
   `lineage.supersedes_packet_ids`, never timestamps.

A webhook would buy only latency reduction at the cost of an inbound attack surface and a
delivery-reliability problem polling does not have. Deferred (§3).

## 6. Trust and threat model

The trust root is **the receiving repo's committed, CODEOWNERS-gated state, evaluated by code
running from the protected base branch in CI scope**: its `.modonome/config.yaml` levers, its
`Allowed peers` and `peer-keys.json`, and its own gates. Everything off-repo (the catalog,
endpoint URLs, packet bodies, signatures) is untrusted transport until verified against that
committed state by base-branch code.

| Threat | Mitigation |
|---|---|
| **Subverted verifier (edit the checking code on a branch, then poll)** | The network poll/verify/validate path runs **only from the protected base branch in CI scope** (ADR-019), the same class as `guard-ratchet.mjs`. The job refuses to run on a PR head and self-hash-guards each network script against its base-branch hash. CODEOWNERS protects merge; ADR-019 protects *execution*. |
| **Agent forging "pending-local-validation"** | Staging and inbox status are written **only by the base-branch CI job**, recorded in a CI-written, agent-read-only audit log. The owner's promotion view shows provenance from the CI run, not an agent-asserted label. |
| **Tampered/forged packet body** | Ed25519 signature over domain-separated JCS digest, verified against the local allowlist after download; `id` recomputed and asserted. Catalog compromise cannot forge an adoptable packet, at most withhold or replay. |
| **Signature stripping / downgrade-to-unsigned** | Under signing mode, a missing/malformed signature is a **hard failure**, never a fallback to advisory-unsigned. |
| **Self-certifying key / TOFU** | The packet's embedded pubkey is ignored unless it byte-equals an `active`, in-window key in this repo's `peer-keys.json`. No TOFU. |
| **Key-enrollment bootstrap (attacker key supplied at enroll time)** | Enrolling a key requires **out-of-band fingerprint confirmation** through a channel independent of the catalog/transport; `added_by` records the human who verified it; sign/verify print the short fingerprint for comparison. Committing the key is not authentication; the out-of-band match is. Tier 4, CODEOWNERS-gated edit (H3). |
| **Replay / rollback of a single packet** | Anti-replay against the **CI-written** seen-id/rejected-id ledgers (not agent-writable NETWORK.md); `lineage.supersedes_packet_ids`; locally-recorded adoption state wins. A superseding packet retires the prior one only **after** it passes local gates. |
| **Rollback of the whole index (withhold a security fix)** | The signed `index.json` carries a **monotonic `sequence`**; the receiver rejects any index whose sequence is below the last one it successfully processed (H11). |
| **Revoked-key packet promoted later (verify/adopt time-separation)** | **Promotion re-runs `verify-packet.mjs`**: signature + key status (active, in-window) + receiver max-staleness are re-checked immediately before owner promotion; revoked/expired/stale staged entries auto-quarantine and cannot be promoted (H4). |
| **Attacker-favorable expiry / clock skew** | `expires_at` may only shorten validity; receiver-side `network_catalog_max_age_hours` caps staleness independent of the packet's claim; skew tolerance applied conservatively (ambiguous = expired) (H5). |
| **Malicious endpoint URL (SSRF/exfil), DNS rebinding, metadata-endpoint redirect** | Poller fetches only from allowlisted catalog origins (Tier 4 to change). **Redirect-following disabled**; the **resolved IP** (not the hostname string) is validated against a denylist including loopback, RFC1918, link-local `169.254.0.0/16`, and IPv6 ULA/link-local. TLS verification never disabled; response size + timeout capped. SSRF defense does not rely on the redaction regexes (H10). |
| **Confidential/internal packet entering a repo** | Import-side gate stages only `classification === "public"`; `classification`/`redaction_status` are untrusted self-assertions. The receiver's redaction scan is authoritative (H9). |
| **Evadable regex redaction (encoded / split / free-text secrets)** | Redaction is **deny-by-default on structure**: free-text fields length-capped and enum/taxonomy-bounded where possible; the scanner runs **per leaf string** plus a base64/hex-decoded pass; previously-unbounded `evidence` / `validation` / `risks` are tightened with `additionalProperties:false`, length caps, and `run_id`/`ref` format restrictions enforced in schema, not prose (H7/H8). |
| **Quasi-identifier deanonymization** | `measured_impact` constrained to relative bands/percentages when a `source_repo_alias` is present; `source_stack_fingerprint` normalized to a coarse taxonomy token (version strings `/\d+\.\d+/` rejected); `validation.commands[].command`, `risks`, `pattern`, `problem_pattern` length-capped and stripped of refs/hostnames/paths in schema. |
| **Self-promotion / sovereignty breach** | `poll-network.mjs` is a fetch+filter, never an adopter; adoption is ADR-010 (local gates + independent checker + owner decision). The agent cannot write `Mode:`, `Allowed peers`, `peer-keys.json`, or the CI-written ledgers; those are owner/CODEOWNERS/CI surfaces. |
| **Network outage blocking the host pipeline** | Fail-closed-to-no-adoption: catalog unreachable -> exit 0 with a warning, import nothing. `--strict` for non-zero. Per-packet quarantine; invalid index signature or sequence-rollback aborts the whole poll. Atomic temp-file+rename mirrors ADR-007. |
| **Private signing key exfiltration** | `MODONOME_SIGNING_KEY` is a harness/CI secret injected like `ANTHROPIC_API_KEY` (ADR-011); never written to agent-readable files, never in the prompt. The redaction scanner still trips on a leaked `BEGIN PRIVATE KEY`. Signing adds authenticity, not confidentiality. |

## 7. Configuration and protected-path posture

- New levers (`schemas/config.schema.json`): `network_clock_skew_seconds` (default 300,
  applied conservatively), `network_catalog_max_age_hours` (receiver-side staleness cap, also
  the promotion re-verify horizon), `network.max_packets_per_alias_per_month` (default 10).
  Existing `repo_network_enabled` / `repo_network_dry_run` gate the whole module.
- Protected paths (>= Tier 3 via CODEOWNERS): all new scripts under `scripts/`, all new
  schemas under `schemas/`, the live `.modonome/peer-keys.json`, and the catalog-origin
  allowlist. The CI-written ledgers (`.modonome/network/ledger.jsonl`,
  `pending-ids.json`, `audit.jsonl`) are agent-read-only, written only by the
  base-branch CI job. Adding a catalog or a peer key is Tier 4 (owner decision only).
- `network_opt_in` / `network_opt_out` added to `schemas/work-item.schema.json` with
  unconditional `touches_protected_path: true` and `owner_decision_required: true`; they
  cannot be claimed autonomously. The agent may not flip `Mode:`, edit the allowlist, or write
  any ledger.

## 8. Known gaps recorded but not enforced in v0.2

These are real and acknowledged; they ship as *fields/config* where cheap and as *documented
v0.3 work* otherwise, so the schema does not have to change again to enforce them. Carrying
unenforced fields risks a false sense of coverage. Each is labeled advisory-in-v0.2 in both
schema `description` and NETWORK.md, and the receiver emits a "field present, not enforced in
v0.2" note so the gap is visible in tooling output, not buried in prose.

- **Data residency.** `data_residency_constraint` (enum) on the packet schema and an
  `Allowed residency zones` line in NETWORK.md as advisory in v0.2; enforce skip-on-mismatch
  in v0.3. Relevant given the EU AI Act enforcement date (2026-08-02).
- **Cross-packet aggregation / linkage.** `network.max_packets_per_alias_per_month` (default
  10) recorded as config; enforcement deferred. The catalog storing only signed bodies + hash
  identity (not a queryable join surface) already limits operator-side linkage.
- **Network boundary audit log.** `.modonome/network/audit.jsonl` (append-only, agent-read-only,
  **written only by the base-branch CI job**) is wired into `poll-network.mjs` for
  fetched/staged/rejected/expired/sign-verify events; a check-drift truncation guard lands
  alongside v0.3 enforcement work.

## 9. Concrete v0.2 artifact list

| Artifact | Tier | Purpose |
|---|---|---|
| `scripts/lib/canonical-json.mjs` | 3 | RFC 8785 JCS, shared by sign/verify/id |
| `scripts/lib/packet-id.mjs` | 3 | content-addressed id derivation |
| `scripts/lib/redaction-patterns.mjs` | 3 | per-leaf secret patterns + decoded-form pass |
| `scripts/lib/net-guard.mjs` | 3 | resolved-IP SSRF denylist, no-redirect fetch, size/timeout caps |
| `scripts/sign-packet.mjs` | 3 | Ed25519 sign from `MODONOME_SIGNING_KEY`; prints fingerprint |
| `scripts/verify-packet.mjs` | 3 | ordered 6-step import-time verification; reused at promotion |
| `scripts/poll-network.mjs` | 3 | base-branch CI pull+verify+validate+stage |
| `schemas/catalog-index.schema.json` | 3 | catalog record contract, no-ranking, signed `sequence` |
| `schemas/peer-keys.schema.json` | 3 | key allowlist (alias, pubkey, status, windows, out-of-band `added_by`) |
| `templates/.modonome/peer-keys.json` | 3 | empty seed allowlist |
| `docs/catalog-format.md` | 1 | index.json + /packets/<id>.json layout, sequence semantics, fixtures |
| `examples/` packet + catalog fixtures | 1 | round-trip test material |
| `test/` validator fixtures | 1 | `ghp_`/JWT/`xox`, base64-encoded secret, split-field secret, id-mismatch, sequence-rollback |
| `.github/workflows/modonome-network.yml` | 3 | base-branch-checkout CI poll job (ADR-019) |
| Edits to `scripts/validate-knowledge-packet.mjs` | 3 | id check, per-leaf+decoded scan, tightened RFC3339-UTC timestamps, classification import gate, quasi-id checks, expanded SECRET_PATTERNS |
| Edits to `schemas/knowledge-packet.schema.json` | 3 | `id` pattern `^sha256:[0-9a-f]{64}$`, `signature` object, UTC `date-time` timestamps, required `expires_at`, bounded `evidence`/`validation`/`risks` (`additionalProperties:false` + caps), `data_residency_constraint`, normalized `source_stack_fingerprint` |
| Edits to `schemas/config.schema.json` | 3 | `network_clock_skew_seconds`, `network_catalog_max_age_hours`, `network.max_packets_per_alias_per_month` |
| Edits to `templates/.modonome/NETWORK.md` | 3 | structured `Allowed peers`, residency line, display-only import state (ledgers moved to CI-written stores) |
| Edits to `ARCHITECTURE.md` | 3 | extend the base-branch-execution invariant (Trust boundaries section) to the network scripts |

