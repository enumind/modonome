// @dsCard group="Governance"
import { Card } from "@modonome/design-system";

export const WithHeader = () => (
  <Card title="Model spend" help="Local versus remote calls and budget consumed.">
    <div className="mdn-stack">
      <div className="mdn-row-between">
        <span className="mdn-faint">Local calls</span>
        <span className="mdn-mono">142</span>
      </div>
      <div className="mdn-row-between">
        <span className="mdn-faint">Remote calls</span>
        <span className="mdn-mono">27</span>
      </div>
      <div className="mdn-row-between">
        <span className="mdn-faint">Spent today</span>
        <span className="mdn-mono">$3.42 of $25.00</span>
      </div>
    </div>
  </Card>
);
