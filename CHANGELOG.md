# Changelog

All notable changes to Modonome are recorded here. This project follows semantic
versioning. Any change to a default config lever requires an entry and a schema
version bump. Security fixes are called out in their release notes with the advisory
or CVE identifier where one exists.

---

## Unreleased

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
