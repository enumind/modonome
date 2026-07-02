// Reads the durable .modonome state directly off disk and reshapes it into the
// PanelState view model, the same shape the bundled fixtures already produce. Nothing
// here invents data: fields the schema does not carry (a work item's display title, a
// gate's live status before it has ever run) are derived from what is durably present,
// never fabricated. Real telemetry only ever comes from metrics.jsonl, never from
// metrics.example.jsonl, so a repo that has never actually run shows honest zeros and
// empty states instead of borrowed demo numbers.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";
import { parseStagedLine } from "./learningsFormat.mjs";

const GATE_STATUS_RANK = { fail: 0, flaky: 1, running: 2, pending: 3, pass: 4 };

export function readModonomeState(modonomeDir, { mode }) {
  const repoRoot = join(modonomeDir, "..");
  const config = readConfig(modonomeDir);
  const items = readWorkItems(modonomeDir);
  const runs = readRuns(modonomeDir);
  const metrics = readMetrics(modonomeDir);

  const queue = items.map(toWorkItemVM);
  const leases = queue
    .filter((i) => i.owner && i.leaseExpiresAt)
    .map((i) => ({
      itemId: i.id,
      owner: i.owner,
      expiresAt: i.leaseExpiresAt,
      stale: new Date(i.leaseExpiresAt).getTime() < Date.now(),
    }));

  return {
    subject: buildSubject({ repoRoot, modonomeDir, mode, config, queue, runs }),
    config,
    arming: { mode: "disabled", envArmed: process.env.MODONOME_ARMED === "true", checklist: [] },
    queue,
    leases,
    gates: buildGates(items),
    cost: buildCost(config, metrics),
    learnings: readLearnings(modonomeDir),
    decisions: readDecisions(modonomeDir),
    audit: buildAudit(runs, metrics),
    protectedPaths: buildProtectedPaths(config, items),
    ...buildTrends(runs),
    agentProofScore: latestAgentProofScore(runs),
  };
}

function readConfig(modonomeDir) {
  const file = join(modonomeDir, "config.yaml");
  const raw = existsSync(file) ? (yaml.load(readFileSync(file, "utf8")) ?? {}) : {};
  return {
    schema_version: raw.schema_version ?? 1,
    autonomy_enabled: Boolean(raw.autonomy_enabled),
    dry_run: raw.dry_run !== false,
    auto_merge: Boolean(raw.auto_merge),
    max_attempts_per_item: raw.max_attempts_per_item ?? 3,
    max_open_prs: raw.max_open_prs ?? 0,
    max_diff_lines: raw.max_diff_lines ?? 0,
    lease_minutes: raw.lease_minutes ?? 60,
    max_merges_per_day: raw.max_merges_per_day ?? 0,
    remote_model_budget_usd_per_day: raw.remote_model_budget_usd_per_day ?? 0,
    local_model_only_by_default: raw.local_model_only_by_default !== false,
    require_branch_protection: Boolean(raw.require_branch_protection),
    require_codeowner_review: Boolean(raw.require_codeowner_review),
    require_distinct_maker_checker: Boolean(raw.require_distinct_maker_checker),
    require_distinct_maker_checker_model: Boolean(raw.require_distinct_maker_checker_model),
    trusted_author_allowlist: raw.trusted_author_allowlist ?? [],
    protected_paths_extra: raw.protected_paths_extra ?? [],
    state_dir: raw.state_dir ?? ".modonome",
    market_scan_enabled: Boolean(raw.market_scan_enabled),
    owner_approval_required_for_new_claims: raw.owner_approval_required_for_new_claims !== false,
    repo_network_enabled: Boolean(raw.repo_network_enabled),
    repo_network_dry_run: raw.repo_network_dry_run !== false,
    share_raw_code_across_repos: Boolean(raw.share_raw_code_across_repos),
    share_repo_identifiers_by_default: Boolean(raw.share_repo_identifiers_by_default),
    roles: raw.roles ?? {},
    models: raw.models ?? {},
    runners: raw.runners ?? {},
  };
}

function readWorkItems(modonomeDir) {
  const dir = join(modonomeDir, "work-items");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.queued_at ?? "").localeCompare(b.queued_at ?? "") || a.id.localeCompare(b.id));
}

