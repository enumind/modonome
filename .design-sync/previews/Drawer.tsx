import { Drawer, StatusPill, Button } from "@modonome/design-system";

export const ItemDetail = () => (
  <Drawer open title="PAY-430" onClose={() => {}} width={420}>
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <StatusPill tone="blocked" icon="alert">Escalated</StatusPill>
        <StatusPill tone="attention">Tier 3</StatusPill>
      </div>
      <p style={{ margin: 0, color: "var(--mdn-text-2)" }}>
        Add an index to the settlements migration. Escalated after three attempts on a protected
        path. Owner review is required before merge.
      </p>
      <Button variant="secondary" iconLeft="external">Open pull request</Button>
    </div>
  </Drawer>
);
