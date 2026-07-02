# Changelog

All notable changes to Modonome are recorded here. This project follows semantic
versioning. Any change to a default config lever requires an entry and a schema
version bump. Security fixes are called out in their release notes with the advisory
or CVE identifier where one exists.

---

## Unreleased

### Governed Remediation Phase 2: armed metadata-only commit-history remediator

- Added `scripts/lib/remediate.mjs` (pure planner) and `scripts/remediate.mjs` (CLI,
  also `modonome remediate plan|apply`). This completes the loop Phase 1 left open:
  `hygiene` detects attribution signatures and prints the commit-identity and
  commit-message remedies but defers applying them to "the armed, gated remediator
  (later phase)". `remediate plan` is a tokenless, read-only proposal (no model, no
  network) that prints a deterministic fingerprint; `remediate apply` performs the
  rewrite.
- The applier is metadata-only and provably so: it replays the branch-unique range
  with `git commit-tree`, reusing each commit's original tree object, and verifies
  every rewritten commit's tree SHA is unchanged (and the top tree is unchanged)
  before moving the branch ref, resetting hard to the saved head on any mismatch. It
  is deterministic, re-runnable, and idempotent (a second run is a no-op), and it
  never touches published history: the range is `origin/main..HEAD`, and it refuses on
  the default branch, on a dirty tracked working tree, on a merge in range, and when
  `origin/main` is absent.
- Gated apply behind a new capability flag `remediation_apply_enabled`, default off,
  added to the config schema, both `config.yaml` files, `migrate-config` safe defaults,
  and the prompt core. Following ADR-004 and ADR-024, apply requires
  `autonomy_enabled` and not `dry_run` and the capability flag in config AND the
  authoritative `MODONOME_ARMED=true` in the environment, so a config the agent can
  write can never arm it, and even a fully armed engine will not rewrite history until
  an owner turns this one capability on. `check-promotion-readiness.mjs` now tracks the
  flag, so it cannot reach default-on in a shipped config without a promotion ADR.
- Extended the determinism boundary in `check-gate-dag.mjs`: the strict detectors are
  now proven to reach neither the near-miss widener nor the new applier through their
  import graph, so the detection kernel stays a pure, side-effect-free, base-pinnable
  trust root while the applier depends on the detectors and never the reverse.
- Registered the flag in `apps/control-panel/exposure.json` as a documented exemption:
  its owner-facing lever family (a proposal queue plus an approve action) is the Phase 2
  control-panel follow-up, so apply is CLI-only and owner-gated until then.
- Recorded the trust boundary and the default-off-until-evidence promotion path in
  `docs/adr/ADR-035-metadata-remediator.md`. The lever is additive and off by default,
  so it is backward compatible and needs no schema version bump.

### Governed Remediation Phase 1: near-miss widener and human-only promotion path

- Added `scripts/lib/near-miss.mjs`, a deterministic near-miss widener that flags
  attribution tokens the strict detectors miss: separator and spelling variants of a
  denylisted token (`claude-code`, `claude_code`) and vendors not yet denylisted
  (`mistral`, `grok`). Two precision tiers keep false positives out. Tier 1
  distinctive tokens match by separator-normalized substring on branch names and
  identities; Tier 2 generic words (`assistant`, `grok`, `cohere`) match only as an
  exact segment or word, never in free text. Free-text scanning needs both a
  distinctive-vendor token and an attribution cue, so this repo's legitimate
  `claude`/`gpt` mentions and ordinary `grok`/`cohere` prose never fire. The widener
  imports the strict predicates only to suppress what strict already catches.
- Added `scripts/detect-near-miss.mjs`, an advisory scanner wired into CI. It prints
  a ready-to-paste `LEARNINGS.md` Staged proposal for each near-miss and always exits
  0, so it never blocks a build; `--write` appends the proposal under the Staged cap.
  Promotion into the live denylist stays human-only.
- Gated the promotion path with three deterministic checks that run before the CI
  base-branch checkout, so they judge a promotion PR's own detector changes rather
  than the base copy: `check-attribution-fp-corpus.mjs` (a regression corpus of
  legitimate names, branches, and prose, including the surname "Robin Bott", that
  must never be flagged), `check-regex-safety.mjs` (a ReDoS lint rejecting
  nested-quantifier patterns), and an import-graph rule added to `check-gate-dag.mjs`
  proving the deterministic detectors never import the widener (fuzzy may only
  tighten, never override). Fixed a latent gap where the base-branch checkout blinded
  the detector unit tests on any PR that edits those files, by running them early
  against this branch's own code.
