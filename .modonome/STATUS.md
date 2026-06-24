# Modonome status

Last updated: 2026-06-24

## Resume here

- Current mode: disabled (dry-run, autonomy off)
- Current branch: (none active)
- Latest gates: node --test tests/*.test.mjs (19/19), node agentproof/runner.mjs (16/16 GOVERNED)
- Active item: (none)
- Next safe action: pick the first queued item from .modonome/work-items/

## Done

- Fixed SyntaxError in scripts/dry-run-sweep.mjs:26 (C# gate string)
- Fixed CI workflow: removed npm audit step (zero-dep package, no lockfile)
- Fixed GOVERNED-AUTONOMY-SPEC.md: MCP server marked as shipped in v0.1
- Fixed CHANGELOG.md: corrected MCP tool names and roadmap
- Fixed bin/modonome.mjs:44 validate off-by-one (file path was dropped when --type absent)
- Fixed bin/modonome.mjs:55 agentproof exit code (was always 0)
- Fixed scripts/validate-knowledge-packet.mjs:28 redaction bypass logic inversion
- Fixed scripts/mcp-server.mjs: diff_path path traversal (extension allowlist + file check)
- Fixed scripts/lib/yaml-lite.mjs: comment stripping broken for quoted values
- Fixed SECURITY.md: removed false MCP adversarial scenarios claim
- Filed 5 ADRs in docs/adr/ covering: self-governance, shadow mode, AgentProof portability,
  arming isolation enforcement, run observability
- .github/CODEOWNERS already exists with `*` catch-all (@nateshpp on all files) plus explicit entries for prompts/, schemas/, scripts/, templates/, .github/. WI-011 closed as already done.
- Added AGENTS.md: no AI attribution in commits, governed autonomy operating spec (AI-agnostic)
- Owner resolved 3 decisions: shadow-mode=v0.2, agentproof-conformance=community standard, dry-run-git-integration=pending
- Added .github/workflows/modonome-auto.yml: GitHub Actions autonomous run harness (weekdays 2am UTC + manual trigger)
- Filed 4 friction-reduction work items: WI-016 through WI-019

## In progress

(none)

## Queued (in priority order)

| ID | Description | Tier | Protected path |
|----|-------------|------|---------------|
| WI-001 | Add CLI-level tests for dry-run and validate dispatch | 1 | No |
| WI-002 | Fix walkthrough and transcript accuracy claims | 1 | No |
| WI-003 | Remove shadow mode references from docs (ADR-002) | 1 | No |
| WI-004 | Fix AgentProof runner consistency (comment, threshold, taxonomy) | 2 | Yes |
| WI-005 | Enforce arming isolation at runtime (ADR-004) | 2 | Yes |
| WI-006 | Fix metrics event/type field name mismatch | 2 | Yes |
| WI-007 | Add run log observability (ADR-005) | 2 | Yes |
| WI-008 | Implement lease-expiry tick script | 2 | Yes |
| WI-009 | Add ratchet vacuous-matcher detection | 2 | Yes |
| WI-010 | Add Python bare-assert detection to ratchet | 2 | Yes |
| WI-011 | ~~Add .github/CODEOWNERS file~~ | done | Already existed |
| WI-012 | Create agentproof/CONFORMANCE-INTERFACE.md (community standard) | 1 | No |
| WI-013 | Reconcile Ed25519 version target across three docs | 1 | No |
| WI-014 | Fix CHANGELOG.md AgentProof scenario count | 1 | No |
| WI-015 | Improve dry-run specificity (shallow repo analysis) | 2 | Yes |
| WI-016 | Add arming checklist to QUICKSTART.md | 1 | No |
| WI-017 | Scaffold command includes CI workflow template | 2 | Yes |
| WI-018 | Document cost model (API tokens per run) | 1 | No |
| WI-019 | Document VS Code manual trigger workflow | 1 | No |

## Blocked

(none)
