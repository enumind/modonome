import { Modal, Button } from "@modonome/design-system";

export const RaiseCap = () => (
  <Modal
    open
    title="Raise the daily merge cap?"
    onClose={() => {}}
    footer={
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary">Raise to 8</Button>
      </div>
    }
  >
    The engine has run two clean weeks. Raising the cap from 6 to 8 lets it land more Tier 1 work
    per day. You can lower it again at any time.
  </Modal>
);