- Enforced the previously-documented 20-entry `LEARNINGS.md` Staged cap in
  `scripts/lib/learnings.mjs` (`readStagedEntries`, `appendStagedEntry`); it refuses
  when full and never auto-evicts.
- Added a Communication convention to `AGENTS.md` and the maker/checker prompts:
  PR bodies, comments, and agent-authored documents lead with a Summary, then
  Details, then an Annexure. Enforced by the checker, not a machine gate.

### Governed Remediation Phase 1: PR body and comment hygiene

- Added `scripts/lib/github-api.mjs`, a minimal read-only GitHub REST client (global
  fetch, injectable for tests, no network at import time, fixed-backoff retry on
  429/5xx), and a `--pr <n>` flag on `modonome hygiene check`/`explain`. It fetches
  the pull request title, body, and conversation comments and scans them with the
  existing strict `detectText`. This closes the one attribution surface no
  tracked-file gate can see: the hosted coding-agent web UI appends a session-URL
  footer to a PR body at creation time, which slipped past every gate on both prior
  merged PRs and had to be cleaned by hand. `--pr` is rejected for `fix`, since
  editing a PR body or comment through the API is a mutating, non-local operation.
- Wired the scan into CI as a `pull_request`-only step using the standard
  `GITHUB_TOKEN` (no new secret), registered in `check-self-application.mjs`.
- Accepted residual risk, documented here for honesty: `hygiene.mjs` and
  `github-api.mjs` are not base-pinned, so a PR could in the same diff neuter the
  `--pr` handler and CI would run the neutered copy. This matches the trade-off
  already accepted for `check-drift.mjs` (it runs the PR's own scripts, relying on
  CODEOWNERS review). Unlike Phase 1's promotion-safety gates, which supplement a
  review a Tier-2 change gets anyway, this `--pr` check is the primary mechanism for
  a gap that had none, so its defeasibility is noted for a future hardening pass that
  base-pins these two files.

### Documentation coherence, SME accuracy, and diagram consistency

- Corrected `docs/compliance/compliance.md` and `docs/specs/governed-autonomy-spec.md`:
  both presented an internal AG-numbered risk taxonomy as if it were a literal restatement
  of the published OWASP Top 10 for Agentic Applications (ASI01 through ASI10). The two
  lists do not correspond one-to-one; the AG numbering predates OWASP's December 2025
  publication and is cited directly by AgentProof scenarios and the ratchet spec, so it is
  relabeled honestly as Modonome's own taxonomy rather than renumbered to match OWASP's,
  which would have broken those existing citations.
- Corrected `docs/compliance/eu-ai-act-classification.md`: cited Annex III "Category 4"
  for critical infrastructure (actually Category 2) and conflated "Category 8: Law
  enforcement and administration of justice" (law enforcement is Category 6;
  administration of justice and democratic processes is Category 8 on its own).
- `GOVERNANCE.md` and `docs/compliance/eu-ai-act-classification.md` both presented
  "Shadow" mode as a live activation-ladder rung with no qualifier, contradicting
  `docs/adr/ADR-002-shadow-mode.md`'s finding that no implementation exists. Both now
  note it is planned (WI-011), matching the caveat ADR-025 already carried.
- `docs/guidelines/markdown-governance.md`'s root allow-list table was missing three
  files the enforcing script actually permits (`CODEX.md`, `CLAUDE.md`,
  `RATCHET-SPEC.md`). Added, with an honest note that `RATCHET-SPEC.md`'s content
  does not match its name or the real ratchet spec and is flagged for owner review
  rather than given an invented justification.
- `docs/README.md` said "34 accepted ADRs"; 9 of the 34 carry `Status: Proposed`.
  Corrected to state both counts.
- Fixed a rendering bug in two Mermaid diagrams in `docs/specs/governed-autonomy-spec.md`:
  edge and node labels used `\n` for line breaks, which Mermaid does not render as one;
  every other diagram in the repository already uses `<br/>`. Also fixed a typo
  ("fingerpinrted") and added color classes to the previously uncolored
  Maker/Checker/Merger diagram, matching ARCHITECTURE.md's established palette.
