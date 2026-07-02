// @dsCard group="Governance"
import { NumberField } from "@modonome/design-system";

export const MergeCap = () => (
  <NumberField
    label="Max merges per day"
    hint="Caps how many pull requests the engine can merge in a rolling 24 hour window."
    value={6}
    onValueChange={() => {}}
    min={0}
  />
);

export const Budget = () => (
  <NumberField
    label="Remote model budget"
    unit="USD/day"
    value={25}
    onValueChange={() => {}}
    min={0}
  />
);
