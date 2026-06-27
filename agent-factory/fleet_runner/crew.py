"""The maker -> checker loop for one work item, governed by the target repo's modonome.

modonome owns state, gates, the ratchet, validation, and metrics (via tools.py). The
fleet owns model invocation and the sequencing. No autonomous merge: the loop ends at
merge_ready, parked for the owner.

The maker and checker model calls are injectable (maker_fn / checker_fn) so the suite
runs offline and a dry run rehearses the path without a live model or side effects.
"""

from __future__ import annotations

import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml

from .agents import build_checker_prompt, parse_checker_verdict, run_maker
from .briefs import load_brief
from .config import FleetConfig, read_target_caps
from .llms import ClaudeCliLLM
from .tools import (
    append_metric,
    current_diff,
    diff_line_count,
    git,
    patch_work_item,
    read_work_item,
    run_gate_pipeline,
    run_gates,
    transition_work_item,
    validate_work_item,
)
from .util import checker_identity, maker_identity

DEFAULT_PROTECTED = [
    "bin/",
    "prompts/",
    "schemas/",
    "scripts/",
    "templates/",
    ".github/",
    "site/",
    ".claude/",
    ".modonome/config.yaml",
    "pnpm-lock.yaml",
    "package-lock.json",
]


def _protected_prefixes(repo_root: str | Path) -> list[str]:
    cfg_path = Path(repo_root) / ".modonome" / "config.yaml"
    extra = []
    if cfg_path.exists():
        raw = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
        extra = raw.get("protected_paths_extra", []) or []
    return sorted(set(DEFAULT_PROTECTED) | set(extra))


def _under(path: str, prefixes: list[str]) -> bool:
    norm = path.lstrip("./")
    for pre in prefixes:
        if norm == pre or norm.startswith(pre.rstrip("/") + "/") or norm == pre.rstrip("/"):
            return True
    return False


def _result(status: str, **kw) -> dict:
    return {"status": status, **kw}


