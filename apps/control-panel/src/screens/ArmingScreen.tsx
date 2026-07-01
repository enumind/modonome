import { useState } from "react";
import {
  ActivationLadder,
  ArmingStateBadge,
  Card,
  NumberField,
  Toggle,
  Slider,
  Toast,
} from "@modonome/design-system";
import type { PanelState } from "../state/types";
import { useConfirm } from "../lib/confirm";

/**
 * The control screen. The activation ladder shows the path from disabled to armed with
 * the full prerequisite checklist, and the editors below tune the caps, budget, and
 * governance requirements. Every arming action confirms first, and arming the engine
 * from the panel is deliberately gated behind the CI secret, which the panel can only
 * report on.
 */
export function ArmingScreen({ state }: { state: PanelState }) {
  const confirm = useConfirm();
  const [config, setConfig] = useState(state.config);
  const [notice, setNotice] = useState<string | null>(null);

  function set<K extends keyof typeof config>(key: K, value: (typeof config)[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  async function onArm() {
    const ok = await confirm({
      title: "Arm the engine?",
      tone: "danger",
      confirmLabel: "Arm engine",
      body: "Armed mode lets modonome open and merge changes once every gate passes. The MODONOME_ARMED CI secret must also be set. You can return to dry-run at any time.",
    });
    if (ok) setNotice("Arming acknowledged. Set MODONOME_ARMED in CI to complete arming.");
  }

  async function onDisarm() {
    const ok = await confirm({
      title: "Return to dry-run?",
      tone: "danger",
      confirmLabel: "Return to dry-run",
      body: "The engine will keep proposing changes but stop merging. In-flight work is unaffected.",
    });
    if (ok) setNotice("The engine has been returned to dry-run.");
  }

  async function onDryRun() {
    const ok = await confirm({
      title: "Run a dry-run sweep?",
      confirmLabel: "Run sweep",
      body: "A dry-run reads the repo and prints the proposed work. It changes nothing.",
    });
    if (ok) setNotice("Dry-run sweep queued.");
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Arming &amp; Safety</h1>
          <p className="page-sub">
            Move the engine along the activation ladder and tune the caps, budget, and governance
            requirements that bound what it can do.
          </p>
        </div>
        <ArmingStateBadge mode={state.arming.mode} envArmed={state.arming.envArmed} size="lg" />
      </div>

      {notice ? (
        <Toast tone="info" title="Acknowledged" message={notice} onDismiss={() => setNotice(null)} />
      ) : null}

      <Card title="Activation ladder" help="Arming is only allowed when every prerequisite holds. Owner-only items are set in CI, not here.">
        <ActivationLadder
          mode={state.arming.mode}
          checklist={state.arming.checklist}
          onDryRun={onDryRun}
          onArm={onArm}
          onDisarm={onDisarm}
        />
      </Card>

      <div className="grid grid-2">
        <Card title="Caps" help="Hard limits that bound each run. Larger diffs and extra concurrency raise risk.">
          <div className="stack-lg">
            <NumberField
              label="Max open pull requests"
              hint="The most concurrent pull requests the engine may keep open."
              value={config.max_open_prs}
              onValueChange={(v) => set("max_open_prs", v)}
              min={0}
              max={50}
            />
            <NumberField
              label="Max diff lines"
              hint="Changes larger than this are rejected as out of scope."
              value={config.max_diff_lines}
              onValueChange={(v) => set("max_diff_lines", v)}
              min={1}
              step={50}
            />
            <NumberField
              label="Max merges per day"
              hint="A daily merge cap. Zero disables autonomous merges entirely."
              value={config.max_merges_per_day}
              onValueChange={(v) => set("max_merges_per_day", v)}
              min={0}
            />
            <NumberField
              label="Lease minutes"
              hint="How long a claim is held before an expired lease requeues the item."
              value={config.lease_minutes}
              onValueChange={(v) => set("lease_minutes", v)}
              min={1}
            />
            <NumberField
              label="Max attempts per item"
              hint="Retries before an item escalates to owner review."
              value={config.max_attempts_per_item}
              onValueChange={(v) => set("max_attempts_per_item", v)}
              min={1}
              max={10}
            />
          </div>
        </Card>

        <div className="stack-lg">
          <Card title="Cost" help="Remote model spend is capped per day. Local-only keeps spend at zero.">
            <div className="stack-lg">
              <Slider
                label="Remote model budget"
                hint="The daily ceiling on hosted model spend. Zero means local only."
                unit="USD/day"
                value={config.remote_model_budget_usd_per_day}
                onValueChange={(v) => set("remote_model_budget_usd_per_day", v)}
                min={0}
                max={100}
                step={5}
              />
              <Toggle
                label="Prefer local models by default"
                hint="Route work to local models first and fall back to hosted models only when needed."
                checked={config.local_model_only_by_default}
                onCheckedChange={(v) => set("local_model_only_by_default", v)}
              />
            </div>
          </Card>

          <Card title="Mode" help="The three levers that, with the CI secret, decide the arming mode.">
            <div className="stack-lg">
              <Toggle
                label="Autonomy enabled"
                hint="Owner opt-in. Required but not sufficient to arm."
                checked={config.autonomy_enabled}
                onCheckedChange={(v) => set("autonomy_enabled", v)}
              />
              <Toggle
                label="Dry-run"
                tone="info"
                hint="When on, the engine proposes but never writes. The safe default."
                checked={config.dry_run}
                onCheckedChange={(v) => set("dry_run", v)}
              />
              <Toggle
                label="Auto-merge"
                tone="owner"
                hint="When on, eligible changes may merge after gates pass. Only meaningful when armed."
                checked={config.auto_merge}
                onCheckedChange={(v) => set("auto_merge", v)}
              />
            </div>
          </Card>
        </div>
      </div>

      <Card title="Governance requirements" help="Separation-of-duties and protection rules enforced before any merge.">
        <div className="grid grid-2">
          <Toggle
            label="Require branch protection"
            hint="Fail if the target branch lacks protection."
            checked={config.require_branch_protection}
            onCheckedChange={(v) => set("require_branch_protection", v)}
          />
          <Toggle
            label="Require code owner review"
            hint="Fail if a change touches a code-owned path without review."
            checked={config.require_codeowner_review}
            onCheckedChange={(v) => set("require_codeowner_review", v)}
          />
          <Toggle
            label="Distinct maker and checker"
            hint="The maker and checker must be different identities."
            checked={config.require_distinct_maker_checker}
            onCheckedChange={(v) => set("require_distinct_maker_checker", v)}
          />
          <Toggle
            label="Distinct maker and checker model"
            hint="The maker and checker must run different model families."
            checked={config.require_distinct_maker_checker_model}
            onCheckedChange={(v) => set("require_distinct_maker_checker_model", v)}
          />
        </div>
      </Card>
    </div>
  );
}
