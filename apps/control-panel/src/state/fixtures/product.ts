/**
 * Product mode: modonome governing its own repository (self-application). The values
 * mirror the real state committed under .modonome/ in this repo. Safe defaults, dry-run,
 * autonomy off. The engine holds itself to the same controls it asks a host repo to adopt.
 */
import type { PanelState, ModonomeConfig, WorkItemVM } from "../types";

const config: ModonomeConfig = {
  schema_version: 1,
  autonomy_enabled: false,
  dry_run: true,
  auto_merge: false,
  max_attempts_per_item: 3,
  max_open_prs: 3,
  max_diff_lines: 400,
  lease_minutes: 60,
  max_merges_per_day: 0,
  remote_model_budget_usd_per_day: 0,
  local_model_only_by_default: true,
  require_branch_protection: true,
  require_codeowner_review: true,
  require_distinct_maker_checker: true,
  require_distinct_maker_checker_model: true,
  trusted_author_allowlist: [],
  protected_paths_extra: ["bin/", "prompts/", "schemas/", "scripts/", "templates/", ".github/", "site/"],
  state_dir: ".modonome",
  market_scan_enabled: false,
  owner_approval_required_for_new_claims: true,
  repo_network_enabled: false,
  repo_network_dry_run: true,
  share_raw_code_across_repos: false,
  share_repo_identifiers_by_default: false,
  remediation_apply_enabled: false,
  roles: {
    maker: { runner: "container", model: "claude-sonnet-4-6" },
    checker: { runner: "container", model: "claude-opus-4-8" },
    "self-govern": { runner: "container", model: "claude-haiku-4-5-20251001" },
  },
  models: {
    "claude-sonnet-4-6": { provider: "anthropic" },
    "claude-opus-4-8": { provider: "anthropic" },
    "claude-haiku-4-5-20251001": { provider: "anthropic" },
    "local-default": { provider: "local", base_url: "http://mac-mini.local:11434" },
  },
  runners: {
    local: { labels: ["self-hosted", "mac-mini"], cli_path: "claude" },
    container: { labels: ["ubuntu-latest"], cli_path: "claude" },
  },
  providers: {
    "github-models": { costClass: "free" },
  },
};

function titleFromId(id: string): string {
  const body = id.replace(/^WI-\d+-/, "").replace(/-/g, " ");
  return body.charAt(0).toUpperCase() + body.slice(1);
}

const rawItems: Array<[string, WorkItemVM["state"], Partial<WorkItemVM>]> = [
  ["WI-020-improve-validate-work-item-error-messages", "queued", { tier: 1 }],
  ["WI-021-root-cleanup", "claimed", { tier: 2, owner: "self-govern", leaseExpiresAt: "2026-07-01T10:20:00Z" }],
  ["WI-022-fix-gate-orphaned-framework", "claimed", { tier: 2, owner: "self-govern", leaseExpiresAt: "2026-07-01T10:35:00Z" }],
  ["WI-026-provider-registry-cost-class", "queued", { tier: 2 }],
  ["WI-027-license-adapter-boundary-gate", "queued", { tier: 3, touchesProtectedPath: true }],
  ["WI-034-real-checker-telemetry", "queued", { tier: 3 }],
  ["WI-035-report-impact-measurement", "queued", { tier: 3, touchesProtectedPath: true }],
  ["WI-037-deterministic-priority-scoring", "queued", { tier: 2 }],
  ["WI-039-prompt-behavioral-regression", "queued", { tier: 3, touchesProtectedPath: true }],
  ["WI-040-generic-role-registry", "queued", { tier: 2 }],
  ["WI-005-enforce-arming-isolation-at-runtime", "done", { tier: 3 }],
  ["WI-009-add-ratchet-vacuous-matcher-detection", "done", { tier: 2 }],
  ["WI-013-reconcile-ed25519-version-target", "done", { tier: 1 }],
  ["WI-018-document-cost-model", "done", { tier: 1 }],
];

const queue: WorkItemVM[] = rawItems.map(([id, state, extra]) => ({
  id,
  title: titleFromId(id),
  state,
  attempts: 0,
  maxAttempts: 3,
  touchesProtectedPath: false,
  allowedEditSet: ["scripts/", "tests/"],
  gates: ["node --test tests/*.test.mjs", "npm run verify"],
  queuedAt: "2026-07-01",
  ...extra,
}));

