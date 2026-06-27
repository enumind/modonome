"""Self-organizing fleet registry: per-repo fleets sharing a common worker pool.

The fleet repo maintains one engine and many bindings. Common workers (the local maker
model and the claude-CLI checker) are repo-agnostic and shared; each managed repo is a
binding that reuses those workers and may override one if it needs a specialist. This
keeps one shared local model serving many repos rather than a model per repo.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .config import FleetConfig, ModelSpec


@dataclass
class RepoFleet:
    alias: str
    path: str  # relative to the registry file, or absolute
    roles: list[str] = field(default_factory=lambda: ["developer", "tester"])
    priority: int = 0  # higher runs first
    maker_override: ModelSpec | None = None
    checker_override: ModelSpec | None = None


@dataclass
class Registry:
    registry_dir: Path
    gateway_url: str
    gateway_api_key: str
    common_maker: ModelSpec
    common_checker: ModelSpec
    max_concurrent: int
    fleets: list[RepoFleet]

    def fleet_config(self, alias: str) -> FleetConfig:
        """Resolve a repo's effective config: common workers plus any override."""
        fleet = next((f for f in self.fleets if f.alias == alias), None)
        if fleet is None:
            raise KeyError(f"no fleet registered with alias '{alias}'")
        return FleetConfig(
            gateway_url=self.gateway_url,
            gateway_api_key=self.gateway_api_key,
            maker=fleet.maker_override or self.common_maker,
            checker=fleet.checker_override or self.common_checker,
        )

    def repo_root(self, alias: str) -> Path:
        fleet = next((f for f in self.fleets if f.alias == alias), None)
        if fleet is None:
            raise KeyError(f"no fleet registered with alias '{alias}'")
        p = Path(fleet.path)
        return p if p.is_absolute() else (self.registry_dir / p).resolve()


def _spec(d: dict | None, default: ModelSpec) -> ModelSpec:
    if not d:
        return default
    return ModelSpec(
        id=d.get("id", default.id),
        family=d.get("family", default.family),
        mode=d.get("mode", default.mode),
        max_turns=d.get("max_turns", default.max_turns),
        cli_path=d.get("cli_path", default.cli_path),
    )


def load_registry(path: str | Path) -> Registry:
    path = Path(path)
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    base = FleetConfig()  # built-in defaults
    gw = raw.get("gateway", {})
    cw = raw.get("common_workers", {})
    defaults = raw.get("defaults", {})

    common_maker = _spec(cw.get("maker"), base.maker)
    common_checker = _spec(cw.get("checker"), base.checker)
    default_roles = defaults.get("roles", ["developer", "tester"])

    fleets = []
    for entry in raw.get("repos", []):
        fleets.append(
            RepoFleet(
                alias=entry["alias"],
                path=entry["path"],
                roles=entry.get("roles", default_roles),
                priority=entry.get("priority", 0),
                maker_override=_spec(entry.get("maker"), common_maker) if entry.get("maker") else None,
                checker_override=_spec(entry.get("checker"), common_checker)
                if entry.get("checker")
                else None,
            )
        )

    return Registry(
        registry_dir=path.parent,
        gateway_url=gw.get("base_url", base.gateway_url),
        gateway_api_key=gw.get("api_key", base.gateway_api_key),
        common_maker=common_maker,
        common_checker=common_checker,
        max_concurrent=defaults.get("max_concurrent", 1),
        fleets=fleets,
    )
