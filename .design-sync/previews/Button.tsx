// @dsCard group="Governance"
import { Button } from "@modonome/design-system";

export const Variants = () => (
  <div style={{ display: "flex", gap: 8 }}>
    <Button variant="primary" iconLeft="shield">
      Arm engine
    </Button>
    <Button variant="secondary" iconLeft="play">
      Run dry-run
    </Button>
    <Button variant="ghost">Details</Button>
    <Button variant="danger" iconLeft="power">
      Disarm
    </Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <Button variant="primary" size="sm">
      Arm engine
    </Button>
    <Button variant="primary" size="md">
      Arm engine
    </Button>
    <Button variant="primary" size="lg">
      Arm engine
    </Button>
  </div>
);
