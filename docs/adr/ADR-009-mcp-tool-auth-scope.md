# ADR-009: MCP Tool Authentication and Scope

**Status:** Accepted
**Date:** 2026-06-24

## Context

Harnesses that run modonome via an MCP server (such as the bundled `scripts/mcp-server.mjs`)
expose file-read and diff-path tools to the agent. Without authentication and scope
controls, a compromised agent turn could read arbitrary files or traverse to paths outside
the host repo.

## Decision

The MCP server and any tool-calling surface used by modonome must satisfy:

1. **Path containment.** All file-read and file-write tools validate that the resolved path
   is within the repo root before executing. The existing `diff_path` fix (extension
   allowlist plus `realpath` check) is the reference implementation.
2. **Session-scoped auth.** MCP authentication is scoped to the session that starts the
   harness. The agent cannot acquire credentials beyond what the session has. Specifically,
   it cannot escalate from a read-only token to a write token mid-session.
3. **Tool allowlist.** The harness declares which MCP tools are available. The agent cannot
   invoke tools outside that list. If a new tool is needed, it is added to the harness
   configuration, which is a Tier 2 file requiring owner approval.
4. **No credential forwarding.** The agent prompt and context must not contain API keys,
   PATs, or secrets. Secrets are injected by the harness environment (env vars) and are
   not readable by the agent.
5. **Audit log.** Every MCP tool call is logged with timestamp, tool name, and path or
   parameters. Logs are written outside the repo (harness-managed) and are not writable
   by the agent.

## Consequences

- The existing path traversal fix in `mcp-server.mjs` satisfies rule 1; no further change
  is needed there.
- Harnesses that add new MCP tools must update the tool allowlist in their configuration,
  which triggers CODEOWNERS review.
- This ADR does not specify a particular MCP server implementation; it sets requirements
  any implementation must meet.
