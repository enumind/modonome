"""Subprocess wrappers over modonome's own Node governance scripts.

modonome stays the source of truth for gates, the ratchet, work-item validation,
and state transitions. The fleet never reimplements that logic in Python; it shells
out to the same scripts CI runs, so there is one contract and no drift.

Every function takes ``repo_root`` (the target repo) and runs the script in that
directory. Functions return a small result dict so the crew can branch on outcome
without parsing stderr by hand.
"""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

NODE = "node"
DEFAULT_TIMEOUT = 180


def _run(args: list[str], cwd: str | Path, timeout: int = DEFAULT_TIMEOUT) -> dict:
    """Run a command, capturing output. Never raises on a non-zero exit."""
    proc = subprocess.run(
        args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return {
        "ok": proc.returncode == 0,
        "code": proc.returncode,
        "stdout": (proc.stdout or "").strip(),
        "stderr": (proc.stderr or "").strip(),
    }


def ratchet_check(diff_path: str | Path, repo_root: str | Path) -> dict:
    """Anti-gaming ratchet over a saved unified diff (scripts/guard-ratchet.mjs)."""
    return _run([NODE, "scripts/guard-ratchet.mjs", "--diff", str(diff_path)], repo_root)


def validate_work_item(item_path: str | Path, repo_root: str | Path) -> dict:
    """Schema and governance validation (scripts/validate-work-item.mjs).

    Enforces maker != checker and, when the model fields are set,
    maker_model != checker_model by family.
    """
    return _run([NODE, "scripts/validate-work-item.mjs", str(item_path)], repo_root)


def run_gate_pipeline(diff_path: str | Path, item_path: str | Path, repo_root: str | Path) -> dict:
    """Deterministic gate pipeline (scripts/run-gate-pipeline.mjs).

    Returns the base result plus ``failures`` parsed from the script's JSON output.
    """
    res = _run(
        [
            NODE,
            "scripts/run-gate-pipeline.mjs",
            "--diff",
            str(diff_path),
            "--work-item",
            str(item_path),
        ],
        repo_root,
    )
    try:
        res["failures"] = json.loads(res["stdout"] or "[]")
    except json.JSONDecodeError:
        res["failures"] = [{"gate": "pipeline", "reason": res["stderr"] or "unparseable output"}]
    res["ok"] = not res["failures"]
    return res


def run_command(command: str, repo_root: str | Path, timeout: int = DEFAULT_TIMEOUT) -> dict:
    """Run one gate command listed on a work item (e.g. ``npm test``)."""
    return _run(["bash", "-lc", command], repo_root, timeout=timeout)


def run_gates(commands: list[str], repo_root: str | Path) -> dict:
    """Run every command on the work item's ``gates`` list. Stop reporting at the
    first failure but always return which gate failed."""
    results = []
    for cmd in commands:
        r = run_command(cmd, repo_root)
        results.append({"command": cmd, **r})
        if not r["ok"]:
            return {"ok": False, "failed": cmd, "results": results}
    return {"ok": True, "failed": None, "results": results}


def transition_work_item(
    item_path: str | Path,
    from_state: str,
    to_state: str,
    writer_id: str,
    repo_root: str | Path,
) -> dict:
    """Lease-aware compare-and-swap state transition (scripts/transition-work-item.mjs)."""
    return _run(
        [
            NODE,
            "scripts/transition-work-item.mjs",
            str(item_path),
            from_state,
            to_state,
            writer_id,
        ],
        repo_root,
    )


def read_work_item(item_path: str | Path) -> dict:
    return json.loads(Path(item_path).read_text(encoding="utf-8"))


def patch_work_item(item_path: str | Path, fields: dict) -> None:
    """Merge ``fields`` into the work-item JSON. Used to record maker_id, maker_model,
    checker_id, checker_model, branch, and pr alongside the script-driven state."""
    path = Path(item_path)
    item = json.loads(path.read_text(encoding="utf-8"))
    item.update(fields)
    path.write_text(json.dumps(item, indent=2) + "\n", encoding="utf-8")


def append_metric(repo_root: str | Path, event: str, fields: dict) -> dict:
    """Append one schema-conformant line to .modonome/metrics.jsonl.

    Required by schemas/metrics.schema.json: schema_version, ts, event.
    """
    metric = {
        "schema_version": 1,
        "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event": event,
        **fields,
    }
    metrics_path = Path(repo_root) / ".modonome" / "metrics.jsonl"
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    with metrics_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(metric) + "\n")
    return metric


# --- git helpers (the maker lands a branch; the runner never merges) -----------


def git(args: list[str], repo_root: str | Path, timeout: int = 120) -> dict:
    return _run(["git", *args], repo_root, timeout=timeout)


def current_diff(repo_root: str | Path) -> str:
    """Unified diff of the working tree against HEAD, for the ratchet and pipeline."""
    proc = subprocess.run(
        ["git", "diff", "HEAD"],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
        timeout=120,
    )
    return proc.stdout or ""


def diff_line_count(diff_text: str) -> int:
    """Count added and removed content lines in a unified diff (cap enforcement)."""
    n = 0
    for line in diff_text.splitlines():
        if (line.startswith("+") and not line.startswith("+++")) or (
            line.startswith("-") and not line.startswith("---")
        ):
            n += 1
    return n
