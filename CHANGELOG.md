# Changelog

All notable changes to Modonome are recorded here. This project follows semantic
versioning. Any change to a default config lever requires an entry and a schema
version bump.

---

## Unreleased

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

### AgentProof benchmark (16/16 GOVERNED)

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
| v0.2 | Hardened alpha | Signed work items (Ed25519), `modonome report` dashboard |
| v0.3 | Beta | OpenTelemetry span emission |
| v0.4 | RC | Multi-repo estate management, compliance audit trail |
| v1.0 | GA | Stable API, ratchet stability guarantees, OpenSSF conformance |