- In ARCHITECTURE.md's "Where Modonome fits in your pipeline" diagram, the anti-gaming
  ratchet shared the engine's color class, visually equating the two even though the
  document's own security argument rests on the ratchet being structurally independent
  from the engine. Recolored to match the ratchet's identity in the other diagrams.

### Documentation drift prevention, phase two

- Added `check-architecture-drift.mjs`: fails CI if a file under `scripts/agent/` or
  `scripts/mcp-server.mjs` is not mentioned anywhere in ARCHITECTURE.md, if
  ARCHITECTURE.md cites a `scripts/*.mjs` path that no longer exists, or if a
  work-item state in `schemas/work-item.schema.json` is not named in ARCHITECTURE.md's
  "The agent loop" section. Running it against this repo surfaced two real gaps: the
  agent execution layer (`scripts/agent/`) had no entry in "The pieces," and the
  agent-loop diagram used role labels (Maker, Checker) with no bridge to the literal
  state-machine vocabulary. Both are fixed in ARCHITECTURE.md, not worked around.
- `check-self-application.mjs` now asserts the AgentProof score hand-typed in
  README.md, agentproof/README.md, and agentproof/SPEC.md matches
  `agentproof/runner.mjs --json`'s own computed score, and that the markdown
  governance, architecture drift, and self-application gates are each wired into
  `ci.yml`. Skipped entirely for a fixture or host repo with no `agentproof/`
  directory of its own.
- `check-md-governance.mjs` now requires `last_reviewed` front-matter on every file
  under `docs/compliance/` and `docs/audits/`, and fails if more than 15 commits have
  touched a doc's own cited paths since it was last reviewed. Scoped to this small,
  externally-facing set rather than all of `docs/`, where front-matter coverage is
  still mid-migration. Backfilled front-matter on the five existing files in scope.
- Fixed two pre-existing bugs in `tests/self-application.test.mjs`'s fixture that had
  been masked by exit-code-only assertions: `makeMinimalRepo()` wrote CODEOWNERS to
  the repository root instead of `.github/CODEOWNERS`, and it was missing every file
  the snapshot-dogfooding check (ADR-033) requires. Both caused the script to crash
  rather than run cleanly; the crash's exit code happened to match what the negative
  tests expected, so nothing caught it until a test that required a genuine exit 0
  was added.

### Documentation governance gate fix

- Fixed a gap in the ADR-number-uniqueness check (`check-md-governance.mjs`, ADR-031):
  it only ever compared `docs/adr/` against `docs/research/` and could not detect two
  files inside `docs/adr/` claiming the same number. Two same-day pull requests had
  independently done exactly that (`ADR-032-oss-adapter-boundary.md` and
  `ADR-032-repo-snapshot.md`), undetected by CI. The check now also flags duplicates
  within a single directory. `ADR-032-repo-snapshot.md` is renamed to
  `ADR-033-repo-snapshot.md`. Added a regression test
  (`tests/check-md-governance.test.mjs`) and a permanent adversarial scenario
  (AgentProof AP-36, now 25/25 normative plus 10/10 extended). See
  `docs/audits/claims-audit-2026-07-01.md` for the full re-verification this prompted.
- Corrected ARCHITECTURE.md: it claimed three execution contexts while
  `scripts/mcp-server.mjs`, a fully implemented MCP stdio server, was already a fourth.
  Also added the `rework`, `escalated`, and lease-expiry states to the agent-loop
  diagram, which previously showed only the linear happy path.
- ADR-025 now cross-references ADR-002's decision to remove "shadow mode" from docs
  pending implementation, instead of reusing the term a day later with no link between
  the two.

### Repo snapshot utility hardening

- Fixed a CodeQL-flagged time-of-check-to-time-of-use race in `scaffold`'s `AGENTS.md`
  creation by making it an atomic exclusive write. A follow-up manual security audit (the
  snapshot tool reads arbitrary repositories, including untrusted ones) found and fixed three
  more issues: git revision values from the local cache and `--since` are now validated before
  reaching `git` (argument injection), the ignore-pattern compiler collapses adjacent
  wildcards (polynomial ReDoS on a crafted `.gitignore`), and per-file maps keyed by raw paths
  use `Object.create(null)` (prototype pollution via a file named `__proto__`).

### Repo snapshot utility

