// @dsCard group="Governance"
import { ProtectedPathRow } from "@modonome/design-system";

export const PendingApproval = () => (
  <ProtectedPathRow path="schemas/" touchedBy="WI-035" approvalNeeded onApprove={() => {}} />
);

export const Approved = () => (
  <ProtectedPathRow path="db/migrations/" touchedBy="PAY-430" approvalNeeded approver="dba-team" />
);

export const Protected = () => <ProtectedPathRow path="prompts/" approvalNeeded={false} />;