export const productState: PanelState = {
  source: { kind: "demo", writable: false },
  subject: {
    mode: "product",
    repo: "enumind/modonome",
    branch: "main",
    description: "Modonome governing its own repository under the controls it ships.",
    lastSweep: "2026-07-01T09:40:00Z",
    requiredOwnerAction: "Review 2 queued Tier 3 items that touch protected paths.",
  },
  config,
  arming: { mode: "dry-run", envArmed: false, checklist: [] },
  queue,
  leases: [
    { itemId: "WI-021-root-cleanup", owner: "self-govern", expiresAt: "2026-07-01T10:20:00Z", stale: false },
    { itemId: "WI-022-fix-gate-orphaned-framework", owner: "self-govern", expiresAt: "2026-07-01T10:35:00Z", stale: false },
  ],
  gates: [
    { name: "drift guard", status: "pass", durationMs: 1200, required: true, lastRun: "2026-07-01T09:40:00Z" },
    { name: "style check", status: "pass", durationMs: 900, required: true, lastRun: "2026-07-01T09:40:00Z" },
    { name: "repo hygiene", status: "pass", durationMs: 1500, required: true, lastRun: "2026-07-01T09:40:00Z" },
    { name: "self-application", status: "pass", durationMs: 2100, required: true, lastRun: "2026-07-01T09:40:00Z" },
    { name: "learning traceability", status: "pass", durationMs: 800, required: true, lastRun: "2026-07-01T09:40:00Z" },
    { name: "work item validation", status: "pass", durationMs: 700, required: true, lastRun: "2026-07-01T09:40:00Z" },
    { name: "checker engagement", status: "pass", durationMs: 650, required: true, lastRun: "2026-07-01T09:40:00Z" },
    { name: "anti-gaming ratchet", status: "pass", durationMs: 3400, required: true, lastRun: "2026-07-01T09:40:00Z" },
    { name: "AgentProof", status: "pass", durationMs: 8800, required: true, detail: "25 of 25 scenarios", lastRun: "2026-07-01T09:40:00Z" },
    { name: "tests", status: "pass", durationMs: 5200, required: true, lastRun: "2026-07-01T09:40:00Z" },
  ],
  cost: {
    budgetUsd: 0,
    spentUsd: 0,
    localCalls: 0,
    remoteCalls: 0,
    cacheSaves: 0,
    byModel: [
      { model: "claude-sonnet-4-6", provider: "anthropic", costClass: "paid", calls: 0, usd: 0 },
      { model: "claude-opus-4-8", provider: "anthropic", costClass: "paid", calls: 0, usd: 0 },
      { model: "claude-haiku-4-5", provider: "anthropic", costClass: "paid", calls: 0, usd: 0 },
    ],
  },
  learnings: [
    {
      id: "L-001",
      status: "promoted",
      lesson: "Gate scripts must load the ratchet from the base branch so a PR cannot weaken the gate that judges it.",
      ageDays: 21,
      signal: "gate",
      gateAdded: "check-self-application.mjs",
    },
    {
      id: "L-002",
      status: "promoted",
      lesson: "Every promoted learning links to its correction signal and the deterministic gate it produced.",
      ageDays: 14,
      signal: "review",
      gateAdded: "check-learning-traceability.mjs",
    },
    {
      id: "L-staged-3",
      status: "staged",
      lesson: "Branch names and commit identities must never carry a model-identifier prefix.",
      ageDays: 3,
      evidence: "scripts/lib/branch-name.mjs, scripts/lib/commit-identity.mjs",
      signal: "review",
    },
  ],
  decisions: [
    {
      id: "dry-run-git-integration",
      question: "Should the dry-run sweep use shallow git history or stay static-only?",
      recommendation: "Adopt shallow-git for richer proposals.",
      status: "open",
      defaultHold: true,
    },
  ],
  audit: [
    { ts: "2026-07-01T09:40:00Z", kind: "dry_run", detail: "Dry-run sweep completed. No writes." },
    { ts: "2026-06-28T12:10:00Z", kind: "learning_promoted", item: "L-002", detail: "Learning promoted with gate check-learning-traceability.mjs." },
    { ts: "2026-06-25T16:02:00Z", kind: "gate_passed", detail: "AgentProof 25 of 25 on release evidence." },
    { ts: "2026-06-20T11:20:00Z", kind: "config_changed", detail: "Roles pinned to distinct model families." },
  ],
  protectedPaths: [
    { path: "schemas/", approvalNeeded: true, touchedBy: "WI-035", approver: undefined },
    { path: "scripts/", approvalNeeded: true, touchedBy: "WI-039", approver: undefined },
    { path: "prompts/", approvalNeeded: false },
    { path: "bin/", approvalNeeded: false },
  ],
  costTrend: [
    { label: "Mon", value: 0 },
    { label: "Tue", value: 0 },
    { label: "Wed", value: 0 },
    { label: "Thu", value: 0 },
    { label: "Fri", value: 0 },
  ],
  qualityTrend: [
    { label: "Mon", value: 25 },
    { label: "Tue", value: 25 },
    { label: "Wed", value: 25 },
    { label: "Thu", value: 25 },
    { label: "Fri", value: 25 },
  ],
  agentProofScore: 25,
  remediation: {
    applyEnabled: false,
    ready: false,
    blockers: [
      "autonomy_enabled is off",
      "dry_run is on",
      "remediation_apply_enabled is off",
      "MODONOME_ARMED is not set in the environment",
    ],
    proposalCount: 0,
    proposals: [],
  },
};
