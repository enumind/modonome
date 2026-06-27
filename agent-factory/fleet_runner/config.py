"""Fleet configuration and reading a target repo's modonome caps.

The fleet keeps its own model wiring (gateway URL, which local model is the maker,
which model is the checker) separate from any target repo, so it never has to edit a
governed repo's .modonome/config.yaml. Per-item caps (diff size, attempts, lease) are
read from the target repo, because the target repo owns its own governance.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

DEFAULT_FLEET_CONFIG = "fleet.config.yaml"


@dataclass
class ModelSpec:
    id: str
    family: str
    mode: str = "openai"  # "openai" (gateway / LM Studio) or "claude_cli" (subscription)
    max_turns: int = 40
    cli_path: str = "claude"


@dataclass
class FleetConfig:
    gateway_url: str = "http://localhost:8080/v1"
    gateway_api_key: str = "lm-studio"  # any non-empty string; the local endpoint ignores it
    maker: ModelSpec = field(default_factory=lambda: ModelSpec("qwen2.5-coder-32b", "qwen", "openai"))
    checker: ModelSpec = field(default_factory=lambda: ModelSpec("claude-cli", "claude", "claude_cli"))

    @classmethod
    def load(cls, path: str | Path | None = None) -> FleetConfig:
        if path is None:
            path = DEFAULT_FLEET_CONFIG
        p = Path(path)
        if not p.exists():
            return cls()
        raw = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
        gw = raw.get("gateway", {})
        models = raw.get("models", {})

        def spec(key: str, default: ModelSpec) -> ModelSpec:
            m = models.get(key)
            if not m:
                return default
            return ModelSpec(
                id=m.get("id", default.id),
                family=m.get("family", default.family),
                mode=m.get("mode", default.mode),
                max_turns=m.get("max_turns", default.max_turns),
                cli_path=m.get("cli_path", default.cli_path),
            )

        base = cls()
        return cls(
            gateway_url=gw.get("base_url", base.gateway_url),
            gateway_api_key=gw.get("api_key", base.gateway_api_key),
            maker=spec("maker", base.maker),
            checker=spec("checker", base.checker),
        )

    def assert_distinct_families(self) -> None:
        """Mirror modonome's maker != checker model rule at the fleet boundary, so a
        misconfiguration fails before any model is invoked. The Node validator is the
        authority and runs again on the work item later."""
        if self.maker.family == self.checker.family:
            raise ValueError(
                f"maker and checker share model family '{self.maker.family}'. "
                "Pick a different-family checker (the claude CLI, or a non-qwen local model)."
            )
        if self.maker.id == self.checker.id:
            raise ValueError("maker and checker resolve to the same model id.")


def read_target_caps(repo_root: str | Path) -> dict:
    """Read the caps the fleet must honor from the target repo's modonome config."""
    cfg_path = Path(repo_root) / ".modonome" / "config.yaml"
    defaults = {
        "max_diff_lines": 400,
        "max_attempts_per_item": 3,
        "lease_minutes": 60,
        "remote_model_budget_usd_per_day": 0,
        "local_model_only_by_default": True,
    }
    if not cfg_path.exists():
        return defaults
    raw = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
    return {k: raw.get(k, v) for k, v in defaults.items()}