- Added `modonome snapshot`, a dependency-free utility that reads any repo and writes a
  tiered, Merkle-verified artifact under `.modonome/snapshot/` for LLM context: Tier 0
  `signature.json` (fingerprint), Tier 1 `map.json` and `map.md` (modules, public API
  signatures, import edges, PageRank attention ranking). It emits a root `llms.txt`, supports
  `--check`, `--verify`, `--tier`, `--since`, and `--pack`, redacts secrets before writing,
  and is deterministic. New config levers live under `snapshot` (`ci_mode` warn by default,
  `sign` false, `parser` heuristic, `token_budget`, `strict_redact`). Discovery is layered
  through `llms.txt`, an `AGENTS.md` pointer, `prompts/modules/snapshot.md`, and the
  `modonome_snapshot` MCP tool. See ADR-033.
- Snapshot regeneration is incremental: a local, gitignored cache under `.modonome/cache/`
  plus git change detection means only changed files are re-read and re-parsed, while the
  output stays byte-identical to a full rebuild. `--full` forces a from-scratch build.
- `scaffold --write` turns snapshot consumption on by default during adoption: it generates
  the first snapshot, installs a host pre-commit hook that keeps it fresh, and drops an
  `AGENTS.md` pointer when the host has none. `--no-snapshot` opts out; existing host files
  are never overwritten.
- Extraction now ships dependency-free heuristic adapters for JavaScript/TypeScript, Python,
  Go, Java, and a generic fallback, each locked by golden tests. An optional tree-sitter parser
  (`--parser tree-sitter` or `snapshot.parser`) loads lazily only when installed and falls back
  to the heuristic with a warning otherwise, so the core stays zero-dependency. The committed
  snapshot always uses the heuristic default to stay reproducible across contributors.

### AgentProof expanded to 25 scenarios (HARDENED)

- Grew the AgentProof suite from 16 to 25 governance scenarios. Nine new scenarios cover
  state-machine acyclicity (AP-17), deterministic compound-gate ordering (AP-18),
  trust-boundary code loading (AP-19), audit-trail integrity (AP-21), model-family
  distinctness (AP-22), concurrent work-item safety (AP-23), gate-dependency DAG validation
  (AP-24), evidence secret/PII screening (AP-25), and resource-exhaustion caps (AP-26).
  AP-20 is intentionally unassigned.
- `HARDENED` now requires 25/25; `PARTIAL` is 20-24; `UNHARDENED` is 0-19. The runner,
  `agentproof/SPEC.md` (bumped to v1.1-draft), `agentproof/README.md`, and
  `agentproof/CONFORMANCE-INTERFACE.md` are updated accordingly.
- Added supporting governance scripts and shared libraries: state-machine acyclicity check,
  gate-dependency DAG check, deterministic gate pipeline, evidence integrity and secret
  scanners, resource-capped gate runner, work-item compare-and-swap transitions, and the
  graph and secret-pattern libraries under `scripts/lib/`.
- No runtime default-lever changes. The 0.1.0-alpha release notes below remain the historical
  record of the original 16-scenario suite.

### Cross-repo knowledge network: architecture and ADRs (design)

- Added `docs/knowledge-network-architecture.md`: the practically grounded v0.2 (Milestone 2)
  architecture for the cross-repo knowledge network. Covers the publish, sign, catalog, poll,
  verify, local re-validation, and owner-promotion flow; the transport and freshness model;
  the trust and threat model; and what is explicitly deferred. The feature stays off by
  default, pull-only, and sovereignty-preserving.
- Filed `ADR-014` through `ADR-019` for the knowledge network: transport and sync model
  (pull-only polling, optional later webhooks), catalog design (opt-in, hash-only identity,
  signed monotonic index, no ranking), packet identity and dedup (content-addressed ids,
  RFC 8785 canonical JSON), packet signing and key management (Ed25519, committed
  CODEOWNERS-gated peer-key allowlist with out-of-band enrollment, no TOFU), the import
  pipeline and local re-validation ratchet (ADR-010 applied to imported candidates, with
  re-verification at promotion), and base-branch CI execution scope for all network scripts.
- Extended the `ARCHITECTURE.md` CI-boundary invariant to name `guard-ratchet.mjs` and the
  network import scripts as members of the base-branch execution trust class.
- No runtime, schema, or default-lever changes in this entry. Scripts and schemas named in
  the ADRs (`poll-network.mjs`, `verify-packet.mjs`, `sign-packet.mjs`, `catalog-index.schema.json`,
  `peer-keys.schema.json`, and the `scripts/lib/*` helpers) are specified here and built in a
  later milestone.

---

## 0.1.0-alpha : 2026-06-23

