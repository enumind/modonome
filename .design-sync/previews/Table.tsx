// @dsCard group="Governance"
import { Table } from "@modonome/design-system";

interface ModelRow {
  model: string;
  provider: string;
  calls: number;
}

const rows: ModelRow[] = [
  { model: "llama-3.3-70b", provider: "local", calls: 118 },
  { model: "claude-sonnet-4-6", provider: "anthropic", calls: 27 },
  { model: "claude-opus-4-8", provider: "anthropic", calls: 4 },
  { model: "claude-haiku-4-5", provider: "anthropic", calls: 62 },
];

export const Models = () => (
  <Table<ModelRow>
    columns={[
      { key: "model", header: "Model" },
      { key: "provider", header: "Provider" },
      { key: "calls", header: "Calls", align: "right" },
    ]}
    rows={rows}
    getRowKey={(row) => row.model}
  />
);
