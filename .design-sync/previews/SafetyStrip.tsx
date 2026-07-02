// @dsCard group="Governance"
import { SafetyStrip } from "@modonome/design-system";

export const Armed = () => (
  <SafetyStrip
    autonomyEnabled
    dryRun={false}
    autoMerge
    mergeCap={6}
    budgetUsd={25}
    branchProtection
    codeOwners
    trustedAuthors={1}
  />
);

export const SafeDefaults = () => (
  <SafetyStrip
    autonomyEnabled={false}
    dryRun
    autoMerge={false}
    mergeCap={0}
    budgetUsd={0}
    branchProtection
    codeOwners
    trustedAuthors={0}
  />
);
