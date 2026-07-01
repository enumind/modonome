// @dsCard group="Governance"
import { Select } from "@modonome/design-system";

const modelOptions = [
  { value: "claude-opus-4-8", label: "claude-opus-4-8" },
  { value: "claude-sonnet-4-6", label: "claude-sonnet-4-6" },
  { value: "llama-3.3-70b", label: "llama-3.3-70b" },
];

export const Model = () => (
  <Select
    label="Checker model"
    options={modelOptions}
    value="claude-sonnet-4-6"
    onValueChange={() => {}}
  />
);
