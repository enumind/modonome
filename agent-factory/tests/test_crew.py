"""Tests for fleet_runner.crew.run_work_item.

All external side-effects (git, modonome node scripts, model calls) are monkeypatched.
The test exercises the Python state-machine logic only.
"""

from __future__ import annotations

import json
from pathlib import Path

from fleet_runner.config import FleetConfig, ModelSpec

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FAKE_DIFF = """\
diff --git a/notes.txt b/notes.txt
index 0000000..1111111 100644
--- a/notes.txt
+++ b/notes.txt
@@ -0,0 +1 @@
+new content
"""


def _make_fleet_config() -> FleetConfig:
    """Return a FleetConfig with distinct families (qwen maker, claude checker)."""
    return FleetConfig(
        maker=ModelSpec("qwen2.5-coder-32b", "qwen", "openai"),
        checker=ModelSpec("claude-cli", "claude", "claude_cli"),
    )


def _make_work_item(
    tmp_path: Path,
    *,
    state: str = "queued",
    touches_protected_path: bool = False,
    allowed_edit_set: list[str] | None = None,
    gates: list[str] | None = None,
) -> Path:
    item = {
        "id": "item-test-001",
        "goal": "test goal",
        "state": state,
        "touches_protected_path": touches_protected_path,
        "allowed_edit_set": allowed_edit_set if allowed_edit_set is not None else ["notes.txt"],
        "gates": gates if gates is not None else [],
    }
    items_dir = tmp_path / ".modonome" / "work-items"
    items_dir.mkdir(parents=True, exist_ok=True)
    item_path = items_dir / "item-test-001.json"
    item_path.write_text(json.dumps(item, indent=2), encoding="utf-8")
    return item_path


def _make_repo(tmp_path: Path) -> Path:
    """Create a minimal repo with .modonome/config.yaml and notes.txt."""
    modonome = tmp_path / ".modonome"
    modonome.mkdir(parents=True, exist_ok=True)
    (modonome / "config.yaml").write_text(
        "protected_paths_extra: []\nmax_diff_lines: 400\nlease_minutes: 60\n",
        encoding="utf-8",
    )
    (tmp_path / "notes.txt").write_text("original content\n", encoding="utf-8")
    return tmp_path


def _patch_crew(monkeypatch) -> None:
    """Patch all external calls in fleet_runner.crew namespace."""
    monkeypatch.setattr("fleet_runner.crew.run_gate_pipeline", lambda *a, **kw: {"ok": True, "failures": []})
    monkeypatch.setattr(
        "fleet_runner.crew.run_gates", lambda *a, **kw: {"ok": True, "failed": None, "results": []}
    )
    monkeypatch.setattr(
        "fleet_runner.crew.validate_work_item", lambda *a, **kw: {"ok": True, "stdout": "", "stderr": ""}
    )
    monkeypatch.setattr("fleet_runner.crew.transition_work_item", lambda *a, **kw: {"ok": True, "stderr": ""})
    monkeypatch.setattr("fleet_runner.crew.git", lambda *a, **kw: {"ok": True})
    monkeypatch.setattr("fleet_runner.crew.append_metric", lambda *a, **kw: {})
    monkeypatch.setattr("fleet_runner.crew.current_diff", lambda *a, **kw: FAKE_DIFF)


# ---------------------------------------------------------------------------
# The happy path: run_work_item returns "merge_ready"
# ---------------------------------------------------------------------------


class TestRunWorkItemMergeReady:
    def test_returns_merge_ready(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path)

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="test-run-1",
            dry_run=False,
            maker_fn=lambda: {"notes.txt": "new content"},
            checker_fn=lambda diff, rat, gs: {
                "requested_changes": False,
                "questions_raised": 0,
                "summary": "ok",
            },
        )
        assert result["status"] == "merge_ready"

    def test_merge_ready_includes_item_id(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path)

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="test-run-2",
            dry_run=False,
            maker_fn=lambda: {"notes.txt": "new content"},
            checker_fn=lambda diff, rat, gs: {
                "requested_changes": False,
                "questions_raised": 0,
                "summary": "ok",
            },
        )
        assert result.get("item") == "item-test-001"


# ---------------------------------------------------------------------------
# Eligibility guards
# ---------------------------------------------------------------------------


