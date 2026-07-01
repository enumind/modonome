// @dsCard group="Governance"
import { ActivationLadder } from "@modonome/design-system";

const dryRunChecklist = [
  { label: "Autonomy enabled", ok: true, reason: "Owner opted in via config." },
  { label: "Dry-run off", ok: false, reason: "Engine is in dry-run; it proposes but does not merge." },
  { label: "Auto-merge on", ok: false, reason: "auto_merge is false." },
  {
    label: "MODONOME_ARMED set in CI",
    ok: false,
    reason: "Set MODONOME_ARMED=true in CI secrets. Config alone cannot arm the engine.",
    ownerOnly: true,
  },
  { label: "Branch protection required", ok: true, reason: "The target branch must have protection." },
  { label: "Required CI gates green", ok: true, reason: "All required checks pass." },
  {
    label: "No unapproved protected paths",
    ok: false,
    reason: "2 protected path(s) await owner approval.",
  },
  { label: "Daily merge cap above zero", ok: false, reason: "max_merges_per_day is 0; no merges are allowed." },
];

const armedChecklist = [
  { label: "Autonomy enabled", ok: true, reason: "Owner opted in via config." },
  { label: "Dry-run off", ok: true, reason: "Writes are enabled." },
  { label: "Auto-merge on", ok: true, reason: "Eligible changes may merge after gates pass." },
  {
    label: "MODONOME_ARMED set in CI",
    ok: true,
    reason: "The CI arming secret is present.",
    ownerOnly: true,
  },
  { label: "Branch protection required", ok: true, reason: "The target branch must have protection." },
  { label: "Required CI gates green", ok: true, reason: "All required checks pass." },
  {
    label: "No unapproved protected paths",
    ok: true,
    reason: "No protected path is touched without approval.",
  },
  { label: "Daily merge cap above zero", ok: true, reason: "Up to 6 merge(s) per day." },
];

export const DryRun = () => (
  <ActivationLadder mode="dry-run" checklist={dryRunChecklist} onDryRun={() => {}} onArm={() => {}} />
);

export const Armed = () => (
  <ActivationLadder mode="armed" checklist={armedChecklist} onDryRun={() => {}} onArm={() => {}} />
);
