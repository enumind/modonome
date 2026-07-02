// @dsCard group="Governance"
import { Toast } from "@modonome/design-system";

export const Info = () => <Toast tone="info" title="Dry-run sweep queued" />;

export const Success = () => <Toast tone="ok" title="Merged" message="PAY-402 merged by merge authority" />;

export const Blocked = () => <Toast tone="blocked" title="Ratchet rejected" message="Removed a test assertion" />;
