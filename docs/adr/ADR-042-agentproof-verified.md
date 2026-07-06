# ADR-042: AgentProof Verified and the Hardened Registry

**Status:** Accepted
**Date:** 2026-07-04
**Milestone:** 7 (Distribution and adoption)
**Related:** ADR-003 (AgentProof portability), ADR-027 (AgentProof 25-scenario expansion),
ADR-036 (Policy-pack manifest and disclosure attestation)

## Context

`agentproof/` (25 normative plus 10 extended scenarios) proves that Modonome's own gate
integrity detector (`scripts/guard-ratchet.mjs`) catches known gaming patterns, and
`README.md`, `agentproof/README.md`, and `RELEASE-EVIDENCE.md` all state the resulting
score as plain text ("25/25 HARDENED"). That score is entirely self-graded today: the
same project owns the controls (`guard-ratchet.mjs`), the fixtures (`agentproof/fixtures/`),
and the pass/fail criteria (`agentproof/scenarios/`), and reports the result as prose in
a README a fork can edit freely. Nothing stops a fork from claiming "25/25 HARDENED"
without the number being real, and nothing lets a third party point at independent
evidence that a given commit actually earned it.

`scripts/ratchet-attestation.mjs` already solved an adjacent problem: it wraps the
gate-integrity verdict (did this diff weaken a test) in a signed in-toto Statement, so
CI can attest it keylessly with Sigstore/Rekor via `actions/attest@v2` rather than
asking a reader to trust plain text. That script already has an `--agentproof` flag that
runs `agentproof/runner.mjs --json` and embeds the result as a sub-field of the
gate-integrity predicate (`predicate.agentProof`). That flag is a real, shipped
capability, not an oversight this ADR is unaware of. It solves a narrower problem than
this one: it decorates the gate-integrity claim ("this diff did not weaken tests") with
AgentProof context, when a caller opts in. It does not let AgentProof's own conformance
score stand on its own, be the subject of a Statement in its own right, or be verified or
referenced independently of a gate-integrity run.

## Decision

**Part 1: a first-class attestation.** Add `scripts/agentproof-attestation.mjs`, mirroring
`ratchet-attestation.mjs`'s shape (in-toto `Statement`, subject resolution via
`git rev-parse`, a commit-based timestamp for reproducibility, always-exit-0 generation)
but with its own predicate type, `https://modonome.com/attestation/agentproof-conformance/v1`,
and its own subject: the repository at the current commit, not a diff between two refs.
The predicate carries the normative score, extended score, total score, a derived
HARDENED/PARTIAL/UNHARDENED level (the same thresholds `agentproof/runner.mjs` itself
uses), a per-scenario pass/fail breakdown, the tool version, and the commit timestamp.
This is deliberately a new script and a new predicate type, not an extension of
`ratchet-attestation.mjs --agentproof`, because the two answer different questions with
different subjects: "was this diff gate-weakening" (gate-integrity, diff-scoped, subject
is a commit range) versus "did this commit's AgentProof run score X/25, independently
verifiable" (agentproof-conformance, commit-scoped, subject is the run itself). Folding
the second into the first's optional sub-field would leave the second claim unable to be
verified or cited on its own; a downstream consumer who only cares about the AgentProof
score would have to depend on the gate-integrity predicate's shape and its verdict
semantics to get at it.

Generation always succeeds regardless of score, for the same reason
`ratchet-attestation.mjs` always succeeds: the verdict lives inside the predicate, so a
low score still produces a receipt that records it truthfully, rather than the tool
refusing to run and leaving no evidence at all.

**Part 2: CI signing.** Add an `agentproof` input to `action.yml`, parallel to the
existing `receipt` input: same `if: always()` gating (a low or failing score still gets
a receipt), same `id-token: write` and `attestations: write` permission requirements, same
`actions/attest@v2` step shape, with `predicate-type: 'https://modonome.com/attestation/agentproof-conformance/v1'`
and `subject-name: agentproof-conformance` (parallel to the existing receipt step's
`subject-name: gate-integrity`). The existing `receipt` input and its steps are untouched.

