import { useMemo, useState } from "react";
import {
  ActivationLadder,
  ArmingStateBadge,
  Button,
  Card,
  NumberField,
  Tabs,
  Toggle,
  Slider,
  Toast,
} from "@modonome/design-system";
import type { MessageSeverity, ModonomeConfig, PanelState, WriteActions } from "../state/types";
import { useConfirm } from "../lib/confirm";
import { diffConfig } from "../state/configDiff";
import { formatMessage } from "../lib/messages";

const TABS = [
  { id: "activation", label: "Activation", icon: "shield" as const },
  { id: "caps", label: "Caps & budget", icon: "cost" as const },
  { id: "governance", label: "Governance rules", icon: "check-circle" as const },
];

type ModeFields = Pick<ModonomeConfig, "autonomy_enabled" | "dry_run" | "auto_merge">;

/**
 * The control screen. Three tabs keep one conceptual area on screen at a time: the
 * activation ladder (the primary daily view), caps and budget, and the separation-of-
 * duties governance rules. The ladder's Arm, Disarm, and kill switch are self-contained:
 * each sets and saves exactly the three mode fields, independent of whatever caps or
 * governance edits are mid-draft elsewhere on this screen, so a mode change never
 * silently carries an unrelated pending edit along with it. Save configuration is the
 * one mechanism for everything else, and stays visible across all three tabs since it
 * saves the whole pending draft regardless of which tab made the change.
 */
export function ArmingScreen({ state, write }: { state: PanelState; write: WriteActions }) {
  const confirm = useConfirm();
  const [tab, setTab] = useState("activation");
  const [config, setConfig] = useState(state.config);
  const [notice, setNotice] = useState<{ tone: MessageSeverity; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof config>(key: K, value: (typeof config)[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  const patch = useMemo(() => diffConfig(state.config, config), [state.config, config]);
  const dirty = Object.keys(patch).length > 0;

  async function onSave() {
    const ok = await confirm({
      title: "Save configuration changes?",
      confirmLabel: "Save changes",
      body: `Writes ${Object.keys(patch).length} changed value(s) to config.yaml in ${state.subject.dir ?? "the repo"}.`,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await write.onSaveConfig(patch);
      const resolved = formatMessage(state.messages, "panel.arming.config-saved");
      setNotice({ tone: resolved.severity, text: resolved.message });
    } catch (err) {
      const resolved = formatMessage(state.messages, "panel.arming.config-save-failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      setNotice({ tone: resolved.severity, text: resolved.message });
    } finally {
      setSaving(false);
    }
  }

  function onDiscard() {
    setConfig(state.config);
  }

  async function applyModeChange(
    fields: ModeFields,
    confirmOpts: { title: string; body: string; confirmLabel: string },
  ) {
    const ok = await confirm({ ...confirmOpts, tone: "danger" });
    if (!ok) return;
    setConfig((c) => ({ ...c, ...fields }));
    if (!write.writable) {
      const resolved = formatMessage(state.messages, "panel.arming.mode-ack-local");
      setNotice({ tone: resolved.severity, text: resolved.message });
      return;
    }
    try {
      await write.onSaveConfig(fields);
      const resolved = formatMessage(state.messages, "panel.arming.mode-updated");
      setNotice({ tone: resolved.severity, text: resolved.message });
    } catch (err) {
      const resolved = formatMessage(state.messages, "panel.arming.mode-save-failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      setNotice({ tone: resolved.severity, text: resolved.message });
    }
  }

  const onArm = () =>
    applyModeChange(
      { autonomy_enabled: true, dry_run: false, auto_merge: true },
      {
        title: "Arm the engine?",
        confirmLabel: "Arm engine",
        body: "Armed mode lets modonome open and merge changes once every gate passes. The MODONOME_ARMED CI secret must also be set separately; this only sets the config side of arming. You can return to dry-run at any time.",
      },
    );

  const onDisarm = () =>
    applyModeChange(
      { autonomy_enabled: true, dry_run: true, auto_merge: false },
      {
        title: "Return to dry-run?",
        confirmLabel: "Return to dry-run",
        body: "The engine will keep proposing changes but stop merging. In-flight work is unaffected.",
      },
    );

  const onKillSwitch = () =>
    applyModeChange(
      { autonomy_enabled: false, dry_run: true, auto_merge: false },
      {
        title: "Disable autonomy entirely?",
        confirmLabel: "Disable",
        body: "Turns autonomy off at the config level: the engine proposes nothing until an owner re-enables it. This is the full stop, not just a step back to dry-run.",
      },
    );

  async function onDryRun() {
    const ok = await confirm({
      title: "Run a dry-run sweep?",
      confirmLabel: "Run sweep",
      body: "A dry-run reads the repo and prints the proposed work. It changes nothing.",
    });
    if (ok) {
      const resolved = formatMessage(state.messages, "panel.arming.dry-run-queued");
      setNotice({ tone: resolved.severity, text: resolved.message });
    }
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
        <div className="page-head__actions">
          {dirty ? (
            <Button variant="ghost" onClick={onDiscard} disabled={saving}>
              Discard changes
            </Button>
          ) : null}
          <Button
            variant="primary"
            iconLeft="check"
            onClick={onSave}
            loading={saving}
            disabled={!write.writable || !dirty || saving}
          >
            Save configuration
          </Button>
          <ArmingStateBadge mode={state.arming.mode} envArmed={state.arming.envArmed} size="lg" />
        </div>
      </div>

      {!write.writable ? (
        <p className="mdn-faint">
          Read-only: changes below stay local until the panel is connected to live, writable state
          (start the dev server with <code className="mdn-mono">MODONOME_PANEL_WRITE=1</code>).
        </p>
      ) : null}

      {notice ? (
        <Toast
          tone={notice.tone}
          title={notice.tone === "blocked" ? "Save failed" : "Acknowledged"}
          message={notice.text}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "activation" ? (
        <Card title="Activation ladder" help="Arming is only allowed when every prerequisite holds. Owner-only items are set in CI, not here.">
          <ActivationLadder
            mode={state.arming.mode}
            checklist={state.arming.checklist}
            onDryRun={onDryRun}
            onArm={onArm}
            onDisarm={onDisarm}
            onKillSwitch={onKillSwitch}
          />
        </Card>
      ) : null}

      {tab === "caps" ? (
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
        </div>
      ) : null}

      {tab === "governance" ? (
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
      ) : null}
    </div>
  );
}
