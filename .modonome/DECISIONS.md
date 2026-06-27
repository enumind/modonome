# Modonome decisions

Every decision defaults to hold when unanswered.

## Resolved

- id: self-maintenance-scope
  question: Which surfaces should Modonome maintain on its own repo autonomously?
  decision: Tier 1 (docs, examples, tests, fixtures) autonomous. Tier 2 (scripts, schemas,
    prompts, templates, .github) owner-reviewed. See docs/adr/ADR-001.
  resolved: 2026-06-24

- id: shadow-mode-implementation-timing
  question: Implement shadow mode in v0.2 or keep as a later milestone?
  decision: v0.2. Implement --shadow flag on dry-run-sweep as a queued work item.
  resolved: 2026-06-24

- id: agentproof-conformance-interface
  question: Publish a standalone conformance interface spec for third-party runners?
  decision: Yes. Publish agentproof/CONFORMANCE-INTERFACE.md as a community-evolving
    standard with an open stdio runner protocol. See ADR-003 and WI-012.
  resolved: 2026-06-24

- id: phase-a-checker-model
  question: Use claude CLI (subscription) or a local model as the Phase A checker?
  decision: Local Mistral 7B via gateway. Claude CLI had persistent ECONNRESET errors
    in the Mac mini environment; Mistral 7B is zero-cost, zero-metered, and passes
    require_distinct_maker_checker_model (different family from Qwen maker). The claude
    CLI remains the preferred checker for production once network issues are resolved.
  resolved: 2026-06-27

- id: phase-a-gateway-streaming
  question: Should the fleet gateway support streaming responses?
  decision: Disabled for now. Streaming errors inside an async generator cannot be
    caught by FastAPI after StreamingResponse is returned, causing silent 502s. All
    responses are buffered (stream=False forced at the proxy). Streaming can be
    re-enabled in Phase B once the error-handling path is hardened.
  resolved: 2026-06-27

- id: dynamic-model-selection-with-fallback
  question: How should modonome handle local model unavailability (e.g., LM Studio down)?
  decision: Implement probe-then-route in resolve-role.mjs. At role resolution time,
    probe the local gateway with a 5s timeout. If reachable and models present, use
    primary (local) config. If unreachable and fallback_model defined in roles, use
    fallback (hosted Claude). If unreachable and no fallback, fail fast with clear
    error. Fallback requires remote_model_budget_usd_per_day > 0. Config now expresses
    fallback intent via fallback_model fields in roles. See WI-021 for implementation.
  resolved: 2026-06-27

## Open

- id: dry-run-git-integration
  question: Should dry-run read git history for repo-specific proposals (WI-015)?
  options:
    - shallow-git: Run 'git log --oneline -20' and find most-changed files with no test neighbors.
    - static-only: Keep static proposals; improve specificity through better stack heuristics only.
  recommendation: shallow-git. This is the "Vagrant moment" for the tool; generic proposals
    do not differentiate modonome from a documentation page.
  default_on_timeout: hold