**Part 3: the Hardened Registry.** Per this repository's explicit "no central service"
architecture (`ARCHITECTURE.md`), the registry is a single committed file,
`docs/agentproof-registry.json`, an array of entries under `entries`, each
`{ repo, run_url, digest, verified_at }`. Every entry represents one independently-run,
publicly-inspectable AgentProof conformance run that someone submitted via reviewed pull
request; there is no submission service, no API, and no automated ingestion. This mirrors
`adapters.json`'s relationship to `scripts/check-licenses.mjs` (ADR-032): a
schema-validated JSON manifest (`schemas/agentproof-registry.schema.json`) plus a small,
offline check script (`scripts/check-agentproof-registry.mjs`) that validates structure
and does a defensive, non-network sanity check on `run_url` (it must look like a plausible
`https://` URL; the check never fetches it, keeping this repository's tests
network-free). Registry review is human: a reviewer follows `run_url` and inspects the
signed attestation before merging the entry, the same way `--adopt` in
`build-policy-attestation.mjs` (ADR-037) requires a human to inspect a foreign policy pack
before vendoring it.

The registry ships with `{"entries": []}`: this repository has no real third-party
conformance run to list yet, and a fabricated "example" entry would be the exact
self-application smell `check-self-application.mjs` already forbids for a committed
`.modonome/metrics.jsonl` (shipping synthetic activity as real), and the exact reasoning
ADR-037's Consequences section gives for why `.modonome/policy-packs/` ships empty rather
than with a fabricated "adopted" file. An empty array is not a placeholder pending
content; it is the honest starting state.

`check-agentproof-registry.mjs` is added to the `verify` chain in `package.json`. This is
safe to do unconditionally, unlike most new gates: an empty-array registry always
validates against its own schema, so the gate is cheap and cannot spuriously fail on a
repository that has not yet received its first submission.

## Consequences

- A commit's AgentProof score can be checked independently of trusting this repository's
  README: `cosign verify` (or `gh attestation verify`) against the Sigstore/Rekor entry
  proves the Statement was signed by this repository's CI identity for that exact commit,
  and the predicate's per-scenario breakdown is inspectable without re-running anything.
- `ratchet-attestation.mjs --agentproof` is unchanged and still useful for its own case:
  a caller who wants AgentProof context alongside a gate-integrity verdict, in one
  Statement, still has that option. The two scripts and their predicate types coexist and
  are not expected to converge; each is a subject-scoped for its own claim.
- The Hardened Registry proves independence only for the entries it lists, not for
  AgentProof in general. A repository absent from the registry has simply not submitted
  one, which says nothing about its conformance either way. The registry cannot itself
  detect a forged `run_url` or a signature that verifies but was produced by a
  cooperating pair of accounts; it raises the cost of a false claim (it must survive
  public review and point at a real, checkable signature) without eliminating it. Human
  PR review, not the schema, carries that judgment.
- No network call anywhere in this repository's own tests or gates: `run_url` is checked
  for plausible shape only. Confirming a listed run actually verifies against Sigstore and
  Rekor is a manual (or downstream CI) step outside what `npm test` can assert offline.
- `docs/agentproof-registry.json` starting empty means `check-agentproof-registry.mjs`
  passes trivially today. Its value appears the first time a PR adds a real entry; until
  then it is dormant infrastructure, the same category as the `--adopt` machinery in
  ADR-037 before any pack existed to adopt.

## Related

- `scripts/ratchet-attestation.mjs` and its `--agentproof` flag: the related, already-shipped,
  narrower capability this ADR deliberately does not replace or fold into.
- ADR-003 (AgentProof portability): why AgentProof's scoring taxonomy and thresholds are
  a stable, citable contract in the first place.
- ADR-027 (AgentProof 25-scenario expansion): the normative scenario count this
  attestation's `score` field reports against.
- ADR-032 (OSS adapter boundary) and `scripts/check-licenses.mjs`: the schema-plus-check-script
  pattern the Hardened Registry reuses.
- ADR-037 (Policy-pack adoption tooling): the precedent for shipping empty rather than with
  a fabricated example entry, and for human-reviewed vendoring of a foreign artifact.
