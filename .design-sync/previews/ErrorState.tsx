import { ErrorState, Button } from "@modonome/design-system";

export const Unreachable = () => (
  <ErrorState
    title="Could not read state"
    message="The .modonome directory was not reachable."
    action={<Button variant="secondary" iconLeft="refresh">Retry</Button>}
  />
);
