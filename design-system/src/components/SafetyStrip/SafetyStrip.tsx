import type { ReactNode } from "react";
import { StatusPill, type StatusPillTone } from "../StatusPill/StatusPill";
import { HelpHint } from "../HelpHint/HelpHint";

export interface SafetyStripProps {
  /** Whether autonomous operation is currently switched on for this project. */
  autonomyEnabled: boolean;
  /** Whether the system is running in dry-run: it plans and opens PRs but never merges. */
  dryRun: boolean;
  /** Whether passing work items are allowed to merge without a human clicking merge. */
  autoMerge: boolean;
  /** Maximum number of auto-merges allowed per day. Zero means merges are blocked entirely. */
  mergeCap: number;
  /** Maximum autonomous spend allowed per day, in US dollars. */
  budgetUsd: number;
  /** Whether the default branch is protected by branch protection rules. */
  branchProtection: boolean;
  /** Whether a CODEOWNERS file is enforced on protected paths. */
  codeOwners: boolean;
  /** Number of authors currently trusted to have their PRs fast-tracked through review. */
  trustedAuthors: number;
}

const LEVER_HELP = {
  autonomyEnabled: "When on, the maker and checker actors can pick up work without a human starting each item.",
  dryRun: "When on, the system plans, makes changes, and opens pull requests, but never merges anything itself.",
  autoMerge: "When on, work items that pass every gate can merge on their own instead of waiting for a human click.",
  mergeCap: "The most auto-merges allowed in a single day, regardless of how many items are ready. Zero blocks all merges.",
  budgetUsd: "The most this project can spend on autonomous work in a single day before it pauses itself.",
  branchProtection: "Whether the default branch rejects direct pushes and requires checks and review to land a change.",
  codeOwners: "Whether changes to protected paths require sign-off from the file's designated owner.",
  trustedAuthors: "How many authors currently skip extra scrutiny because their track record has earned fast-tracked review.",
} as const;

/**
 * A horizontal, wrapping strip of small labeled cells summarizing the safety-relevant
 * levers for a project at a glance: whether autonomy and auto-merge are on, dry-run
 * status, merge and budget caps, and the branch-protection posture. Each cell pairs a
 * tiny mono label (with a HelpHint explaining the lever from an operator's point of
 * view) with a value rendered as a StatusPill, so meaning is never carried by color
 * alone. This is the safety row at the top of the project Overview.
 */
export function SafetyStrip({
  autonomyEnabled,
  dryRun,
  autoMerge,
  mergeCap,
  budgetUsd,
  branchProtection,
  codeOwners,
  trustedAuthors,
}: SafetyStripProps) {
  const boolCell = (
    key: keyof typeof LEVER_HELP,
    label: string,
    value: boolean,
    onTone: StatusPillTone = "ok",
  ) => (
    <Cell key={key} label={label} help={LEVER_HELP[key]}>
      <StatusPill tone={value ? onTone : "neutral"}>{value ? "On" : "Off"}</StatusPill>
    </Cell>
  );

  return (
    <div className="mdn-safetystrip" role="group" aria-label="Safety settings">
      {boolCell("autonomyEnabled", "Autonomy", autonomyEnabled, "ok")}
      {boolCell("dryRun", "Dry run", dryRun, "info")}
      {boolCell("autoMerge", "Auto-merge", autoMerge, "attention")}
      <Cell label="Merge cap" help={LEVER_HELP.mergeCap}>
        <StatusPill tone={mergeCap === 0 ? "blocked" : "neutral"}>
          {mergeCap === 0 ? "Blocked" : `${mergeCap}/day`}
        </StatusPill>
      </Cell>
      <Cell label="Budget" help={LEVER_HELP.budgetUsd}>
        <StatusPill tone="neutral">${budgetUsd}/day</StatusPill>
      </Cell>
      {boolCell("branchProtection", "Branch protection", branchProtection, "ok")}
      {boolCell("codeOwners", "Code owners", codeOwners, "ok")}
      <Cell label="Trusted authors" help={LEVER_HELP.trustedAuthors}>
        <StatusPill tone="neutral">{trustedAuthors}</StatusPill>
      </Cell>
    </div>
  );
}

interface CellProps {
  label: string;
  help: string;
  children: ReactNode;
}

function Cell({ label, help, children }: CellProps) {
  return (
    <div className="mdn-safetystrip__cell">
      <div className="mdn-safetystrip__label-row">
        <span className="mdn-safetystrip__label mdn-label">{label}</span>
        <HelpHint>{help}</HelpHint>
      </div>
      {children}
    </div>
  );
}
