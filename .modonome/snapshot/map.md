# Repo snapshot: modonome

Modonome snapshot. Read this before reading the repo. Tier 0 (signature.json) is the fingerprint: if merkle_root matches your last read, nothing changed. Tier 1 (map.json / map.md) lists modules, public API signatures, import edges, and attention ranking. Cite anchors (F: for files, S: for symbols); each resolves to a path and line so you can act without re-reading the whole repo.

Merkle root: sha256:5b5cef2c75f307e86d19338cd2a4c5119480ec46c11d39646e43a42131b0605d
Files: 523  Bytes: 1662349  Map tokens: 50390/120000

## Modules

- .github/pull_request_template.md [F:b2496e8029]: What this PR does
- .modonome/DECISIONS.md [F:88c38fbc0f]: Modonome decisions
- .modonome/LEARNINGS.md [F:9a39dd0e8e]: Learnings, staged candidate conventions
- .modonome/NETWORK.md [F:8930a72be2]: Cross-repo network
- .modonome/STATUS.md [F:cac320dd97]: Modonome Status
- .modonome/control-panel.md [F:76f802c3ce]: Modonome control panel
- ADOPTION-GUIDE.md [F:7479c14986]: Adoption guide
- AGENTS.md [F:a54ff182c7]: Agent instructions for modonome
- ARCHITECTURE.md [F:8f6366fd8e]: Architecture
- CHANGELOG.md [F:06572a96a5]: Changelog
- CODEX.md [F:2f41a784d9]: Codex instructions for modonome
- CODE_OF_CONDUCT.md [F:ffdbe3a1e7]: Contributor Covenant Code of Conduct
- CONTRIBUTING.md [F:eca12c0a30]: Contributing to Modonome
- GOVERNANCE.md [F:b60c6a93e9]: Governance
- QUICKSTART.md [F:147873af8b]: Quickstart
- RATCHET-SPEC.md [F:e6e577f9ae]: Maintenance Specification Update
- README.md [F:b335630551]: Why businesses adopt Modonome
- RELEASE-EVIDENCE.md [F:705a3ca9b3]: Release evidence
- ROADMAP.md [F:683343bdf9]: Roadmap
- SECURITY.md [F:f6ed156e4b]: Security model
- agentproof/CONFORMANCE-INTERFACE.md [F:cf2908e0f2]: AgentProof Conformance Interface
- agentproof/CONTRIBUTING.md [F:69ddfa4ff4]: Contributing to AgentProof
- agentproof/README.md [F:5621bc51b3]: AgentProof
- agentproof/SPEC.md [F:2ec4f6540b]: AgentProof Specification
- agentproof/scenarios/ap-33-config-env-override-inert.mjs [F:02a5f8fc55]: !/usr/bin/env node
- bin/modonome.mjs [F:f90930c3c3]: The authoritative arming gate. A config file the agent can write can never arm the engine on its own: arming requires the MODONOME_ARMED=true environment variab
- docs/README.md [F:0b5ca119d2]: Modonome documentation
- docs/adr/ADR-001-self-governance-pipeline.md [F:6e4b629d3c]: ADR-001: Self-Governance Pipeline
- docs/adr/ADR-002-shadow-mode.md [F:64c5acf802]: ADR-002: Shadow Mode
- docs/adr/ADR-003-agentproof-portability.md [F:14812742da]: ADR-003: AgentProof Portability
- docs/adr/ADR-004-arming-isolation-enforcement.md [F:6dd88cde1c]: ADR-004: Arming Isolation Enforcement
- docs/adr/ADR-005-run-observability.md [F:d4ead22b1b]: ADR-005: Run Observability
- docs/adr/ADR-006-checker-independence.md [F:dc00dfe394]: ADR-006: Checker Independence
- docs/adr/ADR-007-claim-atomicity.md [F:0526aab88e]: ADR-007: Claim Atomicity
- docs/adr/ADR-008-trusted-author-allowlist.md [F:8c2e08ed12]: ADR-008: Trusted Author Allowlist
- docs/adr/ADR-009-mcp-tool-auth-scope.md [F:00a0cb4ee4]: ADR-009: MCP Tool Authentication and Scope
- docs/adr/ADR-010-knowledge-packet-trust.md [F:de4538fe53]: ADR-010: Knowledge Packet Trust and Promotion
- docs/adr/ADR-011-ci-env-var-trust-scope.md [F:d2b14b5b34]: ADR-011: CI Environment Variable Trust Scope
- docs/adr/ADR-012-harness-prompt-integrity.md [F:6f5b5f0bc4]: ADR-012: Harness Prompt Integrity
- docs/adr/ADR-013-config-downgrade-and-migration.md [F:e844676be4]: ADR-013: Config Downgrade and State Migration
- docs/adr/ADR-014-knowledge-network-transport.md [F:1a58c06540]: ADR-014: Knowledge Network Transport and Sync Model
- docs/adr/ADR-015-knowledge-network-catalog.md [F:cbaff08a46]: ADR-015: Knowledge Network Catalog Design
- docs/adr/ADR-016-knowledge-network-packet-identity.md [F:c077d16aeb]: ADR-016: Knowledge Network Packet Identity, Lineage, and Dedup
- docs/adr/ADR-017-knowledge-network-packet-signing.md [F:72b7ab4c3e]: ADR-017: Knowledge Network Packet Signing and Key Management
- docs/adr/ADR-018-knowledge-network-import-ratchet.md [F:0a6b452f14]: ADR-018: Knowledge Network Import Pipeline and Local Re-Validation Ratchet
- docs/adr/ADR-019-knowledge-network-execution-scope.md [F:28d4e1ad3d]: ADR-019: Knowledge Network Scripts Run in Base-Branch CI Scope
- docs/adr/ADR-020-prompt-complexity-budget.md [F:4aaece5252]: ADR-020: Prompt Complexity Budget
- docs/adr/ADR-021-prompt-behavioral-regression-suite.md [F:24f28ae0fa]: ADR-021: Prompt Behavioral Regression Suite
- docs/adr/ADR-022-anti-rubber-stamp-checker-telemetry.md [F:35002ba3fe]: ADR-022: Anti-Rubber-Stamp Checker Telemetry
- docs/adr/ADR-023-config-schema-migration-contract.md [F:b4279e0af6]: ADR-023: Config Schema Migration Contract
- docs/adr/ADR-024-capability-promotion-gate.md [F:a70145dc77]: ADR-024: Capability Promotion Gate
- docs/adr/ADR-025-self-application-conformance.md [F:dc0cc6d551]: ADR-025: Self-Application Conformance
- docs/adr/ADR-026-learning-promotion-audit-trail.md [F:094efaca92]: ADR-026: Learning Promotion Audit Trail
- docs/adr/ADR-027-agentproof-25-scenario-expansion.md [F:d783999e16]: ADR-027: AgentProof Suite Expansion to 25 Scenarios
- docs/adr/ADR-028-portability.md [F:514a79560d]: ADR-028: Portability Validation Strategy
- docs/adr/ADR-029-adversarial-test-design.md [F:d66f93d7b7]: ADR-029: Adversarial Test Design Principles
- docs/adr/ADR-030-embedding-safety.md [F:5a04bfa7a4]: ADR-030: Embedding Safety Framework
- docs/adr/ADR-031-markdown-governance.md [F:627afb27fd]: ADR-031: Markdown governance
- docs/adr/ADR-032-oss-adapter-boundary.md [F:3a70dc66ea]: ADR-032: OSS adapter boundary
- docs/adr/ADR-032-repo-snapshot.md [F:105d90c489]: ADR-032: Repo snapshot
- docs/audits/claims-audit-2026-06-25.md [F:8a7591db62]: Claims audit, 2026-06-25
- docs/autonomy-plan.md [F:3dcdfa18c0]: Autonomy plan: governed autonomy on free models
- docs/compliance/compliance.md [F:95e51a604d]: Compliance
- docs/compliance/eu-ai-act-classification.md [F:5fa0ad758b]: EU AI Act Classification
- docs/compliance/openssf-badge-evidence.md [F:7983a5dd39]: OpenSSF Best Practices badge evidence
- docs/enterprise.md [F:191a17b151]: Enterprise estates
- docs/guidelines/markdown-governance.md [F:b81cf7567f]: Markdown governance policy
- docs/knowledge-network-architecture.md [F:5e3214eb0f]: Cross-Repo Knowledge Network: v0.2 Architecture
- docs/ops/merge-governance-setup.md [F:1339474d8c]: Merge governance setup (owner action)
- docs/ops/runner-model-config.md [F:f1f2b57403]: Runner and Model Configuration (WS-H)
- docs/research/README.md [F:0a640a72f9]: Modonome Research Directions
- docs/research/agentic-governance-mesh/00-RESEARCH-PLAN.md [F:83ecac7524]: Agentic Governance Mesh: Research Direction
- docs/research/agentic-governance-mesh/RD-027-governance-packet-protocol.md [F:492786871a]: RD-027: Governance Packet Protocol
- docs/research/agentic-governance-mesh/RD-028-trust-network-and-discovery.md [F:0e78eb22ec]: RD-028: Trust Network & Discovery
- docs/research/agentic-governance-mesh/RD-029-packet-lifecycle-and-versioning.md [F:ff644711e7]: RD-029: Packet Lifecycle & Versioning
- docs/research/agentic-governance-mesh/RD-030-cross-repo-governance-feedback.md [F:cb8c4aadaf]: RD-030: Cross-Repo Governance Feedback
- docs/research/agentic-governance-mesh/RD-031-semantic-compatibility-and-conflicts.md [F:0c07096c4e]: RD-031: Semantic Compatibility & Conflicts
- docs/research/agentic-governance-mesh/RD-032-network-level-ratchet.md [F:79cec3a152]: RD-032: Network-Level Ratchet
- docs/research/agentic-governance-mesh/governance-mesh-vision.md [F:acd892d4a0]: The Governance Mesh Vision: Modonome as a WWW for Repositories
- docs/specs/governed-autonomy-spec.md [F:55673172df]: Governed Autonomy: A Specification for Safe Autonomous Software Engineering Agents
- docs/specs/ratchet-spec.md [F:4d5cfa3611]: Anti-Gaming Ratchet Specification
- docs/versioning.md [F:c1cc304e56]: Versioning and embedding
- docs/vscode-workflow.md [F:88244532e4]: VS Code manual trigger workflow
- docs/workflow-fixes.md [F:91a7efa0ba]: Workflow Push Event Fix
- examples/demo-app/README.md [F:fcc5f4b906]: modonome-demo
- examples/demo-app/WALKTHROUGH.md [F:9666ca7f0d]: Modonome on this demo app: captured dry-run + maker/checker cycle
- examples/demo-app/src/CartService.js [F:599f5b2f28]: CartService: manages user shopping carts stored in memory.
- examples/demo-app/src/CheckoutService.js [F:54c6928de9]: CheckoutService: drives the checkout flow from cart to order.
- examples/demo-app/src/InventoryService.js [F:bd02b28f17]: InventoryService: tracks stock levels for products in memory.
- examples/demo-app/src/NotificationService.js [F:b9d806ba4d]: NotificationService: records notifications sent to users.
- examples/demo-app/src/OrderService.js [F:1ecd18c4b9]: OrderService: creates and manages orders.
- examples/demo-app/src/PaymentProcessor.js [F:ff3aef693f]: PaymentProcessor: wraps a payment gateway with amount conversion.
- examples/demo-app/src/index.js [F:8bb1b57470]: Composition root for the demo app.
- examples/demo-app/tests/CartService.test.js [F:3c53926ecd]: function makeDb
- examples/demo-app/tests/CheckoutService.test.js [F:52caf3b287]: function makeCartService
- examples/demo-app/tests/InventoryService.test.js [F:f8168b956f]: function makeDb
- examples/demo-app/tests/OrderService.test.js [F:044b762a79]: Tests for OrderService.
- examples/demo-app/tests/PaymentProcessor.test.js [F:373a946d5c]: function makeGateway
- examples/node-typescript/README.md [F:d52b08ebeb]: Example: Node and TypeScript service
- examples/node-typescript/src/checkout.ts [F:93f0f5d3de]: type Card
- examples/python-service/README.md [F:ae227d695d]: Example: Python service
- examples/python-service/app/orders.py [F:7ccad64380]: Apply a percentage discount to a list of items. Args: items: List of dicts with "price" key discount_percent: Discount percentage (0-100) Returns: Total after d
- examples/python-service/tests/test_orders.py [F:2c2cc77861]: Test discount with 0% - should return full amount. Note: This covers only the zero-discount case. The function should be tested with non-zero discounts (10%, 50
- fixtures/evidence-tampered.md [F:fdaf1308e4]: RELEASE-EVIDENCE
- fixtures/negative-controls/app-syntax-error.js [F:a1411f1423]: Negative control: intentional syntax error in example app
- fixtures/portability/prompt-injection-host/docs/guide.md [F:6fdd929a92]: Host Documentation
- fixtures/portability/prompt-injection-host/src/main.js [F:90f0999521]: This file contains adversarial content in comments that should not affect Modonome.
- fixtures/portability/schema-collision/README.md [F:7fcbf6b32d]: Schema Collision Fixture
- prompts/modonome.bundle.md [F:c0714e4bf0]: Modonome Master Prompt (core)
- prompts/modonome.core.md [F:1c3b1b469e]: Modonome Master Prompt (core)
- prompts/modules/adoption.md [F:41623f0bcd]: Adoption pass
- prompts/modules/control-panel.md [F:36693b0d8b]: Operator control panel
- prompts/modules/gates.md [F:02359d48d5]: Deterministic gates
- prompts/modules/network.md [F:c98f6b55e3]: Cross-repo knowledge network
- prompts/modules/roles.md [F:8f62475ebe]: Agent roles
- prompts/modules/snapshot.md [F:c324fab0cc]: Repo snapshot
- prompts/modules/state-machine.md [F:9a28b4e90e]: Durable state machine
- scripts/agent/action-queue.mjs [F:5b113a0914]: Validate a record against the action-queue schema. Throws with the collected errors so a malformed action can never be enqueued.
- scripts/agent/apply-patch.mjs [F:872221b1da]: A body looks like a unified diff when it has a "diff --git" header, or a paired "--- "/"+++ " file header, or an "@@ " hunk marker.
- scripts/agent/openai-client.mjs [F:8d2cb93236]: Join a base URL with the chat-completions path, tolerating a trailing slash * or a base URL that already ends in "/chat/completions". * * @param {string} baseUr
- scripts/agent/parse-checker-telemetry.mjs [F:851f776227]: Case-insensitive signal phrases that mean the checker withheld approval or asked for changes. Matching any one sets checker_requested_changes = true.
- scripts/agent/providers.mjs [F:8b5a1f94c4]: Built-in providers. A config's `providers` map (see resolveProvider) is merged on top, so a host repo can add or override entries without a code change here.
- scripts/agent/render-prompt.mjs [F:fd660a117b]: Build a compact repository-snapshot context block from the committed Tier 0 signature, so every rendered role prompt starts pre-oriented and an agent can read t
- scripts/agent/resolve-role.mjs [F:304ce7b89d]: Resolve runner and model settings for a named role. * * @param {object} cfg - Parsed config object (output of parseFlatYaml or loadConfig). * @param {string} ro
- scripts/agent/route-action.mjs [F:37f4a5c04e]: Classify a role's model endpoint into a coarse reachability descriptor: kind: "local" self-hosted / private-host endpoint (Ollama, llama.cpp) kind: "github" the
- scripts/agent/run-cycle.mjs [F:ddeb486c49]: Derive the ordered list of roles the cycle executes. An explicit cfg.role_sequence (a non-empty array of role names) is honored so a crew role added in config r
- scripts/agent/tool-loop-adapter.mjs [F:aa77f227a6]: Resolve the command the external adapter is invoked as. Precedence: an explicit * adapterEntry.command, then adapterEntry.name, then a bare fallback. The value 
- scripts/audit-learnings.mjs [F:c9493b5275]: !/usr/bin/env node
- scripts/build-compliance-evidence.mjs [F:2e327963ed]: Observe concrete facts about a repository. Pure with respect to its inputs: it only reads the filesystem under root and returns a plain object.
- scripts/build-prompt.mjs [F:c4395c3023]: !/usr/bin/env node
- scripts/build-release-evidence.mjs [F:9344d335a6]: Sample-app captures: real maker and checker runs recorded under examples/<app>/runs/. These directories are committed (unlike the gitignored .modonome/runs/), s
- scripts/check-checker-engagement.mjs [F:fc5d887ff6]: !/usr/bin/env node
- scripts/check-drift.mjs [F:87c30bdb4c]: !/usr/bin/env node
- scripts/check-edit-set-compliance.mjs [F:9427d264e6]: !/usr/bin/env node
- scripts/check-evidence-secrets.mjs [F:ace169adc4]: Resolve the list of files to scan. If a path argument is supplied use it directly; otherwise walk examples/runs/metrics.jsonl via readdirSync.
- scripts/check-gate-dag.mjs [F:fc21812307]: gateGraphErrors(graph) -> { errors: [...], order: [...] } `errors` lists every defect (dangling edge or cycle); when it is empty, `order` holds a topological or
- scripts/check-licenses.mjs [F:cc361bd05a]: Core check. Takes the parsed package.json and (optional) adapters manifest and returns a list of human-readable problem strings. Pure: no filesystem or network.
- scripts/check-md-governance.mjs [F:fd08562f92]: 4. ADR number uniqueness across docs/adr and docs/research.
- scripts/check-portability.mjs [F:2d4c555ba1]: !/usr/bin/env node
- scripts/check-promotion-readiness.mjs [F:c5938c33fd]: Check that a section appears as a Markdown heading (h1-h6), so a one-line ADR with the section words buried in prose cannot game the gate.
- scripts/check-repo-hygiene.mjs [F:61296e720c]: Helper
- scripts/check-self-application.mjs [F:4096620673]: 4. The two protected-path surfaces must agree. CODEOWNERS is what GitHub enforces; protected_paths_extra is what the engine reads. If they disagree, a path is p
- scripts/check-state-machine-acyclic.mjs [F:8b8d3c46b3]: Build the adjacency map { state: [to, ...] } from the transition list. When includeCapGuard is false, cap_guard edges are dropped: those are the sanctioned boun
- scripts/check-style.mjs [F:ca0833ac73]: !/usr/bin/env node
- scripts/dry-run-sweep.mjs [F:6f247eb514]: Order proposals by descending deterministic priority score (highest-value, lowest-risk first). Signals are derived heuristically from each proposal's text and t
- scripts/guard-ratchet.mjs [F:8a10462927]: !/usr/bin/env node
- scripts/install-hooks.mjs [F:a7ce0f6452]: Install the pre-commit hook into targetRoot. Returns "installed", "kept" (a host hook already existed and was preserved), or "no-git". self=true writes modonome
- scripts/lib/branch-name.mjs [F:6e0bd62fa3]: True when the first path segment of a branch name equals a denylisted token. * Matching is case-insensitive. "feature/ai-adapter" is allowed because the * first
- scripts/lib/canonical-json.mjs [F:245efb551c]: Domain separation tag binds a signature to this packet type and version so a signature over one structure cannot be replayed as another.
- scripts/lib/commit-identity.mjs [F:e4ff19bbe2]: True when a name or email belongs to a denylisted agent or vendor identity. * Real automation such as dependabot is allowed; only coding-agent and model * vendo
- scripts/lib/ed25519.mjs [F:0cacf66a3b]: Raw 32-byte public key as base64, accepting either a public or private KeyObject.
- scripts/lib/graph.mjs [F:f51cba9beb]: isCyclic(adjacency) -> { cyclic: bool, cycle: [...] } Detects whether the graph contains a cycle. When a cycle is found, `cycle` holds the nodes involved in the
- scripts/lib/jsonschema.mjs [F:34cb2b6c48]: A small, dependency-free JSON Schema validator.
- scripts/lib/lang-adapters/generic.mjs [F:594f505f11]: Fallback extractor for languages without a dedicated adapter. It captures common
- scripts/lib/lang-adapters/go.mjs [F:ffe5c1269b]: Dependency-free signature extractor for Go. It captures top-level func (including methods with a receiver), type, const, and var declarations, their preceding l
- scripts/lib/lang-adapters/index.mjs [F:2554ddd30c]: Resolve the adapter for a path by extension, defaulting to the generic fallback.
- scripts/lib/lang-adapters/java.mjs [F:c598a2d684]: Dependency-free signature extractor for Java. It captures type declarations
- scripts/lib/lang-adapters/js-ts.mjs [F:36419aa427]: Dependency-free signature extractor for JavaScript and TypeScript. It scans top
- scripts/lib/lang-adapters/python.mjs [F:3213d03b72]: Dependency-free signature extractor for Python. It captures top-level def and class declarations (async included), their leading triple-quoted docstring, and im
- scripts/lib/lang-adapters/tree-sitter.mjs [F:cecdb96382]: Attempt to register tree-sitter adapters. `register` is the registry's registerAdapter. Returns true when at least one grammar was registered.
- scripts/lib/learnings.mjs [F:4ebb5aa8a0]: Extract the first fenced json block that appears after the "## Promoted" heading.
- scripts/lib/merkle.mjs [F:2b9c43b0ca]: Hash raw file bytes (Buffer or string) into a prefixed digest.
- scripts/lib/packet-id.mjs [F:12c7a4e461]: Content-addressed packet identity (ADR-016). The id is sha256 over the JCS of the
- scripts/lib/repo-detect.mjs [F:ae46bbab81]: Build the small file helpers a detector needs, bound to one target directory.
- scripts/lib/run-gate-capped.mjs [F:b014028f57]: Thin wrapper around spawnSync with a hard timeout and output-size cap.
- scripts/lib/secret-patterns.mjs [F:68c4da7fe8]: Returns an array of { name } objects for every pattern that matches text.
- scripts/lib/snapshot-anchors.mjs [F:1cf31c4792]: A short, stable id from a string. Hex keeps it deterministic across platforms.
- scripts/lib/snapshot-cache.mjs [F:119e3c0fce]: A value safe to pass as a git revision argument: a short-to-full hex SHA. Rejects anything else, in particular a leading "-", which git would parse as an option
- scripts/lib/snapshot-core.mjs [F:dbb9c92ca1]: Detect binary content by scanning a prefix for a null byte.
- scripts/lib/snapshot-graph.mjs [F:015261eab0]: Normalize a relative import against the importing file's directory, resolving "." and ".." segments. Returns a posix path with no leading "./".
- scripts/lib/snapshot-redact.mjs [F:4b91a9f65b]: Mask every matching secret in `text`. Returns { text, redactions } where each redaction records the pattern name and how many matches it masked.
- scripts/lib/snapshot-walk.mjs [F:cb66095cb4]: Compile one gitignore-style pattern into a tester over a posix relative path. Supported: comments, negation (!), leading / (anchored), trailing / (directory), *
- scripts/lib/token-estimate.mjs [F:7944059823]: Dependency-free token accounting for snapshot tiers. The estimate is a heuristic (about four characters per token) that needs no tokenizer and no network, which
- scripts/lib/yaml-lite.mjs [F:1575110130]: Parse a raw value string from after the colon, handling inline comments and quoted strings. Returns the trimmed scalar text or empty string.
- scripts/mcp-server.mjs [F:ab5077147a]: !/usr/bin/env node
- scripts/migrate-config.mjs [F:9d69a6b766]: Safe defaults for every lever. Migration fills any missing key from here.
- scripts/preflight-embedding.mjs [F:7232ada2da]: Minimal, dependency-free scan for top-level YAML job names under `jobs:`.
- scripts/promote-learning.mjs [F:ac11b5379f]: Slugify a lesson into a deterministic ID.
- scripts/release.mjs [F:edf42fb1af]: !/usr/bin/env node
- scripts/report.mjs [F:3b382f95c0]: A source module counts as "documented" if its first non-shebang line is a `//` comment, or the file contains a ` ... ` JSDoc block anywhere. This is a simple he
- scripts/run-gate-pipeline.mjs [F:edb11415f0]: parseArgs(argv) -> { diff, "work-item" } map of fixture paths by gate arg name.
- scripts/scaffold.mjs [F:5e450ff82c]: Turn snapshot consumption on during adoption: generate the first snapshot, install a host pre-commit hook, and drop an AGENTS.md pointer when none exists. Skipp
- scripts/score-proposals.mjs [F:e11f907cba]: Fill in missing signal fields with the documented neutral value and clamp every field to the [SIGNAL_MIN, SIGNAL_MAX] scale.
- scripts/sign-packet.mjs [F:7b3e38c9a6]: Pure: attach a signature object to a packet using the given private key.
- scripts/snapshot.mjs [F:a0d489df6d]: Resolve incremental build inputs. --full forces a from-scratch rebuild. Otherwise load the cache and ask git what changed; a missing cache or unusable git yield
- scripts/sync-site-data.mjs [F:8abf9e432a]: Parse RELEASE-EVIDENCE.md to extract gate counts and autonomy status
- scripts/test-prompt-behavior.mjs [F:23917c6197]: Concatenate the committed prompt source files into one searchable string. * @param {string} root repository root that contains the prompts directory * @returns 
- scripts/transition-work-item.mjs [F:d135cffeaa]: A lease is "live" if it has an owner and an unexpired lease_expires_at. The lease holder is recorded as lease_owner (the field this swap writes) or, for older i
- scripts/validate-config.mjs [F:932d33be00]: Safety rules beyond structural validation. These keep a config from claiming an armed posture without the controls that make arming safe. Note on arming levers:
- scripts/validate-knowledge-packet.mjs [F:65193a9799]: !/usr/bin/env node
- scripts/validate-work-item.mjs [F:f07f8ebca9]: Resolve a model name to its family by longest-matching prefix. Returns null when no prefix matches, so unrecognized models are treated as distinct families (the
- scripts/verify-packet.mjs [F:0c1c5ad5d9]: Resolve an alias to an active, in-window key entry in the allowlist.
- site/README.md [F:669d2a51f4]: Modonome landing page (modonome.com)
- site/index.html [F:aef9cf1e27]: class Component
- templates/.modonome/DECISIONS.md [F:037178c793]: Modonome decisions
- templates/.modonome/LEARNINGS.md [F:247e1781ab]: Learnings, staged candidate conventions
- templates/.modonome/NETWORK.md [F:515a65a35b]: Cross-repo network
- templates/.modonome/STATUS.md [F:e27748d089]: Modonome status
- templates/.modonome/control-panel.md [F:75c1125713]: Modonome control panel
- tests/action-queue.test.mjs [F:195e9217ca]: function tmpQueue
- tests/arming.test.mjs [F:60548316f5]: function tmpRepo
- tests/chaos.test.mjs [F:8fe56e5618]: Chaos test helper: any call must either return errors cleanly OR not throw. A crash or hang is a failure.
- tests/cli-dispatch.test.mjs [F:40e4f39b59]: function cli
- tests/compliance-evidence.test.mjs [F:3ea503e7c0]: Helper reused by the mapping test.
- tests/dependency.test.mjs [F:b70824b13e]: Read all .mjs files in a directory (non-recursive by default).
- tests/dry-run.test.mjs [F:778c33cdc0]: function dryRun
- tests/e2e.test.mjs [F:9cbe9238f8]: function tmp
- tests/embedding-safety.test.mjs [F:cc65dd1342]: Run preflight in --json mode against a fixture. Returns { code, report, raw }. A clean environment is used so the host's own MODONOME_* shell does not leak into
- tests/helpers/mock-openai-server.mjs [F:eb14a0bdeb]: Start a mock OpenAI chat-completions server. * * @param {object} [options] * @param {"success"|"retry-then-success"|"delay"|"malformed"|"error"} [options.mode] 
- tests/learnings.test.mjs [F:54a3c626d9]: function run
- tests/maker-checker.test.mjs [F:5994385869]: function run
- tests/mcp-compliance.test.mjs [F:a167609a41]: Send requests to a fresh server process and resolve once every expected id has replied. The child is killed as soon as the responses arrive, which avoids the st
- tests/metrics.test.mjs [F:fadcf390da]: Schema-conformant event line using "event" field (not "type").
- tests/packet-signing.test.mjs [F:3de9042953]: function setup
- tests/performance.test.mjs [F:b28f13b600]: Build a synthetic 1000-line diff that is clean (no gaming patterns).
- tests/portability.test.mjs [F:fd6ebce602]: Run validate-config.mjs against a given config path.
- tests/promote-learning.test.mjs [F:e540f7b669]: function run
- tests/promoted-learnings.test.mjs [F:ddd82fc886]: function withRoot
- tests/provenance.test.mjs [F:ba97282cf5]: Base valid packet factory: returns a fresh object each call.
- tests/providers.test.mjs [F:ee02e563c6]: function baseCfg
- tests/ratchet.test.mjs [F:f238d164c9]: function ratchet
- tests/report-impact.test.mjs [F:8a3433b070]: function tmp
- tests/role-registry.test.mjs [F:e2f1b5ac07]: A single-environment config with no runner reachability declared, so routing stays inline for every role (matching the shipped default posture). Crew roles are 
- tests/rollback.test.mjs [F:0103cf3d56]: Recursively snapshot path -> "size:sha-like(content)" for every file.
- tests/route-action.test.mjs [F:704e42d42b]: A config where each runner declares its environment and reach.
- tests/run-cycle-openai.test.mjs [F:580d11b514]: Create a throwaway git repo with a single committed file, and return the repo dir plus a unified diff (produced by a real `git diff`, so it is guaranteed to be 
- tests/run-log.test.mjs [F:d7d4e8d2a9]: function tmp
- tests/scaffold-adoption.test.mjs [F:de5ebbf586]: function gitRepo
- tests/self-application.test.mjs [F:48355ccf4d]: Build a minimal passing temp repo and return the path. Caller must rmSync(tmp, {recursive:true}).
- tests/snapshot-cli.test.mjs [F:9f36b3ef29]: function run
- tests/snapshot-golden.test.mjs [F:2a74ae3f05]: function names
- tests/snapshot-incremental.test.mjs [F:4637e1fecb]: function repo
- tests/tick.test.mjs [F:baf7641a01]: function tmp
- tests/tool-loop-adapter.test.mjs [F:ed9c47feb2]: A scriptable fake child process. Captures the constructor call, emits the configured stdout/stderr, then closes (or hangs, when never told to close).
- tests/ws-b-harness.test.mjs [F:1bcaaff9eb]: A config fixture with distinct maker/checker models and a models registry.
- tests/ws-e-negative-controls.test.mjs [F:bbb6476d71]: WS-E: negative-control fixtures that prove governance gates have teeth.
- tests/ws-e-ratchet-languages.test.mjs [F:2b49c74e74]: function runRatchet

## Public API

### tests/rollback.test.mjs [F:0103cf3d56]
- S:c5854b8940 function snapshot `async function snapshot(dir)` L27 : Recursively snapshot path -> "size:sha-like(content)" for every file.
- S:44e7188c1d function hash `function hash(buf)` L50 : Tiny content hash (FNV-1a): avoids a crypto import and is deterministic.
- S:4ee042ed06 function makeHostRepo `async function makeHostRepo()` L59
- S:08df8d7472 function runPreflight `function runPreflight(target)` L70
### scripts/lib/snapshot-graph.mjs [F:015261eab0]
- S:c47beeac78 function normalizeRelative `function normalizeRelative(fromPath, module)` L11 : Normalize a relative import against the importing file's directory, resolving "." and ".." segments. Returns a posix path with no leading "./".
- S:0d7b0da50a function resolveImport `function resolveImport(fromPath, module, fileSet)` L24 : Resolve a relative import to a repo file, trying common extensions and index files. External and bare imports return null and become no edge.
- S:c732826ee5 function buildImportGraph `export function buildImportGraph(perFile, fileSet)` L41 : Build an adjacency map { relPath -> [relPath, ...] } from per-file imports. Only edges that resolve to another repo file are kept.
- S:79144070a6 function centrality `export function centrality(adj)` L55 : Degree centrality: out-edges of a node plus in-edges pointing at it.
- S:bb578790a3 function pagerank `export function pagerank(adj, { damping = 0.85, iterations = 40 } = {})` L67 : PageRank over the import graph. Fixed iteration count keeps it deterministic. Dangling nodes (no out-edges) redistribute their rank uniformly.
- S:4d0bae812e function round `function round(n, places = 6)` L91
- S:b88ce47ede function attentionRank `export function attentionRank(paths, { churn = new Map(), centralityMap = new Map(), pagerankMap = new Map() } = {})` L98 : Rank files by a normalized composite of churn, centrality, and PageRank. Returns a sorted list of { path, churn, centrality, pagerank, score }, highest first.
- S:5ad0c942a1 function findCycle `export function findCycle(adj)` L117 : Report whether the import graph has a cycle and one example cycle, reusing the shared cycle detector so the snapshot can warn about circular dependencies.
### agentproof/scenarios/ap-33-config-env-override-inert.mjs [F:02a5f8fc55]
- S:1e6749f65a function run `function run(env)` L31
### examples/demo-app/tests/OrderService.test.js [F:044b762a79]
- S:949f988c9e function makeDb `function makeDb(orders = new Map())` L10
### scripts/verify-packet.mjs [F:0c1c5ad5d9]
- S:6dd199eea1 function resolveActiveKey `export function resolveActiveKey(peerKeys, alias, now = new Date())` L18 : Resolve an alias to an active, in-window key entry in the allowlist.
- S:f3b8628cdb function verifyPacket `export function verifyPacket(packet, peerKeys, { now = new Date(), skipContentGate = false } = {})` L34 : Full ordered verification. options.skipContentGate runs only the signature checks (steps 3 to 5), used when the caller already ran the schema and redaction gate.
### scripts/lib/ed25519.mjs [F:0cacf66a3b]
- S:ee5246d16c function generateKeypair `export function generateKeypair()` L14
- S:842e875c5a function publicKeyB64 `export function publicKeyB64(keyObject)` L19 : Raw 32-byte public key as base64, accepting either a public or private KeyObject.
- S:8a971e3c54 function publicKeyFromB64 `export function publicKeyFromB64(b64)` L26 : Public KeyObject from a raw 32-byte base64 public key.
- S:380b82547c function privateKeyFromB64Pkcs8 `export function privateKeyFromB64Pkcs8(b64)` L32 : Private KeyObject from base64 PKCS8 DER (the env-secret format).
- S:19e5ddb185 function privateKeyToB64Pkcs8 `export function privateKeyToB64Pkcs8(keyObject)` L36
- S:1c7919b4ea function signMessage `export function signMessage(message, privateKeyObject)` L40
- S:fb81ef11a3 function verifyMessage `export function verifyMessage(message, sigB64, publicKeyObject)` L44
- S:4a08c48993 function fingerprint `export function fingerprint(pubB64)` L54 : Short fingerprint for out-of-band key comparison (ADR-017 enrollment): the first 16 hex characters of sha256 over the raw public key bytes.
### scripts/lib/snapshot-cache.mjs [F:119e3c0fce]
- S:670e55d75a const CACHE_SCHEMA_VERSION `export const CACHE_SCHEMA_VERSION = 1;` L10
- S:31032f0509 function isPlausibleRevision `export function isPlausibleRevision(value)` L17 : A value safe to pass as a git revision argument: a short-to-full hex SHA. Rejects anything else, in particular a leading "-", which git would parse as an option (some git options can read or write fil
- S:7762c6d861 function cachePath `function cachePath(root)` L21
- S:59b9039619 function loadCache `export function loadCache(root)` L28 : Load the cache for a repo, or null when absent, unreadable, or a different version.
- S:ba5f7d1ffe function saveCache `export function saveCache(root, { built_at_head = null, entries = {} })` L41 : Persist the cache. entries is { relPath: { hash, symbols, imports, purposeRaw } }.
- S:ed24428ce0 function gitHead `export function gitHead(root)` L50 : The current git HEAD sha for the repo, or null when unavailable.
- S:236237bc1b function unquote `function unquote(p)` L56 : Strip git's optional quoting from a porcelain path.
- S:93d0a78f18 function changedPaths `export function changedPaths(root, cache)` L65 : The set of paths that changed since the cache was built: uncommitted work (git status) plus commits since cache.built_at_head. Returns null when git is not usable, which forces a full rebuild.
### scripts/lib/packet-id.mjs [F:12c7a4e461]
- S:3968554637 const VOLATILE_FIELDS `export const VOLATILE_FIELDS = ['id', 'signature'];` L8
- S:9f7fa8d585 function packetContent `export function packetContent(packet)` L10
- S:a0ea4d9d0f function computePacketId `export function computePacketId(packet)` L18
- S:d2ef86c19f function packetIdMatches `export function packetIdMatches(packet)` L23
### scripts/lib/yaml-lite.mjs [F:1575110130]
- S:237d74cadf function parseScalar `function parseScalar(raw)` L15
- S:299c43d83e function stripQuotes `function stripQuotes(s)` L33
- S:0b7b39d873 function extractRawValue `function extractRawValue(afterColon)` L42 : Parse a raw value string from after the colon, handling inline comments and quoted strings. Returns the trimmed scalar text or empty string.
- S:b4a3093fe9 function indentOf `function indentOf(line)` L59 : Count leading spaces to determine nesting depth.
- S:bec355e18a function parseEntries `function parseEntries(entries, start, minIndent)` L67 : Parse an array of non-empty, non-comment lines into a nested object. Each entry is { indent, key, rawValue }.
- S:8990e6571f function parseFlatYaml `export function parseFlatYaml(text)` L99
### tests/action-queue.test.mjs [F:195e9217ca]
- S:0064b473e6 function tmpQueue `function tmpQueue()` L14
- S:d240732a9d function sampleAction `function sampleAction(id, target = "ci")` L18
### tests/ws-b-harness.test.mjs [F:1bcaaff9eb]
- S:fc01241f03 function cfg `function cfg(overrides = {})` L13 : A config fixture with distinct maker/checker models and a models registry.
### scripts/lib/snapshot-anchors.mjs [F:1cf31c4792]
- S:55b15c0abb function short `function short(text, len = 10)` L9 : A short, stable id from a string. Hex keeps it deterministic across platforms.
- S:2e016b842d function fileAnchor `export function fileAnchor(relPath)` L13
- S:00db09c5a8 function symbolAnchor `export function symbolAnchor(relPath, name)` L17
- S:ab79b43633 function buildPathDictionary `export function buildPathDictionary(relPaths)` L24 : Build the path dictionary from walked files. Returns { paths, pathIdByPath } where `paths` is the serializable { id -> relPath } map and `pathIdByPath` is the reverse lookup callers use to reference p
- S:63613c3a63 function buildSymbolDictionary `export function buildSymbolDictionary(apiEntries)` L37 : Build the symbol dictionary from API entries. Each entry carries its anchor, owning path id, name, and line, so an anchor resolves to an exact location.
### examples/demo-app/src/OrderService.js [F:1ecd18c4b9]
- S:5a6c3aef24 class OrderService `export class OrderService` L7
### scripts/test-prompt-behavior.mjs [F:23917c6197]
- S:a931ad2e62 function resolvePromptText `export function resolvePromptText(root)` L44 : Concatenate the committed prompt source files into one searchable string. * @param {string} root repository root that contains the prompts directory * @returns {string} the concatenated committed prom
- S:0a5fed1978 function loadFixtures `export function loadFixtures(dir)` L57 : Load every fixture JSON file from a directory. * @param {string} dir directory holding fixture *.json files * @returns {Array<object>} parsed fixture objects, sorted by file name for stable output
- S:407ded8730 function evaluateFixture `export function evaluateFixture(fixture, promptText)` L77 : Evaluate one fixture against the committed prompt text. A fixture is ok only when * every one of its anchors is present, meaning the governing rule that produces its * golden decision still exists in 
- S:c2e641f1c8 function runSuite `export function runSuite(root, fixturesDir)` L100 : Run the whole suite: load fixtures, resolve prompt text, evaluate each. * @param {string} root repository root * @param {string} fixturesDir directory holding fixtures * @returns {{ results: Array<{id
### scripts/lib/canonical-json.mjs [F:245efb551c]
- S:76171943e3 function canonicalize `export function canonicalize(value)` L7
- S:781c4112a2 const PACKET_DOMAIN `export const PACKET_DOMAIN = 'modonome.knowledge-packet.v1\n';` L22 : Domain separation tag binds a signature to this packet type and version so a signature over one structure cannot be replayed as another.
- S:210b0c6999 function signedBytes `export function signedBytes(packet)` L26 : The exact bytes a packet signature covers: the domain tag followed by the JCS of the packet with its signature object removed.
### scripts/lib/lang-adapters/index.mjs [F:2554ddd30c]
- S:4df7a92e8e function registerAdapter `export function registerAdapter(adapter)` L15
- S:a07487517b function getAdapter `export function getAdapter(relPath)` L25 : Resolve the adapter for a path by extension, defaulting to the generic fallback.
- S:ec18e42e1a function extractFile `export function extractFile(relPath, source)` L32 : Extract from one file, guarding against any adapter error so a single bad file never aborts a whole snapshot.
### tests/snapshot-golden.test.mjs [F:2a74ae3f05]
- S:d595535449 function names `function names(result)` L9
- S:a5baaff840 function modules `function modules(result)` L12
### tests/ws-e-ratchet-languages.test.mjs [F:2b49c74e74]
- S:b9942b1651 function runRatchet `function runRatchet(diffFile)` L11
### scripts/lib/merkle.mjs [F:2b9c43b0ca]
- S:015c572711 function hashFileContent `export function hashFileContent(bytes)` L9 : Hash raw file bytes (Buffer or string) into a prefixed digest.
- S:b926c18911 function hashString `export function hashString(text)` L15 : Hash an arbitrary string, used for oversized or unreadable files where content is represented by a stable stand-in rather than its bytes.
- S:a320bea4da function buildMerkleTree `export function buildMerkleTree(entries)` L21 : Build a Merkle tree from file leaves. `entries` is [{ relPath, hash }]. Returns { root, nodes } where nodes maps every directory path (root is ".") to its hash.
- S:85c852fd1a function diffMerkle `export function diffMerkle(prevFiles, nextFiles)` L52 : File-level diff between two { relPath -> hash } maps. Returns sorted lists of added, removed, and changed paths. Directory node hashes (from buildMerkleTree) let a caller skip re-extracting an unchang
### examples/python-service/tests/test_orders.py [F:2c2cc77861]
- S:ad4edf7e81 function test_total_sums_prices `def test_total_sums_prices()` L4
- S:54d2db3f99 function test_apply_discount_zero_percent `def test_apply_discount_zero_percent()` L8 : Test discount with 0% - should return full amount. Note: This covers only the zero-discount case. The function should be tested with non-zero discounts (10%, 50%, etc.) to verify correct discount calc
### scripts/check-portability.mjs [F:2d4c555ba1]
- S:93fa315ac7 function fail `function fail(code, message)` L41
- S:8252cf2ba8 function warn `function warn(code, message)` L45
- S:003e6c53c4 function info `function info(code, message)` L49
### scripts/build-compliance-evidence.mjs [F:2e327963ed]
- S:4bacff1244 function fileExists `function fileExists(root, ...candidates)` L14
- S:41050d03a4 function readIfExists `function readIfExists(root, rel)` L18
- S:1be3814c77 function listWorkflows `function listWorkflows(root)` L23
- S:8f1da92228 function detectRepoFacts `export function detectRepoFacts(root)` L31 : Observe concrete facts about a repository. Pure with respect to its inputs: it only reads the filesystem under root and returns a plain object.
- S:74bea9ecdf function criterion `function criterion(id, framework, level, met, evidence)` L58 : A criterion entry: a stable id, the framework and level, whether the observed facts satisfy it, and the evidence or remediation note.
- S:8e94f927e1 function mapToCriteria `export function mapToCriteria(facts)` L63 : Map observed facts to criteria across the supported frameworks. Pure.
- S:a0db477c6e function summarize `export function summarize(criteria)` L89
- S:f93b3b8c7c function buildEvidence `export function buildEvidence(root, generatedAt)` L94
- S:43f1c85009 function renderMarkdown `export function renderMarkdown(evidence)` L107
### scripts/agent/resolve-role.mjs [F:304ce7b89d]
- S:0713a27a1f function resolveRole `export function resolveRole(cfg, role)` L41 : Resolve runner and model settings for a named role. * * @param {object} cfg - Parsed config object (output of parseFlatYaml or loadConfig). * @param {string} role - One of "maker", "checker", "self-go
### scripts/lib/lang-adapters/python.mjs [F:3213d03b72]
- S:618d055a7c function clean `function clean(text)` L5 : Dependency-free signature extractor for Python. It captures top-level def and class declarations (async included), their leading triple-quoted docstring, and import edges. Bodies are never included. e
- S:37c1996b57 function signature `function signature(line)` L10
- S:1bafda617f function docBelow `function docBelow(lines, defIndex)` L15 : The docstring is the first triple-quoted string on the line(s) after a def/class.
- S:82727ee8e7 function collectImports `function collectImports(trimmed, lineNo, out)` L35
- S:aaa1eac555 const adapter `export const adapter =` L47
### scripts/lib/jsonschema.mjs [F:34cb2b6c48]
- S:f794e6adf4 function typeOf `function typeOf(value)` L6
- S:0768a4cf0f function matchesType `function matchesType(value, type)` L13
- S:52913852e3 function validate `export function validate(schema, value, path = "$", errors = [])` L22
### scripts/lib/lang-adapters/js-ts.mjs [F:36419aa427]
- S:61ec9209fc function matchSymbol `function matchSymbol(trimmed)` L22
- S:500f4c1cd3 function cleanSignature `function cleanSignature(trimmed)` L30
- S:3602dcc44c function cleanDoc `function cleanDoc(text)` L37
- S:df1472b647 function docAbove `function docAbove(lines, index)` L47
- S:ac015d1f81 function collectImports `function collectImports(trimmed, lineNo)` L67
- S:70c4ff437c const adapter `export const adapter =` L80
- S:65d6e9b42e function dedupeImports `function dedupeImports(imports)` L112
### examples/demo-app/tests/PaymentProcessor.test.js [F:373a946d5c]
- S:442c9dff6c function makeGateway `function makeGateway()` L5
### scripts/agent/route-action.mjs [F:37f4a5c04e]
- S:af1450421c function classifyEndpoint `export function classifyEndpoint(role)` L19 : Classify a role's model endpoint into a coarse reachability descriptor: kind: "local" self-hosted / private-host endpoint (Ollama, llama.cpp) kind: "github" the github-models provider (needs models:re
- S:cbbe6a270b function isPrivateHost `function isPrivateHost(baseUrl)` L33 : A base_url points at a private/self-hosted host when its hostname is localhost, a loopback address, a *.local mDNS name, or an RFC1918 range.
- S:ff45c441d1 function canReach `export function canReach(target, roleEndpoint)` L62 : Decide whether a runner target can reach a role's endpoint. A target declares * its reach with optional fields on its config entry: * reachable_providers: provider names it can call (for example ["loc
- S:55ee648216 function resolveExecutionTarget `export function resolveExecutionTarget(role, cfg)` L91 : Resolve the required execution target (environment id) for a role's model * endpoint. Reads cfg.runners and returns the first target that both declares an * environment and can reach the endpoint, pre
### scripts/report.mjs [F:3b382f95c0]
- S:a9b3acb352 function writeRunLog `function writeRunLog(runsDir, command, payload)` L16
- S:4118076b3e function pad `function pad(s, n) { return String(s).padEnd(n); }` L29
- S:0ba2f17fcf function rpad `function rpad(s, n) { return String(s).padStart(n); }` L30
- S:02e9b6beea function parseMetrics `function parseMetrics()` L32
- S:5962011a99 function summarize `function summarize(events)` L41
- S:b288f69305 function agentproofScore `function agentproofScore()` L76
- S:145bc035b8 function listFilesRecursive `function listFilesRecursive(dir, matches, cap = IMPACT_SCAN_CAP)` L92
- S:5967648d07 function isDocumented `function isDocumented(filePath)` L116 : A source module counts as "documented" if its first non-shebang line is a `//` comment, or the file contains a ` ... ` JSDoc block anywhere. This is a simple heuristic, not a full doc-coverage analysi
- S:98d9caecec function findExportedSymbols `function findExportedSymbols(filePath)` L134 : Advisory, bounded heuristic: an exported symbol is a "dead code suspect" when its declared name never appears again (by plain text match) anywhere else under scripts/ or tests/. This is a name-collisi
- S:cab6ecab70 function computeDeadCodeSuspects `export function computeDeadCodeSuspects(sourceFiles, root, cap = IMPACT_SCAN_CAP)` L144
- S:62f42e9591 function computeImpactSnapshot `export function computeImpactSnapshot(root)` L175 : Computes a deterministic, offline snapshot of repo-impact metrics rooted at `root` (a directory containing scripts/, tests/, docs/). Pure aside from filesystem reads; never writes anything.
- S:882efb23a5 function findPriorImpactSnapshot `export function findPriorImpactSnapshot(runsDir)` L196 : Reads the newest run log under runsDir that carries an `impact` field. Returns null if none exists (first run, no baseline).
- S:d444b209b8 function computeImpactDelta `export function computeImpactDelta(current, prior)` L212 : Pure delta computation: current minus prior for each numeric field. When prior is null/undefined, returns a "first run, no baseline" marker instead of numeric deltas.
- S:bafcfbb33c function formatDelta `function formatDelta(n)` L224
### examples/demo-app/tests/CartService.test.js [F:3c53926ecd]
- S:b908c74a11 function makeDb `function makeDb()` L5
### tests/packet-signing.test.mjs [F:3de9042953]
- S:72d4f657d5 function setup `function setup()` L91
### tests/compliance-evidence.test.mjs [F:3ea503e7c0]
- S:09a834e684 function makeRepo `function makeRepo(spec)` L14
- S:64de4c98b6 function makeRepoOnce `function makeRepoOnce()` L91 : Helper reused by the mapping test.
### scripts/check-self-application.mjs [F:4096620673]
- S:91c42b4f27 function read `function read(rel)` L20
- S:87c8d03eb8 function dirsFromCodeowners `function dirsFromCodeowners()` L72 : 4. The two protected-path surfaces must agree. CODEOWNERS is what GitHub enforces; protected_paths_extra is what the engine reads. If they disagree, a path is protected in name only (the bin/ gap that
### tests/cli-dispatch.test.mjs [F:40e4f39b59]
- S:daac1f172a function cli `function cli(...args)` L12
- S:1c82a73570 function tmp `function tmp()` L19
### tests/snapshot-incremental.test.mjs [F:4637e1fecb]
- S:48356203e2 function repo `function repo()` L13
### tests/self-application.test.mjs [F:48355ccf4d]
- S:e3c36060ec function makeMinimalRepo `function makeMinimalRepo()` L63 : Build a minimal passing temp repo and return the path. Caller must rmSync(tmp, {recursive:true}).
- S:7c9eb8f22d function runScript `function runScript(tmp)` L77
### scripts/lib/snapshot-redact.mjs [F:4b91a9f65b]
- S:3ef15e4c1b function redactText `export function redactText(text, { strict = false } = {})` L13 : Mask every matching secret in `text`. Returns { text, redactions } where each redaction records the pattern name and how many matches it masked.
### scripts/lib/learnings.mjs [F:4ebb5aa8a0]
- S:72cb0b7406 const REQUIRED_FIELDS `export const REQUIRED_FIELDS = [` L7
- S:6831eb78e0 function readPromotedLearnings `export function readPromotedLearnings(root)` L19 : Extract the first fenced json block that appears after the "## Promoted" heading.
### examples/demo-app/tests/CheckoutService.test.js [F:52caf3b287]
- S:ad302fbf54 function makeCartService `function makeCartService(cart)` L5
- S:8d10c3ed6e function makeOrderService `function makeOrderService()` L13
### tests/learnings.test.mjs [F:54a3c626d9]
- S:5e3d6fa91f function run `function run(script, args = [], env = {})` L13
### examples/demo-app/src/CheckoutService.js [F:54c6928de9]
- S:5ea90f5e50 class CheckoutService `export class CheckoutService` L3
### tests/run-cycle-openai.test.mjs [F:580d11b514]
- S:0f004d17fa function git `function git(args, cwd)` L24
- S:4b391a8eee function makeGitFixture `function makeGitFixture()` L34 : Create a throwaway git repo with a single committed file, and return the repo dir plus a unified diff (produced by a real `git diff`, so it is guaranteed to be well-formed and to apply cleanly against
- S:fd58589dfa function makePlan `function makePlan(role, roleDescriptor, transcriptSubdir)` L127 : Build a minimal plan shape invokeRoleOpenAI needs: plan[role] (a resolved role descriptor) plus runId/transcriptDir. transcriptDir is deliberately kept under the repo's gitignored runs/ prefix (see .g
- S:b7db5f4d64 function cleanupTranscripts `function cleanupTranscripts()` L138
### scripts/lib/lang-adapters/generic.mjs [F:594f505f11]
- S:bd63b1e408 function cleanSignature `function cleanSignature(line)` L15
- S:21635cbeda const adapter `export const adapter =` L19
### tests/maker-checker.test.mjs [F:5994385869]
- S:7d89fd8d95 function run `function run(script, args = [], env = {})` L13
### examples/demo-app/src/CartService.js [F:599f5b2f28]
- S:1ef7d0ea53 class CartService `export class CartService` L3
### scripts/agent/action-queue.mjs [F:5b113a0914]
- S:bfb04089fa const DEFAULT_QUEUE_DIR `export const DEFAULT_QUEUE_DIR = join(root, ".modonome", "queue");` L18
- S:04f5060b44 const DEFAULT_LEASE_MINUTES `export const DEFAULT_LEASE_MINUTES = 30;` L19
- S:7bc320f853 function assertValid `function assertValid(record)` L25 : Validate a record against the action-queue schema. Throws with the collected errors so a malformed action can never be enqueued.
- S:556ab0a4ef function recordPath `function recordPath(dir, id)` L32
- S:29fd3ef66c function writeAtomic `function writeAtomic(dir, id, record)` L39 : Atomic write: serialize to a temp file in the same directory, then rename over the destination. Rename is atomic on the same filesystem, so a reader never observes a partial record.
- S:2102bdee1c function readRecord `function readRecord(dir, file)` L47
- S:a364864213 function listRecords `function listRecords(dir)` L51
- S:96b040bf38 function enqueue `export function enqueue(action, dir = DEFAULT_QUEUE_DIR)` L74 : Enqueue an action. Fills schema_version, state, and created_at when omitted, * validates the record, and writes it atomically. Returns the stored record. * * @param {object} action - At least id, targ
- S:852d083fcb function listQueued `export function listQueued(dir = DEFAULT_QUEUE_DIR)` L94 : List queued (not claimed/done/failed) actions, oldest first by created_at. * * @param {string} [dir] * @returns {object[]}
- S:ba017108fd function leaseIsLive `function leaseIsLive(record, now)` L101 : A lease is live if the record is claimed and its expiry is strictly in the future.
- S:6b0614bdf6 function claim `export function claim(workerEnv, dir = DEFAULT_QUEUE_DIR, now = new Date(), leaseMinutes = DEFAULT_LEASE_MINUTES)` L124 : Atomically lease the oldest queued action this worker environment can serve. * A record is servable when its target equals the worker env or appears in the * worker env's served set. Sets state to cla
- S:194e854c70 function complete `export function complete(id, result, dir = DEFAULT_QUEUE_DIR, ok = true)` L153 : Mark a claimed action done or failed, attaching an optional result object. * * @param {string} id * @param {object|null} result * @param {string} [dir] * @param {boolean} [ok] - true marks done, false
- S:ed1db0b6bb function reclaimStale `export function reclaimStale(dir = DEFAULT_QUEUE_DIR, now = new Date())` L173 : Revert every claimed record whose lease has expired back to queued, clearing * its owner and expiry. Returns the list of reclaimed records. * * @param {string} [dir] * @param {Date} [now] * @returns {
### scripts/scaffold.mjs [F:5e450ff82c]
- S:ea76c925e2 function enableSnapshot `function enableSnapshot(target, here)` L26 : Turn snapshot consumption on during adoption: generate the first snapshot, install a host pre-commit hook, and drop an AGENTS.md pointer when none exists. Skipped with --no-snapshot. Never overwrites 
- S:8c6ccd3e8b function listTemplate `function listTemplate(dir, base = "")` L58
- S:6dcbe228c5 function scaffold `export function scaffold(target, write)` L69
- S:1856df868b function writeRunLog `function writeRunLog(runsDir, command, payload)` L103
### tests/arming.test.mjs [F:60548316f5]
- S:5d58defc25 function tmpRepo `function tmpRepo(configBody)` L14
- S:580f464240 function runStatus `function runStatus(dir, env)` L23
### scripts/check-repo-hygiene.mjs [F:61296e720c]
- S:0cfad6d2cf function findSafeToDeleteFiles `function findSafeToDeleteFiles(dir)` L28
- S:17985dad90 function execSync `function execSync(cmd, opts)` L235 : Helper
### scripts/validate-knowledge-packet.mjs [F:65193a9799]
- S:4abcc2a45b function redactionErrors `export function redactionErrors(packet)` L19
- S:a8a643fda8 function validatePacket `export function validatePacket(packet)` L45
### scripts/lib/secret-patterns.mjs [F:68c4da7fe8]
- S:e95e85f904 const SECRET_PATTERNS `export const SECRET_PATTERNS = [` L5
- S:9c4deaa396 function scanForSecrets `export function scanForSecrets(text)` L16 : Returns an array of { name } objects for every pattern that matches text.
### scripts/lib/branch-name.mjs [F:6e0bd62fa3]
- S:7698d9efeb function isModelIdentifierBranch `export function isModelIdentifierBranch(name)` L26 : True when the first path segment of a branch name equals a denylisted token. * Matching is case-insensitive. "feature/ai-adapter" is allowed because the * first segment is "feature"; only a leading "a
- S:99c574f83d function resolveBranchName `export function resolveBranchName(env = process.env)` L37 : Resolve the branch under review from CI environment variables. Prefers the * pull request head ref, then the push ref name. Returns an empty string when * neither is set so callers can fall back to a 
### scripts/dry-run-sweep.mjs [F:6f247eb514]
- S:bb800288d9 function writeRunLog `function writeRunLog(runsDir, command, payload)` L16
- S:002c9f1daa function slug `function slug(text)` L29
- S:3d6f7980b3 function proposeWork `function proposeWork(stack, hotFiles)` L37
- S:24407449b3 function orderProposalsByScore `export function orderProposalsByScore(proposals, hotFiles)` L68 : Order proposals by descending deterministic priority score (highest-value, lowest-risk first). Signals are derived heuristically from each proposal's text and the hot-file churn count for the file it 
- S:7fb0e9b59c function proposalToWorkItem `export function proposalToWorkItem(proposal, opts = {})` L77
### tests/route-action.test.mjs [F:704e42d42b]
- S:ba7fe0b6d3 function routedConfig `function routedConfig()` L10 : A config where each runner declares its environment and reach.
### scripts/preflight-embedding.mjs [F:7232ada2da]
- S:eaba90daa0 function exists `async function exists(p)` L99
- S:7b87285e6c function readTextSafe `async function readTextSafe(p)` L108
- S:934c97a052 function listFilesRecursive `async function listFilesRecursive(dir, { maxDepth = 5 } = {})` L116
- S:7048bb8a3d function parseCiJobNames `function parseCiJobNames(yamlText)` L141 : Minimal, dependency-free scan for top-level YAML job names under `jobs:`.
- S:fc6086da9e function parseFlatYaml `function parseFlatYaml(yamlText)` L176 : Extremely small YAML-ish key:value reader for flat config files. Good enough to inspect schema_version and the boolean arming levers without a YAML dep.
- S:c275cb33da function checkSchemaCollision `export async function checkSchemaCollision(targetDir)` L198 : (a) Schema collision: target has .modonome/ with incompatible config.
- S:8660e770ea function checkCiJobConflict `export async function checkCiJobConflict(targetDir)` L254 : (b) CI job name conflict: target's CI files use Modonome job names.
- S:ee4deb809d function checkScriptShadowing `export async function checkScriptShadowing(targetDir)` L288 : (c) Script shadowing: target has scripts/ that shadow Modonome scripts.
- S:f5a168e2ff function checkEnvPollution `export async function checkEnvPollution(targetDir, env = process.env)` L323 : (d) Env var pollution: MODONOME_* env vars set that override safe defaults. Reads from the current process environment (the shell preparing to embed) AND statically inspects, read-only, the target's `
- S:8a6e48a119 function checkDependencyConflict `export async function checkDependencyConflict(targetDir)` L376 : (e) Dependency conflict: target has deps that conflict with Modonome requirements.
- S:22ac6bb569 function checkPromptInjection `export async function checkPromptInjection(targetDir)` L440 : (f) Prompt injection risk: governance-override patterns in the target. Trusted locations (.modonome/, schemas/, CI dirs) are scanned exhaustively; for the rest of the repo we scan source-bearing files
- S:522a86b0ed function checkNodeVersion `export async function checkNodeVersion(targetDir)` L478 : (g) Node version incompatibility: target requires Node < 18.
- S:03145d5ec3 const CHECKS `export const CHECKS = [` L517
- S:0dd1d1c53a function runPreflight `export async function runPreflight(targetDir)` L527
- S:80ded7ba90 function renderHuman `function renderHuman(report)` L540
- S:1ba042e0cf function main `async function main()` L563
### tests/dry-run.test.mjs [F:778c33cdc0]
- S:e15045d8a4 function dryRun `function dryRun(dir)` L13
### scripts/lib/token-estimate.mjs [F:7944059823]
- S:59617d720e function estimateTokens `export function estimateTokens(text)` L5 : Dependency-free token accounting for snapshot tiers. The estimate is a heuristic (about four characters per token) that needs no tokenizer and no network, which keeps the utility portable. It is used 
- S:a48d9e0b16 function budgetTier `export function budgetTier(items, maxTokens, sizeFn)` L13 : Greedily keep pre-ranked items until the token budget is spent. `sizeFn` returns the token cost of an item. A falsy or non-finite budget keeps everything. Returns { kept, dropped, tokens } so the call
### scripts/sign-packet.mjs [F:7b3e38c9a6]
- S:8ec4bd5dec function signPacket `export function signPacket(packet, privateKeyObject, { keyAlias, signedAt })` L19 : Pure: attach a signature object to a packet using the given private key.
### examples/python-service/app/orders.py [F:7ccad64380]
- S:41443bba10 function total `def total(items)` L1
- S:05fcfe1c5b function apply_discount `def apply_discount(items, discount_percent)` L5 : Apply a percentage discount to a list of items. Args: items: List of dicts with "price" key discount_percent: Discount percentage (0-100) Returns: Total after discount
### scripts/agent/parse-checker-telemetry.mjs [F:851f776227]
- S:88bc43a62b const CHANGE_REQUEST_SIGNALS `export const CHANGE_REQUEST_SIGNALS = [` L20 : Case-insensitive signal phrases that mean the checker withheld approval or asked for changes. Matching any one sets checker_requested_changes = true.
- S:90b86b1f26 function hasChangeRequestSignal `export function hasChangeRequestSignal(transcript)` L50 : True when the transcript contains any documented change-request signal * phrase (case-insensitive). Pure string search: no partial-word surprises * beyond what the phrase itself implies. * * @param {s
- S:328dcdf4cc function countRaisedQuestions `export function countRaisedQuestions(transcript)` L76 : Count distinct raised concerns/questions in the transcript. * * Heuristic (documented, approximate, not semantic): * - Any line ending in "?" counts once. * - Any line starting with "concern:", "quest
- S:cfe87f9141 function parseCheckerTelemetry `export function parseCheckerTelemetry(transcript)` L111 : Derive checker-engagement telemetry from a checker transcript. * * @param {string|undefined|null} transcript - Full checker transcript text. * @returns {{checker_requested_changes: boolean, checker_qu
### scripts/agent/apply-patch.mjs [F:872221b1da]
- S:88426a3883 function looksLikeDiff `function looksLikeDiff(body)` L12 : A body looks like a unified diff when it has a "diff --git" header, or a paired "--- "/"+++ " file header, or an "@@ " hunk marker.
- S:074c2b3c02 function extractDiff `export function extractDiff(text)` L28 : Pull a unified diff out of a model response. Prefers a fenced ```diff or * ```patch block; falls back to a bare fenced block whose body looks like a * diff; falls back to treating the whole text as a 
- S:fe1a464205 function applyPatch `export function applyPatch(diff, cwd, deps = {})` L60 : Apply a unified diff to a working directory using the git binary. * Validates with `git apply --check` first; git apply is atomic, so a diff * that fails validation or application is never partially a
### scripts/check-drift.mjs [F:87c30bdb4c]
- S:6b5288f35f function coreLevers `function coreLevers()` L16
- S:b4e887ed4f function schemaLevers `function schemaLevers()` L25
- S:e09a554f44 function templateLevers `function templateLevers()` L30
### scripts/guard-ratchet.mjs [F:8a10462927]
- S:89e92655dd function normalizeLF `function normalizeLF(s)` L20
- S:a34306cc67 function getDiff `function getDiff()` L24
- S:974654287c function count `function count(lines, re)` L258
- S:fd230402e2 function deconfuse `function deconfuse(line)` L277
- S:457528354e function stripInlineComment `function stripInlineComment(line)` L285
- S:a4c389d72a function isVacuousAssertion `function isVacuousAssertion(line)` L290
- S:17945c542e function countBareAsserts `function countBareAsserts(lines)` L300
- S:4d3ac94b7c function isVacuousPyAssert `function isVacuousPyAssert(line)` L308
### tests/report-impact.test.mjs [F:8a3433b070]
- S:69f3537d3b function tmp `function tmp()` L13
- S:1fe8548dac function fixture `function fixture()` L17
### scripts/sync-site-data.mjs [F:8abf9e432a]
- S:c44c6a3e42 function parseEvidence `function parseEvidence()` L18 : Parse RELEASE-EVIDENCE.md to extract gate counts and autonomy status
- S:208ce5b839 function countWorkItems `function countWorkItems()` L48 : Count work items by state
- S:370b67baf2 function readVersion `function readVersion()` L67 : Parse version from .modonome/version
- S:ee17355d71 function updateSite `function updateSite(data)` L76 : Update site/index.html with live data
- S:03b000e190 function verifySiteData `function verifySiteData(data)` L97 : Verify site data matches evidence (used in CI gate)
### scripts/agent/providers.mjs [F:8b5a1f94c4]
- S:542af83b15 const BUILTIN_PROVIDERS `export const BUILTIN_PROVIDERS =` L11 : Built-in providers. A config's `providers` map (see resolveProvider) is merged on top, so a host repo can add or override entries without a code change here.
- S:6ee308cae0 function resolveProvider `export function resolveProvider(name, providersOverride)` L39 : Resolve a provider descriptor by name. Built-ins are merged with an optional * config-provided override map (cfg.providers), so a host repo can redefine or * add providers without touching this file. 
- S:bead992b70 function isBillable `export function isBillable(costClass)` L48 : A cost class is billable only when it is "paid". Free and local roles never require remote_model_budget_usd_per_day.
### scripts/check-state-machine-acyclic.mjs [F:8b8d3c46b3]
- S:97a7516354 function buildAdjacency `function buildAdjacency(machine, { includeCapGuard })` L14 : Build the adjacency map { state: [to, ...] } from the transition list. When includeCapGuard is false, cap_guard edges are dropped: those are the sanctioned bounded-retry escapes and must not count as 
- S:a716bbdaa8 function reaches `function reaches(adjacency, start, targets)` L26 : reaches(adjacency, start, targets) -> bool Whether any node in `targets` is reachable from `start` along the edges.
- S:982b9fa62d function stateMachineErrors `export function stateMachineErrors(machine)` L39
### examples/demo-app/src/index.js [F:8bb1b57470]
- S:a1828ef829 function main `async function main()` L59
### scripts/agent/openai-client.mjs [F:8d2cb93236]
- S:aecf05317d function buildChatCompletionsUrl `export function buildChatCompletionsUrl(baseUrl)` L21 : Join a base URL with the chat-completions path, tolerating a trailing slash * or a base URL that already ends in "/chat/completions". * * @param {string} baseUrl * @returns {string}
- S:b9ed6b7b01 function buildHeaders `export function buildHeaders(authToken, authScheme = "Bearer")` L37 : Build the request headers, including the Authorization header when a token * is supplied. No Authorization header is sent when authToken is falsy, which * suits local endpoints that need none. * * @pa
- S:403ac351dd function buildRequestBody `export function buildRequestBody(model, messages, maxTokens)` L52 : Build the JSON request body. max_tokens is omitted when maxTokens is * undefined, since some endpoints reject an explicit null/undefined field. * * @param {string} model * @param {Array<object>} messa
- S:37693a15d4 function normalizeResponse `export function normalizeResponse(data)` L66 : Normalize a parsed OpenAI chat-completions response into * { text, finishReason, usage }. Throws a clear error on a malformed body * (missing choices, missing message). * * @param {any} data * @return
- S:fd88bace68 function isRetryableStatus `function isRetryableStatus(status)` L80 : Retry only on 429 (rate limit) and 5xx (server error). Any other non-2xx status is a caller error and must not be retried.
- S:969658a48c function sleep `function sleep(ms)` L84
- S:705c285e25 function chatCompletion `export async function chatCompletion(` L105 : POST a chat-completions request to an OpenAI-compatible endpoint and return * a normalized result. * * @param {object} opts * @param {string} opts.baseUrl - Endpoint base, e.g. "https://api.example.co
### tests/chaos.test.mjs [F:8fe56e5618]
- S:8041c36b7b function noThrow `function noThrow(fn)` L18 : Chaos test helper: any call must either return errors cleanly OR not throw. A crash or hang is a failure.
- S:856f3a5bea function ratchetWithTimeout `function ratchetWithTimeout(content)` L28 : Wrap guard-ratchet call with a hard 5-second timeout.
### fixtures/portability/prompt-injection-host/src/main.js [F:90f0999521]
- S:d75c32ea9c function add `export function add(a, b)` L11
- S:d7d594dd8d function multiply `export function multiply(a, b)` L15
### scripts/validate-config.mjs [F:932d33be00]
- S:7c4655c6d7 function loadConfig `export function loadConfig(path)` L13
- S:cfad347ef3 function safetyErrors `export function safetyErrors(cfg)` L27 : Safety rules beyond structural validation. These keep a config from claiming an armed posture without the controls that make arming safe. Note on arming levers: config values such as autonomy_enabled 
- S:88b1d6f116 function validateConfig `export function validateConfig(cfg)` L53
### scripts/build-release-evidence.mjs [F:9344d335a6]
- S:342fb4655a function gate `function gate(script, args = [])` L21
- S:cb97c7b3fc function mark `function mark(ok) { return ok ? "pass" : "FAIL"; }` L25
- S:bcddbe684b function listCaptures `function listCaptures()` L60 : Sample-app captures: real maker and checker runs recorded under examples/<app>/runs/. These directories are committed (unlike the gitignored .modonome/runs/), so summarizing them stays reproducible fr
### examples/node-typescript/src/checkout.ts [F:93f0f5d3de]
- S:0bae1275b2 type Card `export type Card = { number: string; expired: boolean };` L1
- S:94383b0aef type RefundResult `export type RefundResult =` L3
- S:16a3c28802 function charge `export function charge(card: Card): "ok" | "declined"` L9
- S:bf5cf69681 function refund `export function refund(card: Card, amount: number): RefundResult` L13
### scripts/check-edit-set-compliance.mjs [F:9427d264e6]
- S:1b794f5743 function getDiff `function getDiff(baseRef = "origin/main")` L19
- S:d47456131b function getChangedFiles `function getChangedFiles(diff)` L38
- S:2f0240b93f function loadCurrentWorkItem `function loadCurrentWorkItem()` L50
- S:56a4782fc2 function matchesPattern `function matchesPattern(path, patterns)` L75
### tests/e2e.test.mjs [F:9cbe9238f8]
- S:a1107105c3 function tmp `function tmp()` L26
- S:641774928a function run `function run(script, ...args)` L30
- S:765b4574da function mcpCall `function mcpCall(method, params = {})` L34
### scripts/migrate-config.mjs [F:9d69a6b766]
- S:3fd1032067 const CURRENT_SCHEMA_VERSION `export const CURRENT_SCHEMA_VERSION = 1;` L10
- S:18c9f379c0 const SAFE_DEFAULTS `export const SAFE_DEFAULTS =` L13 : Safe defaults for every lever. Migration fills any missing key from here.
- S:b8cdbe3fd3 function migrate `export function migrate(cfg)` L70
### tests/snapshot-cli.test.mjs [F:9f36b3ef29]
- S:ad93bbf998 function run `function run(args, cwd)` L14
- S:107eb40a1d function makeRepo `function makeRepo()` L18
### scripts/snapshot.mjs [F:a0d489df6d]
- S:996743005b function flagValue `function flagValue(argv, name)` L28
- S:59ba63dbab function readConfig `function readConfig(root)` L33
- S:3c2bad87be function snapshotDir `function snapshotDir(root) { return join(root, ".modonome", "snapshot"); }` L39
- S:5353762af1 function loadCommittedSignature `function loadCommittedSignature(root)` L41
- S:d5719588cb function llmsText `function llmsText(signature)` L47
- S:88bd705d3f function badgeJson `function badgeJson(signature, map)` L61
- S:bc3262b829 function writeArtifact `function writeArtifact(root, built)` L70
- S:3466f40801 function buildOptions `function buildOptions(root, argv, now)` L80
- S:6584162247 function nowIso `function nowIso() { return new Date().toISOString(); }` L94
- S:383c03d511 function incrementalInputs `function incrementalInputs(root, argv)` L99 : Resolve incremental build inputs. --full forces a from-scratch rebuild. Otherwise load the cache and ask git what changed; a missing cache or unusable git yields a full rebuild that produces identical
- S:df5cb6eb12 function recomputeMerkle `function recomputeMerkle(root)` L107 : Recompute file hashes and the Merkle root directly from disk. Used by --verify.
- S:8d131c2429 function isSafeGitRevision `function isSafeGitRevision(value)` L118 : A --since ref is free-form git revision syntax (branch, tag, HEAD~N, a SHA), so it cannot be restricted to a fixed pattern the way a cache-internal SHA can. The one property that must hold is that it 
- S:2a5511d42c function gitDelta `function gitDelta(root, ref)` L122
- S:2ce7a5bbe7 function positional `function positional(argv)` L143
- S:ecd0da924a function maybeRegisterParser `async function maybeRegisterParser(root, argv)` L155 : Register the tree-sitter parser when requested via --parser or config, with a graceful fallback to the heuristic default when tree-sitter is not installed.
- S:68308360b1 function main `async function main(argv)` L163
### fixtures/negative-controls/app-syntax-error.js [F:a1411f1423]
- S:7369c62b84 class OrderServiceBroken `export class OrderServiceBroken` L5
### tests/mcp-compliance.test.mjs [F:a167609a41]
- S:07a58ff928 function rpc `function rpc(requests, expectedIds)` L14 : Send requests to a fresh server process and resolve once every expected id has replied. The child is killed as soon as the responses arrive, which avoids the stdin-close race in batch mode.
### scripts/install-hooks.mjs [F:a7ce0f6452]
- S:2681abe2e5 function installHooks `export function installHooks(targetRoot, { self = false } = {})` L31 : Install the pre-commit hook into targetRoot. Returns "installed", "kept" (a host hook already existed and was preserved), or "no-git". self=true writes modonome's own dev hook and overwrites; a host i
### scripts/agent/tool-loop-adapter.mjs [F:aa77f227a6]
- S:170dcaab55 function resolveAdapterCommand `export function resolveAdapterCommand(adapterEntry)` L28 : Resolve the command the external adapter is invoked as. Precedence: an explicit * adapterEntry.command, then adapterEntry.name, then a bare fallback. The value is * a bare command name resolved agains
- S:d7a4f68100 function containedCwd `export function containedCwd(root, target)` L46 : Enforce ADR-009 path containment. The adapter's working directory must resolve * to exactly the target directory (resolve(root, plan.target)); a cwd outside the * target, reached via ".." or an absolu
- S:5b2eae49a8 function sep `function sep()` L56
- S:7ed39c68da function buildAdapterArgs `export function buildAdapterArgs(endpoint, maxTurns, adapterEntry)` L72 : Build the argument vector for the external CLI. Points it at the resolved * endpoint (base URL and model), forwards a bounded max-turns flag, and reads the * prompt from stdin (so no prompt text lands
- S:bd7f311fdb function runToolLoopAdapter `export async function runToolLoopAdapter(` L98 : Run the external agentic CLI for one role. Never throws on a bounded/expected * failure (spawn error, non-zero exit, timeout, cap hit): returns a clean status * object mirroring the single-shot path's
### scripts/mcp-server.mjs [F:ab5077147a]
- S:55a57d9fd6 function toolRatchet `async function toolRatchet(args)` L167
- S:a4d0ce8fea function toolValidateConfig `async function toolValidateConfig(args)` L214
- S:2d1eeb5346 function toolValidateWorkItem `async function toolValidateWorkItem(args)` L239
- S:6499fa18ee function toolStatus `async function toolStatus(args)` L263
- S:2d2b3ccfa2 function toolCompliance `async function toolCompliance(args)` L317
- S:f613554429 function toolVerifyAttestation `async function toolVerifyAttestation(args)` L326
- S:521fca28ad function toolSnapshot `async function toolSnapshot(args)` L343
- S:16d8c02a8e function send `function send(obj)` L371
- S:2306976428 function errorResponse `function errorResponse(id, code, message)` L375
- S:dd3b976184 function handleRequest `async function handleRequest(req)` L379
### scripts/promote-learning.mjs [F:ac11b5379f]
- S:a6ff0bb6d7 function slugifyId `function slugifyId(lesson)` L26 : Slugify a lesson into a deterministic ID.
- S:928743a069 function buildLearningRecord `export function buildLearningRecord(opts = {})` L37 : Build a learning record from options.
- S:562052e079 function validateLearningRecord `export function validateLearningRecord(record)` L61 : Validate a learning record. Returns an array of error strings. Empty array means valid.
### scripts/check-evidence-secrets.mjs [F:ace169adc4]
- S:e19487a8ae function resolveFiles `function resolveFiles(argPath)` L20 : Resolve the list of files to scan. If a path argument is supplied use it directly; otherwise walk examples/runs/metrics.jsonl via readdirSync.
### scripts/lib/repo-detect.mjs [F:ae46bbab81]
- S:c79db45132 function helpers `function helpers(target)` L11 : Build the small file helpers a detector needs, bound to one target directory.
- S:13fa2b4863 function detectStack `export function detectStack(target = ".")` L20 : Detect the primary stack. Returns { name, pm, gates } exactly as the dry-run sweep expects, plus { entrypoints, commands } for the snapshot signature.
- S:3575202801 function detectProtected `export function detectProtected(target = ".")` L57 : Paths that must never be auto-merged. Same list the dry-run sweep reports.
- S:9e9207d834 function detectInstructions `export function detectInstructions(target = ".")` L67 : Repo instruction files an agent should read first.
- S:7c716c856e function detectHotFiles `export function detectHotFiles(target = ".", { commits = 200, limit = 3 } = {})` L75 : Rank files by how often they changed in recent git history. The dry-run sweep uses the default limit of 3; the snapshot passes a larger limit to score churn across the whole tree. Returns [] when git 
- S:7fe7ee7f43 function dedupe `function dedupe(arr)` L94
### site/index.html [F:aef9cf1e27]
- S:52826c5034 class Component `class Component extends DCLogic` L613
### scripts/lib/run-gate-capped.mjs [F:b014028f57]
- S:6122b96d0b function runGateCapped `export function runGateCapped(cmdArray, { timeoutMs = 30000, maxBuffer = 67108864 } = {})` L11
### tests/performance.test.mjs [F:b28f13b600]
- S:41ad75ea93 function buildLargeDiff `function buildLargeDiff(lines)` L17 : Build a synthetic 1000-line diff that is clean (no gaming patterns).
### tests/dependency.test.mjs [F:b70824b13e]
- S:18da5ae581 function listMjs `function listMjs(dir, recursive = false)` L13 : Read all .mjs files in a directory (non-recursive by default).
- S:df7a91f366 function extractImportSpecifiers `function extractImportSpecifiers(source)` L29 : Extract import specifiers from a file's source text. Only matches actual import statements (not comments or JSDoc).
- S:3702b2fefe function isAllowedImport `function isAllowedImport(specifier)` L47
### examples/demo-app/src/NotificationService.js [F:b9d806ba4d]
- S:fedbb5f441 class NotificationService `export class NotificationService` L4
### tests/provenance.test.mjs [F:ba97282cf5]
- S:eb51a5641a function makePacket `function makePacket(overrides = {})` L7 : Base valid packet factory: returns a fresh object each call.
### tests/tick.test.mjs [F:baf7641a01]
- S:ebb9dad93b function tmp `function tmp()` L12
- S:79a288a97f function runTick `function runTick(stateDir)` L16
- S:77054cfc82 function makeItem `function makeItem(overrides = {})` L23
- S:028a668f8e function writeItem `function writeItem(itemsDir, name, item)` L34
- S:357942abbf function readItem `function readItem(itemsDir, name)` L38
### tests/ws-e-negative-controls.test.mjs [F:bbb6476d71]
- S:f5a71d2ca6 function runScript `function runScript(script, args = [], env = {})` L19
### examples/demo-app/src/InventoryService.js [F:bd02b28f17]
- S:c7db2cc29d class InventoryService `export class InventoryService` L3
### scripts/build-prompt.mjs [F:c4395c3023]
- S:27005d8f20 function buildBundle `function buildBundle()` L25
### scripts/check-promotion-readiness.mjs [F:c5938c33fd]
- S:3ad956fb93 function configDefaults `function configDefaults(rel)` L32
- S:1e5dabea9c function hasHeading `function hasHeading(text, section)` L39 : Check that a section appears as a Markdown heading (h1-h6), so a one-line ADR with the section words buried in prose cannot game the gate.
- S:6b1894b02c function findPromotionAdr `function findPromotionAdr(flag)` L43
### scripts/lib/lang-adapters/java.mjs [F:c598a2d684]
- S:03b490fb81 function clean `function clean(text)` L7
- S:ec2e53ab2e function signature `function signature(line)` L12
- S:ebdb053467 function docAbove `function docAbove(lines, index)` L17
- S:df1c5c3628 const adapter `export const adapter =` L33
### scripts/audit-learnings.mjs [F:c9493b5275]
- S:9299cd9a70 function matches `function matches(l)` L29
### scripts/check-style.mjs [F:ca0833ac73]
- S:ee9b2c90d1 function walk `function walk(dir, out = [])` L21
### scripts/lib/snapshot-walk.mjs [F:cb66095cb4]
- S:7c5c3a31a4 function compilePattern `function compilePattern(pattern)` L41 : Compile one gitignore-style pattern into a tester over a posix relative path. Supported: comments, negation (!), leading / (anchored), trailing / (directory), * (within a segment), ** (across segments
- S:531cf59eb3 function loadIgnore `export function loadIgnore(root)` L86 : Build an ignore predicate for a repo root. The predicate takes a posix relative path and returns true when the path should be excluded. Later patterns win, so a negation can re-include a path a broad 
- S:d4e650f5ae function walkRepo `export function walkRepo(root, { ignore = () => false, maxDepth = 12 } = {})` L110 : Walk a repository into a sorted list of files. Symlinks are skipped to avoid cycles and escapes. Returns [{ relPath, absPath, size }] ordered by relPath.
### scripts/check-licenses.mjs [F:cc361bd05a]
- S:25117f5b1d function normalizeLicense `function normalizeLicense(raw)` L22
- S:cb3211f3c2 function checkLicenses `export function checkLicenses(pkg, manifest)` L28 : Core check. Takes the parsed package.json and (optional) adapters manifest and returns a list of human-readable problem strings. Pure: no filesystem or network.
- S:310e2149b2 function runCli `function runCli()` L76 : CLI: read package.json and adapters.json from the repo root and report PASS/FAIL.
### tests/embedding-safety.test.mjs [F:cc65dd1342]
- S:298b204d13 function runPreflight `function runPreflight(fixtureName)` L22 : Run preflight in --json mode against a fixture. Returns { code, report, raw }. A clean environment is used so the host's own MODONOME_* shell does not leak into the env-pollution check.
- S:c73cab5b60 function ids `function ids(report)` L42
- S:2ca7aeeeaf function findingsBySeverity `function findingsBySeverity(report, severity)` L46
### scripts/lib/lang-adapters/tree-sitter.mjs [F:cecdb96382]
- S:ad7d7732a1 function makeExtract `function makeExtract(Parser, grammar)` L24
- S:464c90cba5 function registerTreeSitter `export async function registerTreeSitter(register)` L71 : Attempt to register tree-sitter adapters. `register` is the registry's registerAdapter. Returns true when at least one grammar was registered.
### scripts/transition-work-item.mjs [F:d135cffeaa]
- S:8d1ca74a54 function leaseHolder `function leaseHolder(item)` L22 : A lease is "live" if it has an owner and an unexpired lease_expires_at. The lease holder is recorded as lease_owner (the field this swap writes) or, for older items, the schema's `owner` field; either
- S:87ca9c146a function leaseIsLive `function leaseIsLive(item, now)` L26
- S:fd822bf451 function tryTransition `export function tryTransition(item, fromState, toState, writerId, now = new Date())` L38 : tryTransition(item, fromState, toState, writerId, now) -> result { ok: true, item } swap succeeded; item is a fresh copy { ok: false, conflict: "<reason>" } swap refused; item is left untouched `now` 
### tests/run-log.test.mjs [F:d7d4e8d2a9]
- S:fe9c17eefa function tmp `function tmp()` L12
- S:37a0d721be function run `function run(script, ...args)` L16
### scripts/lib/snapshot-core.mjs [F:dbb9c92ca1]
- S:8d30c800e7 const SNAPSHOT_SCHEMA_VERSION `export const SNAPSHOT_SCHEMA_VERSION = 1;` L20
- S:154918aa5a function isBinary `function isBinary(buffer)` L32 : Detect binary content by scanning a prefix for a null byte.
- S:3734794a77 function extOf `function extOf(relPath)` L38
- S:cbe5a2e179 function firstCommentLine `function firstCommentLine(source)` L44
- S:05fa5077ed function rawPurpose `function rawPurpose(relPath, symbols, source)` L57 : Derive a module purpose from its symbols and source. Returns the raw (unredacted) string so it can be cached; redaction is applied at map assembly time.
- S:e9e4290005 function buildSnapshot `export function buildSnapshot(root, opts = {})` L67 : Build the full snapshot for a repository root.
- S:45b2f146f0 function buildEdgeList `function buildEdgeList(adjacency, pathIdByPath)` L274 : Resolve adjacency into a sorted edge list of dictionary path ids.
- S:dbf47f93d3 function renderMarkdown `function renderMarkdown({ generatedFor, merkleRoot, files, totalBytes, map })` L288
- S:890a9e6691 function readGovernance `function readGovernance(root)` L339 : Read a light governance posture from the target config and environment. It never arms anything; it only reports posture so a snapshot can double as a status probe.
### tests/promoted-learnings.test.mjs [F:ddd82fc886]
- S:e0832e1baa function withRoot `function withRoot(learningsBody)` L8
### scripts/agent/run-cycle.mjs [F:ddeb486c49]
- S:1d6822da4e function resolveRoleSequence `export function resolveRoleSequence(cfg)` L48 : Derive the ordered list of roles the cycle executes. An explicit cfg.role_sequence (a non-empty array of role names) is honored so a crew role added in config runs with no code change; otherwise it de
- S:4b76f865fa function resolveExecMode `export function resolveExecMode(cfg, model)` L58 : Resolve a role's execution mode from its model's config entry. The default is "patch" (the WI-029 single-shot-diff path) whenever exec_mode is absent, so existing configs behave exactly as before. Onl
- S:41689151ff function parseArgs `export function parseArgs(argv)` L63
- S:15286656f4 function localEnv `function localEnv(opts, env)` L84 : The execution environment this process is running in. Routing compares each role's required target against this to decide inline vs enqueue. Precedence: an explicit --worker-env flag, then MODONOME_WO
- S:959be959f7 function planCycle `export function planCycle(opts, cfg, runId)` L91 : Resolve and validate a full cycle plan without calling any model. Pure: it reads the passed config and runId and throws on any policy violation. This is the testable core of the harness; the execute p
- S:a75126f856 function buildRunnerEnv `export function buildRunnerEnv(baseEnv, role)` L177 : Build the child-process environment for a role invocation. When the resolved model carries a base_url (a local, self-hosted, or gateway endpoint), route the CLI there by setting ANTHROPIC_BASE_URL, wh
- S:9b986c2d8a function buildRolePrompt `function buildRolePrompt(plan, role, env)` L187 : Render the role prompt with the same variables regardless of transport: identity/model placeholders, the run branch, and promoted learnings.
- S:9f59110fda function writeTranscriptAndMetric `function writeTranscriptAndMetric(plan, role, r, transcriptText, extra = {})` L207 : Write the transcript log and append the schema-conformant metric shared by every transport. `extra` merges additional fields into the metric record (for example whether an openai-http patch applied).
- S:fe41df17f9 function invokeRoleClaudeCli `function invokeRoleClaudeCli(plan, role, env)` L235
- S:c028c053e3 function invokeRoleOpenAI `export async function invokeRoleOpenAI(plan, role, env, deps = {})` L257 : Provider-native single-shot execution: render the same prompt, call an OpenAI-compatible chat-completions endpoint once, and turn the response into file changes deterministically by extracting a unifi
- S:8f6d716f36 function loadAdapterEntry `function loadAdapterEntry(deps = {})` L291 : Load the single agentic-CLI adapter entry from adapters.json for the tool-loop path. Returns the first declared adapter, or null when the manifest is empty or absent (which makes tool-loop degrade to 
- S:83b3a2ab69 function invokeRoleToolLoop `export async function invokeRoleToolLoop(plan, role, env, deps = {})` L311 : Agentic tool-loop execution: spawn the declared external coding CLI (adapt-first, ADR-032) pointed at the resolved OpenAI-compatible endpoint. Containment, the turn cap, and the wall-clock timeout are
- S:f8004b7b76 function invokeRole `function invokeRole(plan, role, env, deps)` L343
- S:4f43d4e206 function runCycle `export function runCycle(opts, { execute, cfg, runId, env = process.env, queueDir, deps })` L357 : Execute a plan. Refuses a hosted run when the budget is zero. Runs the maker, then the checker, each as a distinct CLI invocation with its own model and identity. `deps` (chatCompletionImpl/applyPatch
- S:d33c2c4d3e function runRoles `function runRoles(plan, roles, env, deps)` L402 : Invoke each role in turn and produce the "executed" result. A role's transport decides whether invokeRole returns a status number synchronously (anthropic-cli) or a Promise (openai-http, which awaits 
- S:f71a25079c function main `async function main()` L417
### tests/scaffold-adoption.test.mjs [F:de5ebbf586]
- S:fe07a3bcbc function gitRepo `function gitRepo()` L13
- S:8579f519b1 function scaffold `function scaffold(dir, extra = [])` L25
### scripts/score-proposals.mjs [F:e11f907cba]
- S:73e4b1bbf9 const SIGNAL_MIN `export const SIGNAL_MIN = 0;` L31
- S:ad1b93bd0c const SIGNAL_MAX `export const SIGNAL_MAX = 5;` L32
- S:d4349c402c const NEUTRAL_SIGNAL `export const NEUTRAL_SIGNAL = 2.5;` L33
- S:81bb2e8cc4 function clamp `function clamp(n)` L39
- S:fb06279d5d function normalizeSignals `export function normalizeSignals(signals = {})` L48 : Fill in missing signal fields with the documented neutral value and clamp every field to the [SIGNAL_MIN, SIGNAL_MAX] scale.
- S:574c990b3f function scoreProposal `export function scoreProposal(signals = {})` L59 : Pure scoring function. Higher score means higher priority: more value and safety for less effort, risk, and uncertainty.
- S:c53d33aa2a function scoreProposals `export function scoreProposals(proposalsWithSignals = [])` L71 : Sort proposals by descending score. Each entry may be a plain signals object or carry signals under an explicit `signals` key alongside other fields (for example `id` or `proposal` text), which are pr
- S:3cceb8dc09 function deriveSignals `export function deriveSignals(proposalText, context = {})` L96 : Heuristic, deterministic signal derivation from a proposal string and a simple context object. This is a convenience default, not a source of truth: callers with better signals should pass them direct
### tests/role-registry.test.mjs [F:e2f1b5ac07]
- S:e1813dcc71 function baseCfg `function baseCfg(extra = {})` L25 : A single-environment config with no runner reachability declared, so routing stays inline for every role (matching the shipped default posture). Crew roles are added by extending `roles`, `models`, an
### scripts/lib/commit-identity.mjs [F:e4ff19bbe2]
- S:d7029fdff9 function isForbiddenIdentity `export function isForbiddenIdentity(name, email)` L26 : True when a name or email belongs to a denylisted agent or vendor identity. * Real automation such as dependabot is allowed; only coding-agent and model * vendor identities are rejected.
- S:5c7ed4ab16 function findForbiddenCommits `export function findForbiddenCommits(logOutput)` L42 : Parse `git log` output where each commit is one line of * "authorName<TAB>authorEmail<TAB>committerName<TAB>committerEmail<TAB>shortSha". * Returns the commits whose author or committer is a forbidden
### tests/promote-learning.test.mjs [F:e540f7b669]
- S:f040dfb6c9 function run `function run(script, args = [])` L15
### tests/helpers/mock-openai-server.mjs [F:eb14a0bdeb]
- S:135fde5dfb function startMockServer `export function startMockServer(options = {})` L23 : Start a mock OpenAI chat-completions server. * * @param {object} [options] * @param {"success"|"retry-then-success"|"delay"|"malformed"|"error"} [options.mode] * - "success": always returns a normal c
- S:b65916676a function successBody `function successBody(overrides)` L98
- S:ac31df31c0 function writeJson `function writeJson(res, status, body)` L113
### tests/tool-loop-adapter.test.mjs [F:ed9c47feb2]
- S:b1e3e516c3 function makeFakeSpawn `function makeFakeSpawn(script = {})` L27 : A scriptable fake child process. Captures the constructor call, emits the configured stdout/stderr, then closes (or hangs, when never told to close).
### scripts/run-gate-pipeline.mjs [F:edb11415f0]
- S:dd1940719c function parseArgs `function parseArgs(argv)` L44 : parseArgs(argv) -> { diff, "work-item" } map of fixture paths by gate arg name.
- S:e6654c6139 function gateOrder `export function gateOrder(graph)` L57 : gateOrder(graph) -> [...] the gates in dependency-first topological order. topoSort orders a gate ahead of the gates it points to, so reverse to put each gate's dependencies before the gate itself.
- S:6e6111c7dd function runPipeline `export function runPipeline(order, fixtures)` L68 : runPipeline(order, fixtures) -> [...] failures in topological order. Each failure is { gate, reason }. A missing fixture for a gate is itself a failure: the gate cannot be evaluated, so the pipeline m
### scripts/release.mjs [F:edf42fb1af]
- S:66bb927095 function run `function run(cmd, opts = {})` L9
### tests/providers.test.mjs [F:ee02e563c6]
- S:c1e6062cfc function baseCfg `function baseCfg(overrides = {})` L109
### scripts/validate-work-item.mjs [F:f07f8ebca9]
- S:28736bfacf function modelFamily `function modelFamily(model)` L17 : Resolve a model name to its family by longest-matching prefix. Returns null when no prefix matches, so unrecognized models are treated as distinct families (they fall through the family check and are 
- S:c3ace341b4 function governanceErrors `export function governanceErrors(item, config = {})` L30 : Governance rules that JSON Schema cannot express (cross-field invariants).
- S:33100346b9 function validateWorkItem `export function validateWorkItem(item, config = {})` L88
### tests/ratchet.test.mjs [F:f238d164c9]
- S:2e93f745f3 function ratchet `function ratchet(diffPath)` L16
### scripts/lib/graph.mjs [F:f51cba9beb]
- S:3c3cd672a7 function isCyclic `export function isCyclic(adjacency)` L11 : isCyclic(adjacency) -> { cyclic: bool, cycle: [...] } Detects whether the graph contains a cycle. When a cycle is found, `cycle` holds the nodes involved in the order they were detected via DFS (the f
- S:075e86ea7c function topoSort `export function topoSort(adjacency, nodes)` L48 : topoSort(adjacency, nodes) -> { order: [...], error?: string } Returns a topological ordering of `nodes` given the directed edges in `adjacency`. Nodes not present in `nodes` but reachable via edges a
- S:9ec4198171 function collectNodes `function collectNodes(adjacency)` L75 : Collect every node mentioned either as a key or as a neighbour value.
### examples/demo-app/tests/InventoryService.test.js [F:f8168b956f]
- S:af1e7a50ba function makeDb `function makeDb()` L5
### bin/modonome.mjs [F:f90930c3c3]
- S:5835c8b608 function resolveArming `export function resolveArming(targetDir, env = process.env)` L40 : The authoritative arming gate. A config file the agent can write can never arm the engine on its own: arming requires the MODONOME_ARMED=true environment variable, which lives in CI or operator scope,
- S:53b9eda0f8 function run `function run(script, args)` L61
- S:214691c25d function targetDirFrom `function targetDirFrom(rest)` L71
- S:9249714b12 function main `function main(argv)` L75
### tests/metrics.test.mjs [F:fadcf390da]
- S:c176253e9c function tmp `function tmp()` L12
- S:8bff005013 function runReport `function runReport(targetDir)` L16
- S:5919844321 function makeEvent `function makeEvent(event, extra = {})` L24 : Schema-conformant event line using "event" field (not "type").
### scripts/check-gate-dag.mjs [F:fc21812307]
- S:9d42aeefd9 function gateGraphErrors `export function gateGraphErrors(graph)` L20 : gateGraphErrors(graph) -> { errors: [...], order: [...] } `errors` lists every defect (dangling edge or cycle); when it is empty, `order` holds a topological ordering with dependencies before dependen
### scripts/check-checker-engagement.mjs [F:fc5d887ff6]
- S:aa00911a72 function readEvents `function readEvents(path)` L23
### scripts/check-md-governance.mjs [F:fd08562f92]
- S:99ae98a428 function walkMd `function walkMd(dir, out = [])` L60
- S:575af01d8c function checkTarget `function checkTarget(fileDir, rawTarget, srcFile)` L105
- S:bc1fd2c5b3 function adrNumbers `function adrNumbers(dir)` L141 : 4. ADR number uniqueness across docs/adr and docs/research.
- S:24c6a3dc6c function parseFrontMatter `function parseFrontMatter(text)` L174 : Front-matter parsing for canonical uniqueness and advisory presence.
### scripts/agent/render-prompt.mjs [F:fd660a117b]
- S:22e3bba95f function snapshotContext `export function snapshotContext(root = process.cwd())` L23 : Build a compact repository-snapshot context block from the committed Tier 0 signature, so every rendered role prompt starts pre-oriented and an agent can read the map instead of scanning the whole tre
- S:2b5847c683 function renderPrompt `export function renderPrompt(role, env = process.env)` L58 : Substitute every ${VAR} from env. Throw if a referenced variable is unset, so a missing identity or branch fails loudly instead of rendering an empty value into a model prompt.
### tests/portability.test.mjs [F:fd6ebce602]
- S:cf03857559 function runValidateConfig `function runValidateConfig(configPath, opts = {})` L28 : Run validate-config.mjs against a given config path.
- S:5daa909048 function runGuardRatchet `function runGuardRatchet(diffPath, opts = {})` L37 : Run guard-ratchet.mjs with a --diff fixture.
- S:cdac115f81 function runPortabilityCheck `function runPortabilityCheck(fixturePath, opts = {})` L46 : Run check-portability.mjs against a fixture directory.
### examples/demo-app/src/PaymentProcessor.js [F:ff3aef693f]
- S:9dee57c7c2 class PaymentProcessor `export class PaymentProcessor` L5
### scripts/lib/lang-adapters/go.mjs [F:ffe5c1269b]
- S:e7e0d4979a function clean `function clean(text)` L5 : Dependency-free signature extractor for Go. It captures top-level func (including methods with a receiver), type, const, and var declarations, their preceding line comments, and import edges (single a
- S:a9f138bd93 function signature `function signature(line)` L10
- S:f9d6a590e4 function docAbove `function docAbove(lines, index)` L14
- S:28d1266e44 const adapter `export const adapter =` L24

## Import edges

- scripts/lib/snapshot-graph.mjs -> scripts/lib/graph.mjs
- examples/demo-app/tests/OrderService.test.js -> examples/demo-app/src/OrderService.js
- tests/check-licenses.test.mjs -> scripts/check-licenses.mjs
- tests/packet.test.mjs -> scripts/validate-knowledge-packet.mjs
- scripts/verify-packet.mjs -> scripts/lib/ed25519.mjs
- scripts/verify-packet.mjs -> scripts/lib/canonical-json.mjs
- scripts/verify-packet.mjs -> scripts/validate-knowledge-packet.mjs
- tests/config.test.mjs -> scripts/lib/yaml-lite.mjs
- tests/config.test.mjs -> scripts/lib/jsonschema.mjs
- tests/config.test.mjs -> scripts/validate-config.mjs
- tests/config.test.mjs -> scripts/migrate-config.mjs
- scripts/lib/packet-id.mjs -> scripts/lib/canonical-json.mjs
- tests/ws-b-harness.test.mjs -> scripts/validate-config.mjs
- tests/ws-b-harness.test.mjs -> scripts/agent/run-cycle.mjs
- tests/ws-b-harness.test.mjs -> scripts/agent/render-prompt.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/python.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/js-ts.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/generic.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/java.mjs
- scripts/lib/lang-adapters/index.mjs -> scripts/lib/lang-adapters/go.mjs
- tests/snapshot-golden.test.mjs -> scripts/lib/lang-adapters/index.mjs
- tests/snapshot-golden.test.mjs -> scripts/lib/lang-adapters/tree-sitter.mjs
- scripts/lib/merkle.mjs -> scripts/lib/canonical-json.mjs
- scripts/agent/resolve-role.mjs -> scripts/agent/providers.mjs
- scripts/check-learning-traceability.mjs -> scripts/lib/learnings.mjs
- examples/demo-app/tests/PaymentProcessor.test.js -> examples/demo-app/src/PaymentProcessor.js
- tests/ws-h-config.test.mjs -> scripts/lib/yaml-lite.mjs
- tests/ws-h-config.test.mjs -> scripts/agent/resolve-role.mjs
- tests/ws-h-config.test.mjs -> scripts/validate-config.mjs
- tests/run-gate-capped-unit.test.mjs -> scripts/lib/run-gate-capped.mjs
- examples/demo-app/tests/CartService.test.js -> examples/demo-app/src/CartService.js
- tests/secret-patterns-unit.test.mjs -> scripts/lib/secret-patterns.mjs
- tests/packet-signing.test.mjs -> scripts/verify-packet.mjs
- tests/packet-signing.test.mjs -> scripts/lib/packet-id.mjs
- tests/packet-signing.test.mjs -> scripts/lib/canonical-json.mjs
- tests/packet-signing.test.mjs -> scripts/sign-packet.mjs
- scripts/check-self-application.mjs -> scripts/lib/yaml-lite.mjs
- scripts/check-self-application.mjs -> scripts/lib/jsonschema.mjs
- tests/runner-env.test.mjs -> scripts/agent/run-cycle.mjs
- tests/snapshot-incremental.test.mjs -> scripts/lib/snapshot-cache.mjs
- tests/snapshot-incremental.test.mjs -> scripts/lib/canonical-json.mjs
- tests/snapshot-incremental.test.mjs -> scripts/lib/snapshot-core.mjs
- tests/self-application.test.mjs -> scripts/lib/jsonschema.mjs
- scripts/lib/snapshot-redact.mjs -> scripts/lib/secret-patterns.mjs
- tests/branch-name.test.mjs -> scripts/lib/branch-name.mjs
- tests/openai-client.test.mjs -> tests/helpers/mock-openai-server.mjs
- examples/demo-app/tests/CheckoutService.test.js -> examples/demo-app/src/CheckoutService.js
- tests/learnings.test.mjs -> scripts/lib/learnings.mjs
- tests/run-cycle-openai.test.mjs -> scripts/agent/apply-patch.mjs
- tests/run-cycle-openai.test.mjs -> scripts/agent/run-cycle.mjs
- tests/run-cycle-openai.test.mjs -> tests/helpers/mock-openai-server.mjs
- tests/maker-checker.test.mjs -> scripts/validate-work-item.mjs
- scripts/agent/action-queue.mjs -> scripts/lib/jsonschema.mjs
- scripts/scaffold.mjs -> scripts/install-hooks.mjs
- tests/arming.test.mjs -> bin/modonome.mjs
- scripts/check-repo-hygiene.mjs -> scripts/lib/branch-name.mjs
- scripts/check-repo-hygiene.mjs -> scripts/lib/commit-identity.mjs
- scripts/validate-knowledge-packet.mjs -> scripts/lib/jsonschema.mjs
- scripts/validate-knowledge-packet.mjs -> scripts/lib/secret-patterns.mjs
- scripts/dry-run-sweep.mjs -> scripts/lib/repo-detect.mjs
- scripts/dry-run-sweep.mjs -> scripts/score-proposals.mjs
- scripts/sign-packet.mjs -> scripts/lib/canonical-json.mjs
- tests/resolve-role.test.mjs -> scripts/agent/resolve-role.mjs
- scripts/check-work-items.mjs -> scripts/lib/yaml-lite.mjs
- scripts/check-work-items.mjs -> scripts/validate-work-item.mjs
- scripts/check-drift.mjs -> scripts/lib/yaml-lite.mjs
- scripts/check-drift.mjs -> scripts/migrate-config.mjs
- tests/transition-work-item-unit.test.mjs -> scripts/transition-work-item.mjs
- scripts/check-state-machine-acyclic.mjs -> scripts/lib/graph.mjs
- examples/demo-app/src/index.js -> examples/demo-app/src/OrderService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/CheckoutService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/CartService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/NotificationService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/InventoryService.js
- examples/demo-app/src/index.js -> examples/demo-app/src/PaymentProcessor.js
- tests/chaos.test.mjs -> scripts/lib/yaml-lite.mjs
- tests/chaos.test.mjs -> scripts/validate-knowledge-packet.mjs
- tests/chaos.test.mjs -> scripts/validate-config.mjs
- scripts/validate-config.mjs -> scripts/lib/yaml-lite.mjs
- scripts/validate-config.mjs -> scripts/lib/jsonschema.mjs
- scripts/build-release-evidence.mjs -> scripts/lib/yaml-lite.mjs
- scripts/build-release-evidence.mjs -> scripts/lib/learnings.mjs
- scripts/migrate-config.mjs -> scripts/lib/yaml-lite.mjs
- tests/snapshot-cli.test.mjs -> scripts/lib/jsonschema.mjs
- scripts/snapshot.mjs -> scripts/lib/snapshot-cache.mjs
- scripts/snapshot.mjs -> scripts/lib/yaml-lite.mjs
- scripts/snapshot.mjs -> scripts/lib/canonical-json.mjs
- scripts/snapshot.mjs -> scripts/lib/lang-adapters/index.mjs
- scripts/snapshot.mjs -> scripts/lib/merkle.mjs
- scripts/snapshot.mjs -> scripts/lib/snapshot-walk.mjs
- scripts/snapshot.mjs -> scripts/lib/lang-adapters/tree-sitter.mjs
- scripts/snapshot.mjs -> scripts/lib/snapshot-core.mjs
- scripts/promote-learning.mjs -> scripts/lib/learnings.mjs
- scripts/check-evidence-secrets.mjs -> scripts/lib/secret-patterns.mjs
- tests/snapshot-security.test.mjs -> scripts/lib/snapshot-cache.mjs
- tests/snapshot-security.test.mjs -> scripts/lib/snapshot-walk.mjs
- tests/snapshot-security.test.mjs -> scripts/lib/snapshot-core.mjs
- tests/performance.test.mjs -> scripts/validate-knowledge-packet.mjs
- tests/performance.test.mjs -> scripts/validate-config.mjs
- tests/performance.test.mjs -> scripts/validate-work-item.mjs
- tests/provenance.test.mjs -> scripts/validate-knowledge-packet.mjs
- tests/ws-e-negative-controls.test.mjs -> scripts/lib/learnings.mjs
- tests/ws-e-negative-controls.test.mjs -> scripts/validate-work-item.mjs
- tests/sweep-to-work-item.test.mjs -> scripts/dry-run-sweep.mjs
- tests/sweep-to-work-item.test.mjs -> scripts/validate-work-item.mjs
- scripts/check-promotion-readiness.mjs -> scripts/lib/yaml-lite.mjs
- scripts/audit-learnings.mjs -> scripts/lib/learnings.mjs
- examples/demo-app/tests/NotificationService.test.js -> examples/demo-app/src/NotificationService.js
- tests/render-prompt-unit.test.mjs -> scripts/agent/render-prompt.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/snapshot-graph.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/yaml-lite.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/snapshot-anchors.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/canonical-json.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/lang-adapters/index.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/merkle.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/snapshot-redact.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/token-estimate.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/repo-detect.mjs
- scripts/lib/snapshot-core.mjs -> scripts/lib/snapshot-walk.mjs
- tests/promoted-learnings.test.mjs -> scripts/lib/learnings.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/resolve-role.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/route-action.mjs
- scripts/agent/run-cycle.mjs -> scripts/lib/learnings.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/action-queue.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/parse-checker-telemetry.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/apply-patch.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/providers.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/openai-client.mjs
- scripts/agent/run-cycle.mjs -> scripts/validate-config.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/tool-loop-adapter.mjs
- scripts/agent/run-cycle.mjs -> scripts/agent/render-prompt.mjs
- tests/role-registry.test.mjs -> scripts/agent/resolve-role.mjs
- tests/role-registry.test.mjs -> scripts/validate-config.mjs
- tests/role-registry.test.mjs -> scripts/agent/run-cycle.mjs
- tests/promote-learning.test.mjs -> scripts/lib/learnings.mjs
- tests/tool-loop-adapter.test.mjs -> scripts/agent/run-cycle.mjs
- scripts/run-gate-pipeline.mjs -> scripts/lib/run-gate-capped.mjs
- scripts/run-gate-pipeline.mjs -> scripts/lib/graph.mjs
- tests/providers.test.mjs -> scripts/agent/resolve-role.mjs
- tests/providers.test.mjs -> scripts/agent/providers.mjs
- tests/providers.test.mjs -> scripts/validate-config.mjs
- tests/providers.test.mjs -> scripts/agent/run-cycle.mjs
- tests/commit-identity.test.mjs -> scripts/lib/commit-identity.mjs
- scripts/validate-work-item.mjs -> scripts/lib/jsonschema.mjs
- examples/demo-app/tests/InventoryService.test.js -> examples/demo-app/src/InventoryService.js
- bin/modonome.mjs -> scripts/validate-config.mjs
- scripts/check-gate-dag.mjs -> scripts/lib/graph.mjs

## Attention (centrality + pagerank)

1. scripts/lib/jsonschema.mjs centrality=8 pagerank=0.018096
2. scripts/lib/yaml-lite.mjs centrality=12 pagerank=0.013272
3. scripts/agent/run-cycle.mjs centrality=17 pagerank=0.006266
4. scripts/lib/learnings.mjs centrality=9 pagerank=0.012059
5. scripts/validate-config.mjs centrality=11 pagerank=0.007836
6. scripts/lib/canonical-json.mjs centrality=8 pagerank=0.008677
7. scripts/lib/snapshot-core.mjs centrality=13 pagerank=0.002786
8. scripts/validate-knowledge-packet.mjs centrality=7 pagerank=0.006012
9. scripts/lib/secret-patterns.mjs centrality=4 pagerank=0.008669
10. scripts/validate-work-item.mjs centrality=6 pagerank=0.005676
11. scripts/lib/lang-adapters/index.mjs centrality=8 pagerank=0.002787
12. scripts/agent/resolve-role.mjs centrality=6 pagerank=0.004863
13. scripts/lib/graph.mjs centrality=4 pagerank=0.006821
14. scripts/snapshot.mjs centrality=8 pagerank=0.001665
15. scripts/agent/providers.mjs centrality=3 pagerank=0.006637
16. examples/demo-app/src/index.js centrality=6 pagerank=0.001665
17. scripts/agent/render-prompt.mjs centrality=3 pagerank=0.004037
18. scripts/verify-packet.mjs centrality=4 pagerank=0.002019
19. scripts/lib/snapshot-cache.mjs centrality=3 pagerank=0.002786
20. tests/config.test.mjs centrality=4 pagerank=0.001665
21. tests/packet-signing.test.mjs centrality=4 pagerank=0.001665
22. tests/providers.test.mjs centrality=4 pagerank=0.001665
23. scripts/migrate-config.mjs centrality=3 pagerank=0.002727
24. scripts/lib/branch-name.mjs centrality=2 pagerank=0.003789
25. scripts/lib/commit-identity.mjs centrality=2 pagerank=0.003789
26. scripts/lib/run-gate-capped.mjs centrality=2 pagerank=0.003789
27. scripts/lib/snapshot-walk.mjs centrality=3 pagerank=0.002551
28. tests/helpers/mock-openai-server.mjs centrality=2 pagerank=0.003553
29. scripts/dry-run-sweep.mjs centrality=3 pagerank=0.002373
30. examples/demo-app/src/CartService.js centrality=2 pagerank=0.003317
31. examples/demo-app/src/CheckoutService.js centrality=2 pagerank=0.003317
32. examples/demo-app/src/InventoryService.js centrality=2 pagerank=0.003317
33. examples/demo-app/src/NotificationService.js centrality=2 pagerank=0.003317
34. examples/demo-app/src/OrderService.js centrality=2 pagerank=0.003317
35. examples/demo-app/src/PaymentProcessor.js centrality=2 pagerank=0.003317
36. scripts/lib/merkle.mjs centrality=3 pagerank=0.002079
37. bin/modonome.mjs centrality=2 pagerank=0.003081
38. scripts/lib/repo-detect.mjs centrality=2 pagerank=0.002911
39. tests/chaos.test.mjs centrality=3 pagerank=0.001665
40. tests/performance.test.mjs centrality=3 pagerank=0.001665
41. tests/role-registry.test.mjs centrality=3 pagerank=0.001665
42. tests/run-cycle-openai.test.mjs centrality=3 pagerank=0.001665
43. tests/snapshot-incremental.test.mjs centrality=3 pagerank=0.001665
44. tests/snapshot-security.test.mjs centrality=3 pagerank=0.001665
45. tests/ws-b-harness.test.mjs centrality=3 pagerank=0.001665
46. tests/ws-h-config.test.mjs centrality=3 pagerank=0.001665
47. scripts/agent/apply-patch.mjs centrality=2 pagerank=0.002621
48. scripts/lib/lang-adapters/tree-sitter.mjs centrality=2 pagerank=0.00255
49. scripts/agent/action-queue.mjs centrality=2 pagerank=0.00215
50. scripts/lib/packet-id.mjs centrality=2 pagerank=0.002019

