// @dsCard group="Governance"
import { CostPanel } from "@modonome/design-system";

const remoteCost = {
  budgetUsd: 25,
  spentUsd: 3.42,
  localCalls: 118,
  remoteCalls: 27,
  cacheSaves: 41,
  byModel: [
    { model: "llama-3.3-70b", provider: "local", costClass: "local" as const, calls: 118, usd: 0 },
    { model: "claude-sonnet-4-6", provider: "anthropic", costClass: "paid" as const, calls: 27, usd: 3.42 },
  ],
};

const localOnlyCost = {
  budgetUsd: 0,
  spentUsd: 0,
  localCalls: 0,
  remoteCalls: 0,
  cacheSaves: 0,
  byModel: [
    { model: "local-default", provider: "local ollama", costClass: "local" as const, calls: 0, usd: 0 },
  ],
};

export const Remote = () => <CostPanel cost={remoteCost} />;

export const LocalOnly = () => <CostPanel cost={localOnlyCost} />;
