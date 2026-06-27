"""Tests for fleet_runner.scheduler: queued_tier1_items, run_registry."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _write_work_item(items_dir: Path, name: str, state: str, touches_protected: bool = False) -> Path:
    item = {
        "id": name,
        "goal": f"goal for {name}",
        "state": state,
        "touches_protected_path": touches_protected,
        "allowed_edit_set": ["notes.txt"],
        "gates": [],
    }
    path = items_dir / f"{name}.json"
    path.write_text(json.dumps(item, indent=2), encoding="utf-8")
    return path


def _make_repo(tmp_path: Path) -> Path:
    modonome = tmp_path / ".modonome"
    modonome.mkdir(parents=True, exist_ok=True)
    (modonome / "config.yaml").write_text("", encoding="utf-8")
    (tmp_path / "notes.txt").write_text("", encoding="utf-8")
    return tmp_path


def _make_items_dir(repo: Path) -> Path:
    items_dir = repo / ".modonome" / "work-items"
    items_dir.mkdir(parents=True, exist_ok=True)
    return items_dir


def _write_registry(tmp_path: Path, repos: list[dict], max_concurrent: int = 1) -> Path:
    content = {
        "gateway": {"base_url": "http://localhost:8080/v1", "api_key": "k"},
        "defaults": {"max_concurrent": max_concurrent, "roles": ["developer", "tester"]},
        "common_workers": {
            "maker": {"id": "qwen2.5-coder-32b", "family": "qwen", "mode": "openai"},
            "checker": {"id": "claude-cli", "family": "claude", "mode": "claude_cli"},
        },
        "repos": repos,
    }
    reg_file = tmp_path / "registry.yaml"
    reg_file.write_text(yaml.dump(content), encoding="utf-8")
    return reg_file


# ---------------------------------------------------------------------------
# queued_tier1_items
# ---------------------------------------------------------------------------


class TestQueuedTier1Items:
    def test_returns_only_queued_non_protected(self, tmp_path):
        repo = _make_repo(tmp_path)
        items_dir = _make_items_dir(repo)

        # queued, non-protected -> should be included
        _write_work_item(items_dir, "item-queued", "queued", touches_protected=False)
        # making -> should be excluded
        _write_work_item(items_dir, "item-making", "making")
        # queued but protected -> should be excluded
        _write_work_item(items_dir, "item-protected", "queued", touches_protected=True)
        # merge_ready -> excluded
        _write_work_item(items_dir, "item-done", "merge_ready")

        from fleet_runner.scheduler import queued_tier1_items

        result = queued_tier1_items(repo)
        names = {p.stem for p in result}
        assert "item-queued" in names
        assert "item-making" not in names
        assert "item-protected" not in names
        assert "item-done" not in names

    def test_returns_empty_list_when_no_work_items_dir(self, tmp_path):
        repo = _make_repo(tmp_path)
        # no .modonome/work-items directory

        from fleet_runner.scheduler import queued_tier1_items

        result = queued_tier1_items(repo)
        assert result == []

    def test_returns_empty_list_when_items_dir_is_empty(self, tmp_path):
        repo = _make_repo(tmp_path)
        _make_items_dir(repo)

        from fleet_runner.scheduler import queued_tier1_items

        result = queued_tier1_items(repo)
        assert result == []

    def test_returns_paths_sorted_oldest_first(self, tmp_path):
        """Items are returned in alphabetical/glob order (oldest by name)."""
        repo = _make_repo(tmp_path)
        items_dir = _make_items_dir(repo)

        # Write items with names that sort deterministically
        _write_work_item(items_dir, "item-aaa", "queued")
        _write_work_item(items_dir, "item-bbb", "queued")
        _write_work_item(items_dir, "item-ccc", "queued")

        from fleet_runner.scheduler import queued_tier1_items

        result = queued_tier1_items(repo)
        assert len(result) == 3
        stems = [p.stem for p in result]
        assert stems == sorted(stems)

    def test_returns_path_objects(self, tmp_path):
        repo = _make_repo(tmp_path)
        items_dir = _make_items_dir(repo)
        _write_work_item(items_dir, "item-001", "queued")

        from fleet_runner.scheduler import queued_tier1_items

        result = queued_tier1_items(repo)
        assert len(result) == 1
        assert isinstance(result[0], Path)

    def test_skips_malformed_json_files(self, tmp_path):
        repo = _make_repo(tmp_path)
        items_dir = _make_items_dir(repo)
        _write_work_item(items_dir, "item-good", "queued")
        (items_dir / "bad.json").write_text("not valid json{{{{", encoding="utf-8")

        from fleet_runner.scheduler import queued_tier1_items

        result = queued_tier1_items(repo)
        names = {p.stem for p in result}
        assert "item-good" in names
        assert "bad" not in names

    def test_multiple_queued_all_returned(self, tmp_path):
        repo = _make_repo(tmp_path)
        items_dir = _make_items_dir(repo)
        for i in range(5):
            _write_work_item(items_dir, f"item-{i:03d}", "queued")

        from fleet_runner.scheduler import queued_tier1_items

        result = queued_tier1_items(repo)
        assert len(result) == 5


# ---------------------------------------------------------------------------
# run_registry dispatching
# ---------------------------------------------------------------------------


class TestRunRegistry:
    def _stub_run_work_item(self, calls: list) -> callable:
        def stub(repo_root, item_path, cfg, *, run_id, dry_run=False, **kw):
            calls.append(
                {
                    "repo_root": str(repo_root),
                    "item_path": str(item_path),
                    "run_id": run_id,
                    "dry_run": dry_run,
                }
            )
            return {"status": "merge_ready"}

        return stub

    def test_dispatches_to_registered_repo(self, tmp_path, monkeypatch):
        repo = _make_repo(tmp_path / "repo-a")
        items_dir = _make_items_dir(repo)
        _write_work_item(items_dir, "item-001", "queued")

        reg_file = _write_registry(
            tmp_path,
            [
                {"alias": "repo-a", "path": str(repo)},
            ],
        )

        calls = []
        monkeypatch.setattr("fleet_runner.scheduler.run_work_item", self._stub_run_work_item(calls))

        from fleet_runner.scheduler import run_registry

        run_registry(reg_file, "run-test-1")
        assert len(calls) == 1
        assert "item-001.json" in calls[0]["item_path"]

    def test_idle_when_no_queued_items(self, tmp_path, monkeypatch):
        repo = _make_repo(tmp_path / "repo-empty")
        _make_items_dir(repo)
        # no work items written

        reg_file = _write_registry(
            tmp_path,
            [
                {"alias": "repo-empty", "path": str(repo)},
            ],
        )

        calls = []
        monkeypatch.setattr("fleet_runner.scheduler.run_work_item", self._stub_run_work_item(calls))

        from fleet_runner.scheduler import run_registry

        results = run_registry(reg_file, "run-test-2")
        assert len(calls) == 0
        assert any(r.get("status") == "idle" for r in results)

    def test_respects_max_concurrent(self, tmp_path, monkeypatch):
        """With max_concurrent=1, only one repo's item should be dispatched."""
        repo_a = _make_repo(tmp_path / "repo-a")
        items_a = _make_items_dir(repo_a)
        _write_work_item(items_a, "item-a1", "queued")

        repo_b = _make_repo(tmp_path / "repo-b")
        items_b = _make_items_dir(repo_b)
        _write_work_item(items_b, "item-b1", "queued")

        reg_file = _write_registry(
            tmp_path,
            [
                {"alias": "repo-a", "path": str(repo_a), "priority": 1},
                {"alias": "repo-b", "path": str(repo_b), "priority": 0},
            ],
            max_concurrent=1,
        )

        calls = []
        monkeypatch.setattr("fleet_runner.scheduler.run_work_item", self._stub_run_work_item(calls))

        from fleet_runner.scheduler import run_registry

        results = run_registry(reg_file, "run-concurrent-test")
        # Only one item dispatched (first repo wins by priority)
        assert len(calls) == 1
        # Second repo should be deferred
        deferred = [r for r in results if r.get("status") == "deferred"]
        assert len(deferred) == 1

    def test_priority_ordering(self, tmp_path, monkeypatch):
        """Higher-priority repo is dispatched first."""
        repo_low = _make_repo(tmp_path / "repo-low")
        items_low = _make_items_dir(repo_low)
        _write_work_item(items_low, "item-low", "queued")

        repo_high = _make_repo(tmp_path / "repo-high")
        items_high = _make_items_dir(repo_high)
        _write_work_item(items_high, "item-high", "queued")

        reg_file = _write_registry(
            tmp_path,
            [
                {"alias": "repo-low", "path": str(repo_low), "priority": 0},
                {"alias": "repo-high", "path": str(repo_high), "priority": 10},
            ],
            max_concurrent=1,
        )

        calls = []
        monkeypatch.setattr("fleet_runner.scheduler.run_work_item", self._stub_run_work_item(calls))

        from fleet_runner.scheduler import run_registry

        run_registry(reg_file, "run-priority-test")
        assert len(calls) == 1
        # The high-priority repo's item should have been dispatched
        assert "item-high" in calls[0]["item_path"]

    def test_dry_run_propagated_to_run_work_item(self, tmp_path, monkeypatch):
        repo = _make_repo(tmp_path / "repo-a")
        items_dir = _make_items_dir(repo)
        _write_work_item(items_dir, "item-001", "queued")

        reg_file = _write_registry(
            tmp_path,
            [
                {"alias": "repo-a", "path": str(repo)},
            ],
        )

        calls = []
        monkeypatch.setattr("fleet_runner.scheduler.run_work_item", self._stub_run_work_item(calls))

        from fleet_runner.scheduler import run_registry

        run_registry(reg_file, "run-dry-test", dry_run=True)
        assert calls[0]["dry_run"] is True

    def test_results_include_alias(self, tmp_path, monkeypatch):
        repo = _make_repo(tmp_path / "my-repo")
        items_dir = _make_items_dir(repo)
        _write_work_item(items_dir, "item-001", "queued")

        reg_file = _write_registry(
            tmp_path,
            [
                {"alias": "my-repo", "path": str(repo)},
            ],
        )

        monkeypatch.setattr("fleet_runner.scheduler.run_work_item", self._stub_run_work_item([]))

        from fleet_runner.scheduler import run_registry

        results = run_registry(reg_file, "run-alias-test")
        assert any(r.get("alias") == "my-repo" for r in results)

    def test_returns_list(self, tmp_path, monkeypatch):
        reg_file = _write_registry(tmp_path, [])

        monkeypatch.setattr("fleet_runner.scheduler.run_work_item", self._stub_run_work_item([]))

        from fleet_runner.scheduler import run_registry

        results = run_registry(reg_file, "run-empty-registry")
        assert isinstance(results, list)
