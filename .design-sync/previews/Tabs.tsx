// @dsCard group="Governance"
import { Tabs } from "@modonome/design-system";

const tabs = [
  { id: "board", label: "Board", icon: "queue" as const },
  { id: "leases", label: "Leases", icon: "clock" as const, count: 3 },
  { id: "audit", label: "Audit", icon: "activity" as const },
];

export const Board = () => <Tabs tabs={tabs} active="board" onChange={() => {}} />;
