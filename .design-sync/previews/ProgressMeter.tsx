// @dsCard group="Governance"
import { ProgressMeter } from "@modonome/design-system";

export const Budget = () => (
  <ProgressMeter value={3.42} max={25} label="Daily remote budget" unit="USD" tone="owner" />
);

export const Coverage = () => <ProgressMeter value={81} max={100} label="Coverage" unit="%" tone="primary" />;
