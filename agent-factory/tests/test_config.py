"""Tests for fleet_runner.config: FleetConfig, read_target_caps."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from fleet_runner.config import FleetConfig, ModelSpec, read_target_caps

# ---------------------------------------------------------------------------
# FleetConfig.load()
# ---------------------------------------------------------------------------


class TestFleetConfigLoad:
    def _write_config(self, tmp_path: Path, content: dict) -> Path:
        cfg_file = tmp_path / "fleet.config.yaml"
        cfg_file.write_text(yaml.dump(content), encoding="utf-8")
        return cfg_file

    def test_load_gateway_and_models(self, tmp_path):
        cfg_data = {
            "gateway": {
                "base_url": "http://localhost:9090/v1",
                "api_key": "my-key",
            },
            "models": {
                "maker": {
                    "id": "codellama-7b",
                    "family": "codellama",
                    "mode": "openai",
                    "max_turns": 20,
                },
                "checker": {
                    "id": "claude-sonnet",
                    "family": "claude",
                    "mode": "claude_cli",
                },
            },
        }
        cfg_file = self._write_config(tmp_path, cfg_data)
        cfg = FleetConfig.load(cfg_file)
        assert cfg.gateway_url == "http://localhost:9090/v1"
        assert cfg.gateway_api_key == "my-key"
        assert cfg.maker.id == "codellama-7b"
        assert cfg.maker.family == "codellama"
        assert cfg.maker.max_turns == 20
        assert cfg.checker.id == "claude-sonnet"
        assert cfg.checker.family == "claude"
        assert cfg.checker.mode == "claude_cli"

    def test_load_missing_file_returns_defaults(self, tmp_path):
        cfg = FleetConfig.load(tmp_path / "nonexistent.yaml")
        assert cfg.gateway_url == "http://localhost:8080/v1"
        assert cfg.maker.id == "qwen2.5-coder-32b"
        assert cfg.checker.id == "claude-cli"

    def test_load_partial_config_uses_defaults_for_missing_keys(self, tmp_path):
        cfg_data = {
            "gateway": {"base_url": "http://custom:1234/v1"},
            "models": {
                "maker": {"id": "custom-model", "family": "custom"},
            },
        }
        cfg_file = self._write_config(tmp_path, cfg_data)
        cfg = FleetConfig.load(cfg_file)
        assert cfg.gateway_url == "http://custom:1234/v1"
        assert cfg.maker.id == "custom-model"
        # checker should fall back to default
        assert cfg.checker.id == "claude-cli"

    def test_load_empty_yaml_returns_defaults(self, tmp_path):
        cfg_file = tmp_path / "fleet.config.yaml"
        cfg_file.write_text("", encoding="utf-8")
        cfg = FleetConfig.load(cfg_file)
        assert cfg.gateway_url == "http://localhost:8080/v1"

    def test_load_none_path_falls_back_to_defaults_when_file_absent(self):
        # DEFAULT_FLEET_CONFIG ('fleet.config.yaml') likely doesn't exist in CWD during tests
        # so load() should return defaults
        import os

        orig = os.getcwd()
        try:
            # use a tmp dir guaranteed to have no fleet.config.yaml
            import tempfile

            with tempfile.TemporaryDirectory() as td:
                os.chdir(td)
                cfg = FleetConfig.load(None)
                assert cfg.gateway_url == "http://localhost:8080/v1"
        finally:
            os.chdir(orig)


# ---------------------------------------------------------------------------
# FleetConfig.assert_distinct_families()
# ---------------------------------------------------------------------------


class TestFleetConfigAssertDistinctFamilies:
    def test_distinct_families_passes(self):
        cfg = FleetConfig(
            maker=ModelSpec("model-a", "qwen"),
            checker=ModelSpec("model-b", "claude"),
        )
        # should not raise
        cfg.assert_distinct_families()

    def test_same_family_raises_value_error(self):
        cfg = FleetConfig(
            maker=ModelSpec("model-a", "qwen"),
            checker=ModelSpec("model-b", "qwen"),
        )
        with pytest.raises(ValueError, match="share model family"):
            cfg.assert_distinct_families()

    def test_same_id_raises_value_error(self):
        cfg = FleetConfig(
            maker=ModelSpec("same-model", "qwen"),
            checker=ModelSpec("same-model", "claude"),
        )
        with pytest.raises(ValueError, match="same model id"):
            cfg.assert_distinct_families()

    def test_default_config_passes_distinct_check(self):
        cfg = FleetConfig()
        # default: maker=qwen family, checker=claude family
        cfg.assert_distinct_families()

    def test_both_same_family_and_id_raises(self):
        cfg = FleetConfig(
            maker=ModelSpec("duplicate", "same"),
            checker=ModelSpec("duplicate", "same"),
        )
        # family check fires first
        with pytest.raises(ValueError):
            cfg.assert_distinct_families()


# ---------------------------------------------------------------------------
# read_target_caps()
# ---------------------------------------------------------------------------


class TestReadTargetCaps:
    def _write_caps(self, tmp_path: Path, content: dict) -> Path:
        modonome = tmp_path / ".modonome"
        modonome.mkdir(parents=True)
        cfg_file = modonome / "config.yaml"
        cfg_file.write_text(yaml.dump(content), encoding="utf-8")
        return tmp_path

    def test_reads_values_from_config(self, tmp_path):
        repo = self._write_caps(
            tmp_path,
            {
                "max_diff_lines": 200,
                "max_attempts_per_item": 5,
                "lease_minutes": 30,
                "remote_model_budget_usd_per_day": 1,
                "local_model_only_by_default": False,
            },
        )
        caps = read_target_caps(repo)
        assert caps["max_diff_lines"] == 200
        assert caps["max_attempts_per_item"] == 5
        assert caps["lease_minutes"] == 30
        assert caps["remote_model_budget_usd_per_day"] == 1
        assert caps["local_model_only_by_default"] is False

    def test_falls_back_to_defaults_when_file_absent(self, tmp_path):
        caps = read_target_caps(tmp_path)
        assert caps["max_diff_lines"] == 400
        assert caps["max_attempts_per_item"] == 3
        assert caps["lease_minutes"] == 60
        assert caps["remote_model_budget_usd_per_day"] == 0
        assert caps["local_model_only_by_default"] is True

    def test_partial_config_uses_defaults_for_missing_keys(self, tmp_path):
        repo = self._write_caps(tmp_path, {"max_diff_lines": 100})
        caps = read_target_caps(repo)
        assert caps["max_diff_lines"] == 100
        # other keys fall back to defaults
        assert caps["max_attempts_per_item"] == 3
        assert caps["lease_minutes"] == 60

    def test_returns_dict_with_all_default_keys(self, tmp_path):
        caps = read_target_caps(tmp_path)
        required_keys = {
            "max_diff_lines",
            "max_attempts_per_item",
            "lease_minutes",
            "remote_model_budget_usd_per_day",
            "local_model_only_by_default",
        }
        assert required_keys.issubset(caps.keys())

    def test_empty_config_yaml_uses_all_defaults(self, tmp_path):
        modonome = tmp_path / ".modonome"
        modonome.mkdir()
        (modonome / "config.yaml").write_text("", encoding="utf-8")
        caps = read_target_caps(tmp_path)
        assert caps["max_diff_lines"] == 400