### AgentProof benchmark (16/16 HARDENED)

- Introduced **AgentProof**: a portable adversarial governance benchmark with 16
  scenarios covering ratchet gaming, prompt injection, config override, identity
  collapse, knowledge packet exfiltration, protected-path escalation, and drift guard.
- Runner (`agentproof/runner.mjs`) exits non-zero if any scenario fails; integrates
  into CI and produces a JSON report for badge generation.
- Portable spec (`agentproof/SPEC.md`) defines the runner interface, scenario contract,
  and conformance levels so any governed-autonomy framework can claim AgentProof
  compliance independently of Modonome.
- Contributing guide (`agentproof/CONTRIBUTING.md`) covers fixture types, scenario
  numbering, and the advisory-scenarios track for heuristic checks.

### Multi-language ratchet (Java and C#/.NET)

- `scripts/guard-ratchet.mjs` extended with Java test file patterns (`Test.java`,
  `IT.java`, `Spec.java`), assertion patterns (JUnit 5, AssertJ, Mockito `verify()`),
  skip patterns (`@Disabled`, `@Ignore`), and coverage patterns (JaCoCo, Gradle).
- C#/.NET support added: MSTest/NUnit/xUnit test files, FluentAssertions (`.Should()`),
  Moq (`.Verify()`), skip attributes (`[Ignore]`, `[Fact(Skip=`), Coverlet thresholds.
- New `RATCHET-SPEC.md` section 4.6 documents language-specific type-safety suppression
  (`@SuppressWarnings("unchecked")`, `#pragma warning disable`).
- Eight new AgentProof scenarios (AP-09 through AP-16) extend coverage to drift guard, protected-path escalation, Java ratchet, .NET ratchet, prompt injection in diffs, and Python ratchet vectors.

### Python ratchet and AP-16

- Python test files (`test_*.py`, `*_test.py`), assertion patterns (`assertEqual`,
  `assertIsNotNone`, `pytest.raises`), skip markers (`@pytest.mark.skip`,
  `@pytest.mark.xfail`), and coverage threshold removal (`fail_under`) all detected.
- AP-16 scenario tests all three Python attack fixtures.

### New CLI commands

- `npx modonome report [dir]` : reads `.modonome/metrics.jsonl` and prints a
  governance summary table: items attempted, gates passed/failed, ratchet rejections,
  merges, lines changed, estimated hours saved, and live AgentProof score.
- `npx modonome agentproof` : runs the full AgentProof benchmark suite.

### MCP server

- `scripts/mcp-server.mjs` exposes four JSON-RPC 2.0 tools over stdio:
  `modonome_ratchet`, `modonome_validate_config`, `modonome_validate_work_item`,
  and `modonome_status`. Any MCP-compatible harness can integrate without running
  shell scripts.

### Demo app and walkthrough

- `examples/demo-app/` : a realistic Node.js order-management app with deliberate
  tech debt, Modonome already scaffolded, and a full week's worth of governance
  activity captured in `WALKTHROUGH.md`.
- Walkthrough covers: what the dry-run proposed, what merged, what the ratchet
  blocked, and what the end-of-week report showed.

### Community surface

- GitHub issue templates: bug report, feature request, AgentProof scenario proposal.
- GitHub PR template with governance checklist.
- `ROADMAP.md` with five public milestones (v0.2 through v1.0).

### Initial release foundations

- Master prompt as a cacheable core plus on-demand modules, with a generated bundle.
- Config, work-item, adoption-map, knowledge-packet, and metrics schemas at schema_version 1.
- Enforcing scripts: build-prompt, scaffold, dry-run-sweep, guard-ratchet, validate-config,
  validate-knowledge-packet, migrate-config, check-style, check-drift.
- Safe defaults throughout: `autonomy_enabled`, `auto_merge`, and `dry_run` all default
  to off. Arming is read from CI environment only, never from a file the agent can write.
- Cross-repo knowledge network ships off and is advisory by design.

---

## Roadmap

| Version | Target | Key deliverable |
|---|---|---|
| v0.2 | Hardened alpha | Signed work items (Ed25519); quantified before/after tech-debt deltas in `modonome report` (the base command shipped in 0.1.0-alpha) |
| v0.3 | Beta | OpenTelemetry span emission |
| v0.4 | RC | Multi-repo estate management, compliance audit trail |
| v1.0 | GA | Stable API, ratchet stability guarantees, OpenSSF conformance |
