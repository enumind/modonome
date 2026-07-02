import { cx } from "../../lib/cx";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { StatusPill } from "../StatusPill/StatusPill";

export interface ProtectedPathRowProps {
  /** The protected file or directory path, rendered in mono, e.g. "infra/prod/**". */
  path: string;
  /** Identity of whoever last touched this path, shown when approval is pending. */
  touchedBy?: string;
  /** Whether this path currently has a change awaiting owner approval. */
  approvalNeeded: boolean;
  /** Identity of the owner who already approved the pending change, if any. */
  approver?: string;
  /** Called when the owner clicks Approve. Omit to hide the action (e.g. for non-owner viewers). The caller is responsible for confirming before invoking this. */
  onApprove?: () => void;
}

/**
 * A single row describing one protected path's guard state: a lock icon, the path in
 * mono, and a status readout. When a change is awaiting approval, shows an
 * attention-toned pill, notes who touched the path, and (when `onApprove` is
 * provided) an owner-only Approve action. Once approved, shows who approved it. When
 * no change is pending, shows a calm neutral "Protected" pill instead.
 */
export function ProtectedPathRow({
  path,
  touchedBy,
  approvalNeeded,
  approver,
  onApprove,
}: ProtectedPathRowProps) {
  const pendingApproval = approvalNeeded && !approver;

  return (
    <div className={cx("mdn-protectedpathrow", pendingApproval && "mdn-protectedpathrow--pending")}>
      <Icon name="lock" size={15} className="mdn-protectedpathrow__lock" />
      <span className="mdn-protectedpathrow__path mdn-mono">{path}</span>
      <span className="mdn-spacer" />

      {pendingApproval ? (
        <div className="mdn-protectedpathrow__status">
          <div className="mdn-protectedpathrow__statusline">
            <StatusPill tone="attention" icon="alert" size="sm">
              Approval needed
            </StatusPill>
            {onApprove ? (
              <Button variant="secondary" size="sm" className="mdn-protectedpathrow__approve" onClick={onApprove}>
                Approve
              </Button>
            ) : null}
          </div>
          {touchedBy ? (
            <span className="mdn-protectedpathrow__touched mdn-mono mdn-faint">touched by {touchedBy}</span>
          ) : null}
        </div>
      ) : approvalNeeded && approver ? (
        <StatusPill tone="ok" icon="check-circle" size="sm">
          Approved by {approver}
        </StatusPill>
      ) : (
        <div className="mdn-protectedpathrow__status">
          <StatusPill tone="neutral" icon="shield" size="sm">
            Protected
          </StatusPill>
          <span className="mdn-protectedpathrow__note mdn-faint">no pending change</span>
        </div>
      )}
    </div>
  );
}
