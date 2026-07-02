// @dsCard group="Governance"
import { Slider } from "@modonome/design-system";

export const Budget = () => (
  <Slider
    label="Remote model budget"
    unit="USD/day"
    value={25}
    onValueChange={() => {}}
    min={0}
    max={100}
    step={5}
  />
);
