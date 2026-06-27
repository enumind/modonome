"""Drive a single work item in a single repo. The unit the scheduler calls, and the
handle for a manual go-live run on one item.
"""

from __future__ import annotations

import argparse
import json

from .config import FleetConfig
from .crew import run_work_item


def _main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run maker -> checker on one work item.")
    parser.add_argument("--repo", required=True, help="Path to the target repo root.")
    parser.add_argument("--work-item", required=True, help="Path to the work-item JSON.")
    parser.add_argument("--fleet-config", default="fleet.config.yaml")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    cfg = FleetConfig.load(args.fleet_config)
    result = run_work_item(args.repo, args.work_item, cfg, run_id=args.run_id, dry_run=args.dry_run)
    print(json.dumps(result, indent=2, default=str))
    return 0 if result.get("status") in {"merge_ready", "rehearsed", "rework", "skipped", "idle"} else 1


if __name__ == "__main__":
    raise SystemExit(_main())
