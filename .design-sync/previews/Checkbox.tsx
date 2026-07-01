// @dsCard group="Governance"
import { Checkbox } from "@modonome/design-system";

export const Requirement = () => (
  <Checkbox
    label="Require branch protection"
    hint="Merges are blocked unless the target branch has protection rules enabled."
    checked
    onCheckedChange={() => {}}
  />
);