def run_work_item(
    repo_root: str | Path,
    item_path: str | Path,
    cfg: FleetConfig,
    *,
    run_id: str,
    dry_run: bool = False,
    maker_fn=None,
    checker_fn=None,
) -> dict:
    repo_root = Path(repo_root)
    item_path = Path(item_path)
    caps = read_target_caps(repo_root)
    item = read_work_item(item_path)

    # --- eligibility (Tier 1, non-protected, queued) ---
    if item.get("state") != "queued":
        return _result("skipped", reason=f"state is '{item.get('state')}', not queued")
    if item.get("touches_protected_path"):
        return _result("skipped", reason="touches a protected path; route to owner/architect")
    cfg.assert_distinct_families()

    protected = _protected_prefixes(repo_root)
    allowed = item.get("allowed_edit_set", [])
    if not allowed:
        return _result("skipped", reason="no allowed_edit_set; thin packet is a decomposition defect")
    bad = [p for p in allowed if _under(p, protected)]
    if bad:
        return _result("skipped", reason=f"allowed_edit_set includes protected paths: {bad}")

    maker_model, checker_model = cfg.maker.id, cfg.checker.id
    mk_id = maker_identity(run_id, maker_model)
    ck_id = checker_identity(run_id, checker_model)
    brief_dev = load_brief(repo_root, "developer")
    brief_test = load_brief(repo_root, "tester")

    # --- claim + start making (only when landing for real) ---
    if not dry_run:
        claim = transition_work_item(item_path, "queued", "claimed", mk_id, repo_root)
        if not claim["ok"]:
            return _result("conflict", reason=claim["stderr"] or "claim refused")
        lease_until = (datetime.now(timezone.utc) + timedelta(minutes=caps["lease_minutes"])).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        patch_work_item(
            item_path, {"maker_id": mk_id, "maker_model": maker_model, "lease_expires_at": lease_until}
        )
        start = transition_work_item(item_path, "claimed", "making", mk_id, repo_root)
        if not start["ok"]:
            return _result("conflict", reason=start["stderr"] or "start_making refused")

    # --- maker: produce scoped edits ---
    current_files = {
        p: (repo_root / p).read_text(encoding="utf-8") for p in allowed if (repo_root / p).exists()
    }
    created = set()
    if maker_fn is None:
        maker_fn = lambda: run_maker(cfg, brief_dev, item, current_files)  # noqa: E731
    edits = maker_fn()

    for path in edits:
        if path not in allowed:
            return _fail_and_revert(
                repo_root,
                item_path,
                created,
                dry_run,
                mk_id,
                f"maker edited a path outside allowed_edit_set: {path}",
            )
        if _under(path, protected):
            return _fail_and_revert(
                repo_root, item_path, created, dry_run, mk_id, f"maker edited a protected path: {path}"
            )
    for path, content in edits.items():
        target = repo_root / path
        if not target.exists():
            created.add(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    diff_text = current_diff(repo_root)
    lines = diff_line_count(diff_text)
    if lines > caps["max_diff_lines"]:
        return _fail_and_revert(
            repo_root,
            item_path,
            created,
            dry_run,
            mk_id,
            f"diff {lines} lines exceeds cap {caps['max_diff_lines']}",
        )

    with tempfile.NamedTemporaryFile("w", suffix=".patch", delete=False, encoding="utf-8") as fh:
        fh.write(diff_text)
        diff_file = fh.name

    ratchet = run_gate_pipeline(diff_file, item_path, repo_root)
    if not ratchet["ok"]:
        return _fail_and_revert(
            repo_root, item_path, created, dry_run, mk_id, f"deterministic gate failed: {ratchet['failures']}"
        )
    gate = run_gates([g for g in item.get("gates", []) if _looks_runnable(g)], repo_root)
    if not gate["ok"]:
        return _fail_and_revert(
            repo_root, item_path, created, dry_run, mk_id, f"work-item gate failed: {gate['failed']}"
        )

    rationale = (
        f"Implemented: {item.get('goal') or item.get('id')}. "
        f"Deterministic gates and {len(gate['results'])} listed gate(s) green. "
        f"Diff {lines} lines within cap {caps['max_diff_lines']}; edits limited to allowed_edit_set."
    )

    # --- land + move to checking (real run only) ---
    branch = f"work/{item.get('id', 'item')}"
    if not dry_run:
        git(["checkout", "-b", branch], repo_root)
        git(["add", *edits.keys()], repo_root)
        git(["commit", "-m", f"{item.get('id', 'item')}: {item.get('goal', 'change')}"], repo_root)
        patch_work_item(item_path, {"branch": branch})
        chk = transition_work_item(item_path, "making", "checking", mk_id, repo_root)
        if not chk["ok"]:
            return _result("conflict", reason=chk["stderr"] or "to-checking refused")
        append_metric(
            repo_root, "maker_run", {"item": item.get("id"), "maker_id": mk_id, "maker_model": maker_model}
        )

    # --- checker: deterministic gates are authority; claude critic is advisory ---
    gate_summary = "deterministic gates: PASS (ratchet, work-item validation, listed gates)"
    if checker_fn is None:

        def checker_fn(diff, rat, gs):
            prompt = build_checker_prompt(brief_test, diff, rat, gs)
            return parse_checker_verdict(ClaudeCliLLM(cfg.checker).review(prompt))

    verdict = checker_fn(diff_text, rationale, gate_summary)

    if dry_run:
        _revert(repo_root, edits, created)
        return _result(
            "rehearsed",
            item=item.get("id"),
            diff_lines=lines,
            verdict=verdict,
            branch=branch,
            parked="merge_ready",
        )

    patch_work_item(item_path, {"checker_id": ck_id, "checker_model": checker_model})
    validation = validate_work_item(item_path, repo_root)
    if not validation["ok"]:
        transition_work_item(item_path, "checking", "escalated", ck_id, repo_root)
        patch_work_item(item_path, {"escalation_reason": f"validation failed: {validation['stderr']}"})
        return _result("escalated", reason=validation["stderr"])
    append_metric(
        repo_root,
        "checker_review",
        {
            "item": item.get("id"),
            "checker_id": ck_id,
            "checker_model": checker_model,
            "checker_requested_changes": verdict["requested_changes"],
            "checker_questions_raised": verdict["questions_raised"],
        },
    )

    if verdict["requested_changes"]:
        transition_work_item(item_path, "checking", "rework", ck_id, repo_root)
        return _result("rework", item=item.get("id"), verdict=verdict, branch=branch)

    transition_work_item(item_path, "checking", "merge_ready", ck_id, repo_root)
    return _result(
        "merge_ready",
        item=item.get("id"),
        verdict=verdict,
        branch=branch,
        note="parked for owner merge (no autonomous merge without a separate merge authority)",
    )


def _looks_runnable(gate: str) -> bool:
    """A work-item gate is runnable if it reads like a shell command."""
    g = gate.strip()
    return bool(g) and (" " in g or g.startswith(("npm", "node", "pnpm", "bash", "python", "pytest", "make")))


def _revert(repo_root: Path, edits: dict, created: set) -> None:
    modified = [p for p in edits if p not in created]
    if modified:
        git(["checkout", "--", *modified], repo_root)
    for p in created:
        target = repo_root / p
        if target.exists():
            target.unlink()


def _fail_and_revert(repo_root, item_path, created, dry_run, writer_id, reason) -> dict:
    git(["checkout", "--", "."], repo_root)
    for p in created:
        t = Path(repo_root) / p
        if t.exists():
            t.unlink()
    if not dry_run:
        # bounce to rework so attempts are counted by the next claim; record nothing fake.
        transition_work_item(item_path, "making", "rework", writer_id, repo_root)
    return _result("failed", reason=reason)