function titleFromId(id) {
  const stripped = id.replace(/^WI-\d+-/, "");
  const words = stripped.split(/[-_]+/).filter(Boolean);
  if (!words.length) return id;
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toWorkItemVM(item) {
  return {
    id: item.id,
    title: titleFromId(item.id),
    state: item.state,
    owner: item.owner,
    leaseExpiresAt: item.lease_expires_at,
    branch: item.branch,
    pr: item.pr,
    attempts: item.attempts ?? 0,
    maxAttempts: item.max_attempts ?? 3,
    touchesProtectedPath: Boolean(item.touches_protected_path),
    makerId: item.maker_id,
    makerModel: item.maker_model,
    checkerId: item.checker_id,
    checkerModel: item.checker_model,
    allowedEditSet: item.allowed_edit_set ?? [],
    gates: item.gates ?? [],
    escalationReason: item.escalation_reason,
    queuedAt: item.queued_at,
  };
}

// A gate's status is implied by the state of every work item that declares it, never
// by a fabricated pass. A repo that has only ever run dry-run sweeps shows every
// declared gate as "pending", which is the true state: the gate exists but has not run.
function impliedGateStatus(state) {
  switch (state) {
    case "checking":
      return "running";
    case "rework":
    case "escalated":
      return "fail";
    case "merge_ready":
    case "merging":
    case "done":
      return "pass";
    default:
      return "pending";
  }
}

function buildGates(items) {
  const byGate = new Map();
  for (const item of items) {
    for (const gate of item.gates ?? []) {
      if (!byGate.has(gate)) byGate.set(gate, []);
      byGate.get(gate).push(item);
    }
  }
  const rows = [];
  for (const [name, forItems] of byGate) {
    let worst = "pass";
    const counts = {};
    for (const item of forItems) {
      const status = impliedGateStatus(item.state);
      counts[status] = (counts[status] ?? 0) + 1;
      if (GATE_STATUS_RANK[status] < GATE_STATUS_RANK[worst]) worst = status;
    }
    const parts = Object.entries(counts).map(([status, count]) => `${count} ${status}`);
    rows.push({
      name,
      status: worst,
      required: true,
      detail: `Declared by ${forItems.length} work item(s): ${parts.join(", ")}.`,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function buildProtectedPaths(config, items) {
  return (config.protected_paths_extra ?? []).map((pattern) => {
    const touching = items.find(
      (item) =>
        item.touches_protected_path &&
        item.state !== "done" &&
        (item.allowed_edit_set ?? []).some((p) => p.startsWith(pattern)),
    );
    return {
      path: pattern,
      touchedBy: touching?.id,
      approvalNeeded: Boolean(touching),
      approver: undefined,
    };
  });
}

// modonome's own agent runner does not yet record a dollar cost per call (see
// scripts/agent/run-cycle.mjs), so real spend is honestly zero until that lands. Calls
// are still counted from the real maker_run and checker_review events.
function buildCost(config, metrics) {
  const byModel = new Map();
  for (const assignment of Object.values(config.roles ?? {})) {
    if (!assignment?.model || byModel.has(assignment.model)) continue;
    const def = config.models?.[assignment.model];
    byModel.set(assignment.model, {
      model: assignment.model,
      provider: def?.provider ?? "unknown",
      costClass: def?.provider === "local" ? "local" : "paid",
      calls: 0,
      usd: 0,
    });
  }
  let localCalls = 0;
  let remoteCalls = 0;
  for (const m of metrics) {
    if (m.event !== "maker_run" && m.event !== "checker_review") continue;
    const model = m.maker_model ?? m.checker_model;
    if (!model) continue;
    let row = byModel.get(model);
    if (!row) {
      row = { model, provider: "unknown", costClass: "paid", calls: 0, usd: 0 };
      byModel.set(model, row);
    }
    row.calls += 1;
    if (row.costClass === "local") localCalls += 1;
    else remoteCalls += 1;
  }
  return {
    budgetUsd: config.remote_model_budget_usd_per_day,
    spentUsd: 0,
    localCalls,
    remoteCalls,
    cacheSaves: 0,
    byModel: [...byModel.values()],
  };
}

function readLearnings(modonomeDir) {
  const file = join(modonomeDir, "LEARNINGS.md");
  if (!existsSync(file)) return [];
  const text = readFileSync(file, "utf8");
  const now = Date.now();
  const result = [];

  const staged = extractSection(text, "Staged");
  staged
    .split("\n")
    .filter((l) => l.trim().startsWith("- ["))
    .forEach((line, i) => {
      const parsed = parseStagedLine(line);
      if (!parsed) return;
      result.push({
        id: `staged-${parsed.date}-${i}`,
        status: "staged",
        lesson: parsed.lesson,
        ageDays: Math.max(0, Math.floor((now - new Date(parsed.date).getTime()) / 86400000)),
        evidence: parsed.evidence,
        signal: parsed.signal,
      });
    });

  const promotedMatch = text.match(/## Promoted[\s\S]*?```json\n([\s\S]*?)\n```/);
  if (promotedMatch) {
    try {
      for (const entry of JSON.parse(promotedMatch[1])) {
        const ageDays = entry.promotion_date
          ? Math.max(0, Math.floor((now - new Date(entry.promotion_date).getTime()) / 86400000))
          : 0;
        result.push({
          id: entry.id,
          status: "promoted",
          lesson: entry.lesson,
          ageDays,
          evidence: entry.evidence_summary,
          gateAdded: entry.gate_added,
        });
      }
    } catch {
      // Malformed promoted block. Skip rather than guess at its content.
    }
  }
  return result;
}

function extractSection(text, heading) {
  const m = text.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`));
  return m ? m[1] : "";
}

function readDecisions(modonomeDir) {
  const file = join(modonomeDir, "DECISIONS.md");
  if (!existsSync(file)) return [];
  const text = readFileSync(file, "utf8");
  const result = [];
  for (const [heading, status] of [
    ["Resolved", "resolved"],
    ["Open", "open"],
  ]) {
    const section = extractSection(text, heading);
    if (!section.trim()) continue;
    let entries;
    try {
      entries = yaml.load(section);
    } catch {
      entries = null;
    }
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry || typeof entry !== "object" || !entry.id || !entry.question) continue;
      result.push({
        id: String(entry.id),
        question: String(entry.question),
        recommendation: entry.recommendation ? String(entry.recommendation) : undefined,
        status,
        answer: entry.decision ? String(entry.decision) : undefined,
        defaultHold: status === "open",
      });
    }
  }
  return result;
}

function readRuns(modonomeDir) {
  const dir = join(modonomeDir, "runs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.ts ?? "").localeCompare(b.ts ?? ""));
}

// Real telemetry only. metrics.example.jsonl documents the schema and must never be
// read here: the promoted learning L-001 in this repo's own LEARNINGS.md exists
// specifically because sample telemetry was once shown as if it were measured.
function readMetrics(modonomeDir) {
  const file = join(modonomeDir, "metrics.jsonl");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function describeMetric(m, kind) {
  switch (kind) {
    case "merged":
      return `Merged${m.lines_changed != null ? `, ${m.lines_changed} line(s) changed` : ""}.`;
    case "ratchet_rejected":
      return "The anti-gaming ratchet rejected this attempt.";
    case "gate_passed":
      return "A required gate passed.";
    case "gate_failed":
      return "A required gate failed.";
    case "maker_run":
      return `Maker ran on ${m.maker_model ?? "an unspecified model"}.`;
    case "checker_review":
      return `Checker reviewed on ${m.checker_model ?? "an unspecified model"}.`;
    default:
      return kind;
  }
}

function buildAudit(runs, metrics) {
  const events = [];
  for (const run of runs) {
    if (run.command === "dry-run") {
      events.push({
        ts: run.ts,
        kind: "dry_run",
        detail: `Dry-run swept the repo and proposed ${run.proposals?.length ?? 0} change(s).`,
      });
    } else if (run.command === "report") {
      events.push({
        ts: run.ts,
        kind: "report",
        detail: `Report run: AgentProof ${run.agentproof_score ?? "n/a"}, ${run.summary?.merges ?? 0} merge(s), ${run.summary?.gates_failed ?? 0} gate failure(s).`,
      });
    }
  }
  const KIND_BY_EVENT = {
    gate_passed: "gate_passed",
    gate_failed: "gate_failed",
    ratchet_rejected: "ratchet_rejected",
    merged: "merged",
    maker_run: "maker_run",
    checker_review: "checker_review",
  };
  for (const m of metrics) {
    const kind = KIND_BY_EVENT[m.event];
    if (!kind) continue;
    events.push({
      ts: m.ts,
      kind,
      item: m.item && m.item !== "auto-generated" ? m.item : undefined,
      detail: describeMetric(m, kind),
    });
  }
  events.sort((a, b) => (b.ts ?? "").localeCompare(a.ts ?? ""));
  return events;
}

function buildTrends(runs) {
  const reportRuns = runs.filter((r) => r.command === "report" && r.agentproof_score);
  const label = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    qualityTrend: reportRuns.map((r) => ({
      label: label(r.ts),
      value: Number(String(r.agentproof_score).split("/")[0]) || 0,
    })),
    costTrend: reportRuns.map((r) => ({ label: label(r.ts), value: 0 })),
  };
}

function latestAgentProofScore(runs) {
  const reportRuns = runs.filter((r) => r.command === "report" && r.agentproof_score);
  if (!reportRuns.length) return 0;
  return Number(String(reportRuns[reportRuns.length - 1].agentproof_score).split("/")[0]) || 0;
}

function gitInfo(repoRoot) {
  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    const m = /[:/]([^/]+\/[^/]+?)(\.git)?$/.exec(remote);
    return { branch, repo: m ? m[1] : basename(repoRoot) };
  } catch {
    return { branch: "unknown", repo: basename(repoRoot) };
  }
}

function buildSubject({ repoRoot, modonomeDir, mode, config, queue, runs }) {
  const { branch, repo } = gitInfo(repoRoot);
  const escalated = queue.filter((i) => i.state === "escalated");
  const active = queue.filter((i) => i.state !== "done");
  const lastRun = runs[runs.length - 1];
  return {
    mode,
    repo,
    branch,
    description:
      mode === "product"
        ? "Modonome governing its own repository under the controls it ships."
        : `Modonome installed in ${repo}. ${active.length} active work item(s), read live from ${modonomeDir}.`,
    lastSweep: lastRun?.ts ?? "never",
    requiredOwnerAction:
      escalated.length > 0
        ? `${escalated.length} escalated item(s) await owner review: ${escalated.map((i) => i.id).join(", ")}.`
        : undefined,
    dir: modonomeDir,
  };
}
