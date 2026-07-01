// @dsCard group="Governance"
import { GatePanel } from "@modonome/design-system";

const gates = [
  { name: "pnpm test", status: "pass" as const, durationMs: 42000, required: true },
  { name: "pnpm typecheck", status: "pass" as const, durationMs: 9000, required: true },
  { name: "anti-gaming ratchet", status: "pass" as const, durationMs: 3000, required: true },
  {
    name: "coverage",
    status: "flaky" as const,
    durationMs: 51000,
    required: false,
    detail: "Passed 4 of last 5 runs.",
  },
  {
    name: "pnpm migrate:check",
    status: "fail" as const,
    durationMs: 4000,
    required: true,
    detail: "Blocked on protected migration path.",
  },
  { name: "pnpm audit --prod", status: "running" as const, required: true },
];

export const Gates = () => <GatePanel gates={gates} />;
