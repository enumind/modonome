import { EmptyState, Button } from "@modonome/design-system";

export const Queue = () => (
  <EmptyState
    title="Queue is empty"
    message="No work items are in flight. Run a dry-run sweep to propose work."
    icon="queue"
    action={<Button variant="secondary" iconLeft="play">Run dry-run</Button>}
  />
);
