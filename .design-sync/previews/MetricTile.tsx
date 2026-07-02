// @dsCard group="Governance"
import { MetricTile } from "@modonome/design-system";

export const ArmingMode = () => (
  <MetricTile
    label="Arming mode"
    value="Armed"
    icon="shield"
    tone="ok"
    hint="Disabled proposes nothing, dry-run proposes without writing, armed can open and merge changes once every gate passes."
    sub="All prerequisites clear"
  />
);

export const ActiveWork = () => (
  <MetricTile
    label="Active work"
    value={4}
    unit="items"
    icon="queue"
    tone="attention"
    hint="Work items not yet done, across every state of the queue."
    sub="1 escalated"
  />
);

export const Spend = () => (
  <MetricTile
    label="Spend today"
    value="$3.42"
    icon="cost"
    tone="neutral"
    hint="Remote model spend against the daily budget. Local models cost nothing."
    sub="of $25 budget"
  />
);
