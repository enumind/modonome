/**
 * View-model types for the control panel. These are a normalized, render-friendly
 * projection of the durable modonome state (schemas/config.schema.json,
 * work-item.schema.json, metrics.schema.json, and the .modonome markdown queues).
 * The panel never invents fields the engine does not durably record; it only reshapes
 * them for display. The same shapes back both host mode and product mode, so a single
 * set of screens serves either subject.
 */

export type PanelMode = "host" | "product";
export type ArmingMode = "disabled" | "dry-run" | "armed";
export type WorkState =
  | "queued"
  | "claimed"
  | "making"
  | "checking"
  | "rework"
  | "merge_ready"
  | "merging"
  | "done"
  | "escalated";
export type RiskTier = 1 | 2 | 3 | 4;

/** The subject a mode points at: which repo the panel is reading. */
export interface Subject {
  mode: PanelMode;
  repo: string;
  branch: string;
  description: string;
  lastSweep: string;
  requiredOwnerAction?: string;
  /** Absolute path to the .modonome directory this state was read from, when live. */
  dir?: string;
}

/** The engine configuration (schemas/config.schema.json), the levers the panel edits. */
export interface ModonomeConfig {
  schema_version: number;
  autonomy_enabled: boolean;
  dry_run: boolean;
  auto_merge: boolean;
  max_attempts_per_item: number;
  max_open_prs: number;
  max_diff_lines: number;
  lease_minutes: number;
  max_merges_per_day: number;
  remote_model_budget_usd_per_day: number;
  local_model_only_by_default: boolean;
  require_branch_protection: boolean;
  require_codeowner_review: boolean;
  require_distinct_maker_checker: boolean;
  require_distinct_maker_checker_model: boolean;
  trusted_author_allowlist: string[];
  protected_paths_extra: string[];
  state_dir: string;
  market_scan_enabled: boolean;
  owner_approval_required_for_new_claims: boolean;
  repo_network_enabled: boolean;
  repo_network_dry_run: boolean;
  share_raw_code_across_repos: boolean;
  share_repo_identifiers_by_default: boolean;
  remediation_apply_enabled: boolean;
  roles: Record<
    string,
    { runner: string; model: string; provider?: string; transport?: string; trigger?: string; execution_target?: string }
  >;
  models: Record<string, { provider: string; base_url?: string }>;
  runners: Record<string, { labels: string[]; cli_path: string; environment?: string }>;
}

/** One prerequisite in the armed-mode gate checklist. */
export interface ArmingCheck {
  label: string;
  ok: boolean;
  reason: string;
  /** True when only the owner can satisfy this out of band (for example the CI secret). */
  ownerOnly?: boolean;
}

export interface ArmingStatus {
  mode: ArmingMode;
  /** Whether the MODONOME_ARMED CI secret is set. Config alone cannot arm the engine. */
  envArmed: boolean;
  checklist: ArmingCheck[];
}

export interface WorkItemVM {
  id: string;
  title: string;
  state: WorkState;
  tier?: RiskTier;
  owner?: string;
  leaseExpiresAt?: string;
  branch?: string;
  pr?: string;
  attempts: number;
  maxAttempts: number;
  touchesProtectedPath: boolean;
  makerId?: string;
  makerModel?: string;
  checkerId?: string;
  checkerModel?: string;
  allowedEditSet: string[];
  gates: string[];
  escalationReason?: string;
  queuedAt?: string;
}

export interface LeaseVM {
  itemId: string;
  owner: string;
  expiresAt: string;
  stale: boolean;
}

export type GateStatus = "pass" | "fail" | "flaky" | "running" | "pending";

export interface GateVM {
  name: string;
  status: GateStatus;
  durationMs?: number;
  lastRun?: string;
  required: boolean;
  detail?: string;
}

export interface CostByModel {
  model: string;
  provider: string;
  costClass: "paid" | "free" | "local";
  calls: number;
  usd: number;
}

export interface CostVM {
  budgetUsd: number;
  spentUsd: number;
  localCalls: number;
  remoteCalls: number;
  cacheSaves: number;
  byModel: CostByModel[];
}

export interface LearningVM {
  id: string;
  status: "staged" | "promoted";
  lesson: string;
  ageDays: number;
  evidence?: string;
  signal?: string;
  gateAdded?: string;
}

export interface DecisionVM {
  id: string;
  question: string;
  recommendation?: string;
  status: "open" | "resolved";
  answer?: string;
  defaultHold: boolean;
}

/** One commit the metadata-only remediator would rewrite, and why. */
export interface RemediationProposalVM {
  sha: string;
  reasons: string[];
}

/**
 * The armed metadata-only remediator (ADR-035) as a read-only surface plus one owner
 * lever. `applyEnabled` mirrors the config flag; `ready` is true only when every arming
 * condition is met, and `blockers` names the ones that are not. `proposals` is what
 * `remediate plan` would rewrite on the current branch (empty when history is clean).
 */
export interface RemediationVM {
  applyEnabled: boolean;
  ready: boolean;
  blockers: string[];
  proposalCount: number;
  proposals: RemediationProposalVM[];
  fingerprint?: string;
}

export type AuditKind =
  | "dry_run"
  | "report"
  | "maker_run"
  | "checker_review"
  | "pr_opened"
  | "gate_passed"
  | "gate_failed"
  | "ratchet_rejected"
  | "merged"
  | "escalated"
  | "learning_promoted"
  | "config_changed"
  | "mode_changed";

export interface AuditEventVM {
  ts: string;
  kind: AuditKind;
  item?: string;
  detail: string;
}

export interface ProtectedPathVM {
  path: string;
  touchedBy?: string;
  approvalNeeded: boolean;
  approver?: string;
}

export interface TrendPoint {
  label: string;
  value: number;
}

/** Where a loaded PanelState actually came from, so the UI never presents demo data as real. */
export interface PanelSource {
  /** "live" reads the real .modonome directory named in subject.dir. "demo" is bundled fixture data. */
  kind: "live" | "demo";
  /** True when the server-side dev API accepted write requests for this session. */
  writable: boolean;
  /** Set when a live read was attempted and failed, explaining the fall back to demo data. */
  error?: string;
}

export interface PanelState {
  source: PanelSource;
  subject: Subject;
  config: ModonomeConfig;
  arming: ArmingStatus;
  queue: WorkItemVM[];
  leases: LeaseVM[];
  gates: GateVM[];
  cost: CostVM;
  learnings: LearningVM[];
  decisions: DecisionVM[];
  audit: AuditEventVM[];
  protectedPaths: ProtectedPathVM[];
  costTrend: TrendPoint[];
  qualityTrend: TrendPoint[];
  agentProofScore: number;
  /** Optional so a state assembled without it (older fixture, partial read) still types. */
  remediation?: RemediationVM;
}

/**
 * The write side of the panel, threaded down from App to the screens that mutate real
 * state. Every call here hits a real file on disk when `writable` is true; screens must
 * still confirm before calling one of these, exactly as they do today for the
 * fixture-only local notices. `writable` is false whenever the panel is showing demo
 * data or the dev server was started without MODONOME_PANEL_WRITE=1.
 */
export interface WriteActions {
  writable: boolean;
  onSaveConfig: (patch: Partial<ModonomeConfig>) => Promise<void>;
  onReleaseLease: (itemId: string) => Promise<void>;
  onPruneLearning: (lesson: string) => Promise<void>;
}