class TestRunWorkItemEligibility:
    def test_non_queued_state_returns_skipped(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path, state="making")

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="r1",
            maker_fn=lambda: {},
            checker_fn=lambda d, r, g: {},
        )
        assert result["status"] == "skipped"
        assert "making" in result.get("reason", "")

    def test_claimed_state_returns_skipped(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path, state="claimed")

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="r2",
            maker_fn=lambda: {},
            checker_fn=lambda d, r, g: {},
        )
        assert result["status"] == "skipped"

    def test_merge_ready_state_returns_skipped(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path, state="merge_ready")

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="r3",
            maker_fn=lambda: {},
            checker_fn=lambda d, r, g: {},
        )
        assert result["status"] == "skipped"

    def test_touches_protected_path_returns_skipped(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path, touches_protected_path=True)

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="r4",
            maker_fn=lambda: {},
            checker_fn=lambda d, r, g: {},
        )
        assert result["status"] == "skipped"
        assert "protected" in result.get("reason", "").lower()

    def test_allowed_edit_set_containing_protected_path_returns_skipped(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        # "scripts/x" matches the DEFAULT_PROTECTED "scripts/" prefix
        item_path = _make_work_item(
            tmp_path,
            allowed_edit_set=["scripts/x"],
        )

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="r5",
            maker_fn=lambda: {},
            checker_fn=lambda d, r, g: {},
        )
        assert result["status"] == "skipped"
        assert "protected" in result.get("reason", "").lower()

    def test_empty_allowed_edit_set_returns_skipped(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path, allowed_edit_set=[])

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="r6",
            maker_fn=lambda: {},
            checker_fn=lambda d, r, g: {},
        )
        assert result["status"] == "skipped"


# ---------------------------------------------------------------------------
# Dry run
# ---------------------------------------------------------------------------


class TestRunWorkItemDryRun:
    def test_dry_run_returns_rehearsed(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path)

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="dry-run-1",
            dry_run=True,
            maker_fn=lambda: {"notes.txt": "dry run content"},
            checker_fn=lambda diff, rat, gs: {
                "requested_changes": False,
                "questions_raised": 0,
                "summary": "dry ok",
            },
        )
        assert result["status"] == "rehearsed"

    def test_dry_run_result_includes_diff_lines(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path)

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="dry-run-2",
            dry_run=True,
            maker_fn=lambda: {"notes.txt": "dry content"},
            checker_fn=lambda diff, rat, gs: {
                "requested_changes": False,
                "questions_raised": 0,
                "summary": "ok",
            },
        )
        assert "diff_lines" in result

    def test_dry_run_result_includes_parked_field(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path)

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="dry-run-3",
            dry_run=True,
            maker_fn=lambda: {"notes.txt": "dry"},
            checker_fn=lambda d, r, g: {
                "requested_changes": False,
                "questions_raised": 0,
                "summary": "ok",
            },
        )
        assert result.get("parked") == "merge_ready"


# ---------------------------------------------------------------------------
# Maker fence violations -> "failed"
# ---------------------------------------------------------------------------


class TestRunWorkItemMakerViolation:
    def test_edit_outside_allowed_edit_set_returns_failed(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        # allowed_edit_set only contains notes.txt
        item_path = _make_work_item(tmp_path, allowed_edit_set=["notes.txt"])
        # create the unauthorized file so the write doesn't fail in unexpected ways
        (tmp_path / "unauthorized.py").write_text("", encoding="utf-8")

        from fleet_runner.crew import run_work_item

        # maker_fn tries to write outside allowed_edit_set
        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="fence-test-1",
            dry_run=False,
            maker_fn=lambda: {"unauthorized.py": "# hacked"},
            checker_fn=lambda d, r, g: {
                "requested_changes": False,
                "questions_raised": 0,
                "summary": "ok",
            },
        )
        assert result["status"] == "failed"
        assert "allowed_edit_set" in result.get("reason", "") or "outside" in result.get("reason", "")

    def test_failed_result_includes_reason(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path, allowed_edit_set=["notes.txt"])

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="fence-test-2",
            dry_run=False,
            maker_fn=lambda: {"scripts/bad.sh": "#!/bin/bash"},
            checker_fn=lambda d, r, g: {
                "requested_changes": False,
                "questions_raised": 0,
                "summary": "ok",
            },
        )
        assert result["status"] == "failed"
        assert "reason" in result


# ---------------------------------------------------------------------------
# Checker requests changes -> "rework"
# ---------------------------------------------------------------------------


class TestRunWorkItemCheckerRework:
    def test_checker_requested_changes_returns_rework(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path)

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="rework-1",
            dry_run=False,
            maker_fn=lambda: {"notes.txt": "new content"},
            checker_fn=lambda diff, rat, gs: {
                "requested_changes": True,
                "questions_raised": 2,
                "summary": "needs more work",
            },
        )
        assert result["status"] == "rework"

    def test_rework_result_includes_verdict(self, tmp_path, monkeypatch):
        _patch_crew(monkeypatch)
        repo = _make_repo(tmp_path)
        item_path = _make_work_item(tmp_path)

        from fleet_runner.crew import run_work_item

        result = run_work_item(
            repo,
            item_path,
            _make_fleet_config(),
            run_id="rework-2",
            dry_run=False,
            maker_fn=lambda: {"notes.txt": "new content"},
            checker_fn=lambda diff, rat, gs: {
                "requested_changes": True,
                "questions_raised": 1,
                "summary": "change X",
            },
        )
        assert "verdict" in result
        assert result["verdict"]["requested_changes"] is True
