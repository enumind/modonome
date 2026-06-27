"""Tests for fleet_runner.registry: load_registry, Registry.fleet_config, repo_root."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from fleet_runner.config import FleetConfig
from fleet_runner.registry import Registry, load_registry

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _write_registry(tmp_path: Path, content: dict) -> Path:
    reg_file = tmp_path / "registry.yaml"
    reg_file.write_text(yaml.dump(content), encoding="utf-8")
    return reg_file


# ---------------------------------------------------------------------------
# load_registry
# ---------------------------------------------------------------------------


class TestLoadRegistry:
    def _minimal_registry(self, tmp_path: Path) -> Path:
        content = {
            "gateway": {
                "base_url": "http://localhost:8080/v1",
                "api_key": "test-key",
            },
            "defaults": {
                "max_concurrent": 2,
                "roles": ["developer", "tester"],
            },
            "common_workers": {
                "maker": {"id": "qwen-coder", "family": "qwen", "mode": "openai"},
                "checker": {"id": "claude-cli", "family": "claude", "mode": "claude_cli"},
            },
            "repos": [
                {"alias": "repo-a", "path": "repos/repo-a", "priority": 1},
                {"alias": "repo-b", "path": "repos/repo-b", "priority": 0},
            ],
        }
        return _write_registry(tmp_path, content)

    def test_loads_gateway_url(self, tmp_path):
        reg_file = self._minimal_registry(tmp_path)
        reg = load_registry(reg_file)
        assert reg.gateway_url == "http://localhost:8080/v1"

    def test_loads_gateway_api_key(self, tmp_path):
        reg_file = self._minimal_registry(tmp_path)
        reg = load_registry(reg_file)
        assert reg.gateway_api_key == "test-key"

    def test_loads_common_maker(self, tmp_path):
        reg_file = self._minimal_registry(tmp_path)
        reg = load_registry(reg_file)
        assert reg.common_maker.id == "qwen-coder"
        assert reg.common_maker.family == "qwen"

    def test_loads_common_checker(self, tmp_path):
        reg_file = self._minimal_registry(tmp_path)
        reg = load_registry(reg_file)
        assert reg.common_checker.id == "claude-cli"
        assert reg.common_checker.family == "claude"

    def test_loads_max_concurrent_from_defaults(self, tmp_path):
        reg_file = self._minimal_registry(tmp_path)
        reg = load_registry(reg_file)
        assert reg.max_concurrent == 2

    def test_loads_repos_list(self, tmp_path):
        reg_file = self._minimal_registry(tmp_path)
        reg = load_registry(reg_file)
        assert len(reg.fleets) == 2
        aliases = {f.alias for f in reg.fleets}
        assert "repo-a" in aliases
        assert "repo-b" in aliases

    def test_repo_priority_loaded(self, tmp_path):
        reg_file = self._minimal_registry(tmp_path)
        reg = load_registry(reg_file)
        fleet_a = next(f for f in reg.fleets if f.alias == "repo-a")
        assert fleet_a.priority == 1

    def test_default_roles_applied_to_repos_without_explicit_roles(self, tmp_path):
        reg_file = self._minimal_registry(tmp_path)
        reg = load_registry(reg_file)
        fleet_a = next(f for f in reg.fleets if f.alias == "repo-a")
        assert "developer" in fleet_a.roles
        assert "tester" in fleet_a.roles

    def test_registry_dir_is_parent_of_registry_file(self, tmp_path):
        reg_file = self._minimal_registry(tmp_path)
        reg = load_registry(reg_file)
        assert reg.registry_dir == tmp_path

    def test_default_max_concurrent_when_absent(self, tmp_path):
        content = {
            "repos": [{"alias": "r", "path": "r"}],
        }
        reg_file = _write_registry(tmp_path, content)
        reg = load_registry(reg_file)
        assert reg.max_concurrent == 1

    def test_per_repo_maker_override_loaded(self, tmp_path):
        content = {
            "common_workers": {
                "maker": {"id": "common-maker", "family": "qwen", "mode": "openai"},
                "checker": {"id": "common-checker", "family": "claude", "mode": "claude_cli"},
            },
            "repos": [
                {
                    "alias": "special",
                    "path": "repos/special",
                    "maker": {"id": "specialist-model", "family": "llama", "mode": "openai"},
                },
            ],
        }
        reg_file = _write_registry(tmp_path, content)
        reg = load_registry(reg_file)
        fleet = next(f for f in reg.fleets if f.alias == "special")
        assert fleet.maker_override is not None
        assert fleet.maker_override.id == "specialist-model"
        assert fleet.checker_override is None


# ---------------------------------------------------------------------------
# Registry.fleet_config()
# ---------------------------------------------------------------------------


class TestRegistryFleetConfig:
    def _make_registry(self, tmp_path: Path) -> Registry:
        content = {
            "gateway": {"base_url": "http://gw:8080/v1", "api_key": "gw-key"},
            "common_workers": {
                "maker": {"id": "common-maker", "family": "qwen", "mode": "openai"},
                "checker": {"id": "common-checker", "family": "claude", "mode": "claude_cli"},
            },
            "repos": [
                {"alias": "basic", "path": "repos/basic"},
                {
                    "alias": "with-override",
                    "path": "repos/with-override",
                    "maker": {"id": "specialist", "family": "llama", "mode": "openai"},
                },
            ],
        }
        reg_file = _write_registry(tmp_path, content)
        return load_registry(reg_file)

    def test_returns_fleet_config_type(self, tmp_path):
        reg = self._make_registry(tmp_path)
        cfg = reg.fleet_config("basic")
        assert isinstance(cfg, FleetConfig)

    def test_common_workers_used_when_no_override(self, tmp_path):
        reg = self._make_registry(tmp_path)
        cfg = reg.fleet_config("basic")
        assert cfg.maker.id == "common-maker"
        assert cfg.checker.id == "common-checker"

    def test_gateway_url_propagated(self, tmp_path):
        reg = self._make_registry(tmp_path)
        cfg = reg.fleet_config("basic")
        assert cfg.gateway_url == "http://gw:8080/v1"
        assert cfg.gateway_api_key == "gw-key"

    def test_maker_override_applied(self, tmp_path):
        reg = self._make_registry(tmp_path)
        cfg = reg.fleet_config("with-override")
        assert cfg.maker.id == "specialist"
        assert cfg.maker.family == "llama"

    def test_checker_unchanged_when_only_maker_overridden(self, tmp_path):
        reg = self._make_registry(tmp_path)
        cfg = reg.fleet_config("with-override")
        assert cfg.checker.id == "common-checker"

    def test_unknown_alias_raises_key_error(self, tmp_path):
        reg = self._make_registry(tmp_path)
        with pytest.raises(KeyError, match="no fleet registered"):
            reg.fleet_config("does-not-exist")


# ---------------------------------------------------------------------------
# Registry.repo_root()
# ---------------------------------------------------------------------------


class TestRegistryRepoRoot:
    def test_relative_path_resolved_relative_to_registry_dir(self, tmp_path):
        content = {
            "repos": [{"alias": "myrepo", "path": "repos/myrepo"}],
        }
        reg_file = _write_registry(tmp_path, content)
        reg = load_registry(reg_file)
        root = reg.repo_root("myrepo")
        assert root == (tmp_path / "repos" / "myrepo").resolve()

    def test_absolute_path_returned_as_is(self, tmp_path):
        abs_path = str(tmp_path / "absolute_repo")
        content = {
            "repos": [{"alias": "abs-repo", "path": abs_path}],
        }
        reg_file = _write_registry(tmp_path, content)
        reg = load_registry(reg_file)
        root = reg.repo_root("abs-repo")
        assert root == Path(abs_path)

    def test_unknown_alias_raises_key_error(self, tmp_path):
        content = {"repos": [{"alias": "r", "path": "r"}]}
        reg_file = _write_registry(tmp_path, content)
        reg = load_registry(reg_file)
        with pytest.raises(KeyError, match="no fleet registered"):
            reg.repo_root("unknown")
