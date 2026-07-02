import { IconButton } from "@modonome/design-system";

export const Row = () => (
  <div style={{ display: "flex", gap: 8 }}>
    <IconButton icon="refresh" label="Refresh" />
    <IconButton icon="settings" label="Settings" />
    <IconButton icon="external" label="Open in GitHub" variant="secondary" />
    <IconButton icon="ban" label="Release lease" variant="danger" />
  </div>
);
