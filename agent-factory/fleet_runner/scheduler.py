"""Cross-repo scheduler: organize many fleets over a shared worker pool.

Walks the registry by priority, finds each repo's queued Tier-1 items, and dispatches
them through the shared workers under a global concurrency cap. With one local 32B model
the cap is 1 and dispatch is sequential, which is correct: the gateway is the real
serialization point. Parallel fairness across multiple model instances is a later
refinement and does not change this interface.
"""

from __future__ import annotations

from pathlib import Path

from .crew import run_work_item
from .registry import Registry, load_registry
from .tools import read_work_item


def queued_tier1_items(repo_root: str | Path) -> list[Path]:
    """Return queued, non-protected work-item files in a repo, oldest first."""
    items_dir = Path(repo_root) / ".modonome" / "work-items"
    if not items_dir.exists():
        return []
    out = []
    for f in sorted(items_dir.glob("*.json")):
        try:
            item = read_work_item(f)
        except (ValueError, OSError):
            continue
        if item.get("state") == "queued" and not item.get("touches_protected_path"):
            out.append(f)
    return out


def tick_all(registry: Registry) -> list[dict]:
    """Sweep expired leases across every managed repo (scripts/tick.mjs per repo)."""
    results = []
    for fleet in registry.fleets:
        repo = registry.repo_root(fleet.alias)
        tick = _node_tick(repo)
        results.append(
            {"alias": fleet.alias, "ok": tick["ok"], "detail": tick.get("stdout") or tick.get("stderr")}
        )
    return results


def _node_tick(repo_root: Path) -> dict:
    import subprocess

    proc = subprocess.run(
        ["node", "scripts/tick.mjs", ".modonome"],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
        timeout=120,
    )
    return {
        "ok": proc.returncode == 0,
        "stdout": (proc.stdout or "").strip(),
        "stderr": (proc.stderr or "").strip(),
    }


def run_registry(
    registry_path: str | Path,
    run_id: str,
    *,
    dry_run: bool = False,
    max_items_per_repo: int = 1,
) -> list[dict]:
    registry = load_registry(registry_path)
    dispatched = 0
    results: list[dict] = []

    for fleet in sorted(registry.fleets, key=lambda f: f.priority, reverse=True):
        if dispatched >= registry.max_concurrent and not dry_run:
            results.append(
                {"alias": fleet.alias, "status": "deferred", "reason": "global concurrency cap reached"}
            )
            continue
        cfg = registry.fleet_config(fleet.alias)
        repo = registry.repo_root(fleet.alias)
        items = queued_tier1_items(repo)[:max_items_per_repo]
        if not items:
            results.append({"alias": fleet.alias, "status": "idle", "reason": "no queued Tier-1 items"})
            continue
        for item_path in items:
            res = run_work_item(repo, item_path, cfg, run_id=run_id, dry_run=dry_run)
            results.append({"alias": fleet.alias, "item": str(item_path.name), **res})
            if not dry_run and res.get("status") in {"merge_ready", "rework", "checking"}:
                dispatched += 1
            if dispatched >= registry.max_concurrent and not dry_run:
                break
    return results


def _main(argv: list[str] | None = None) -> int:
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Run the fleet across all registered repos.")
    parser.add_argument("--registry", default="fleets/registry.yaml")
    parser.add_argument("--run-id", required=True, help="A unique id for this scheduling pass.")
    parser.add_argument("--dry-run", action="store_true", help="Rehearse without side effects.")
    parser.add_argument("--tick", action="store_true", help="Only sweep expired leases, then exit.")
    parser.add_argument("--max-items-per-repo", type=int, default=1)
    args = parser.parse_args(argv)

    if args.tick:
        print(json.dumps(tick_all(load_registry(args.registry)), indent=2))
        return 0

    results = run_registry(
        args.registry, args.run_id, dry_run=args.dry_run, max_items_per_repo=args.max_items_per_repo
    )
    print(json.dumps(results, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
