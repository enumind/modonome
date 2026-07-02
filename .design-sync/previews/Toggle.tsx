// @dsCard group="Governance"
import { Toggle } from "@modonome/design-system";

export const DryRun = () => (
  <Toggle
    label="Dry-run"
    hint="When on, cross-repo activity is proposed but nothing is shared or written."
    checked
    tone="info"
    onCheckedChange={() => {}}
  />
);

export const AutoMerge = () => (
  <Toggle
    label="Auto-merge"
    checked
    tone="owner"
    onCheckedChange={() => {}}
  />
);
