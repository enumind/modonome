"""Model adapters: a local maker LLM via the gateway, and a checker via the claude CLI.

Zero metered API by construction:
- The maker runs on a local model (Qwen in LM Studio) reached through the fleet
  gateway, an OpenAI-compatible endpoint with a dummy key.
- The checker shells out to the local ``claude`` CLI in headless mode, which uses the
  owner's flat-rate subscription. ClaudeCliLLM refuses to run if ANTHROPIC_API_KEY is
  set, so a metered path is never taken silently.
"""

from __future__ import annotations

import os
import subprocess

from .config import FleetConfig, ModelSpec


def make_maker_llm(cfg: FleetConfig):
    """Build a CrewAI LLM bound to the local gateway. Imported lazily so the rest of
    the package (and the test suite) does not require crewai to be installed."""
    from crewai import LLM

    return LLM(
        model=f"openai/{cfg.maker.id}",
        base_url=cfg.gateway_url,
        api_key=cfg.gateway_api_key,
        temperature=0.1,
    )


class ClaudeCliLLM:
    """Run the local ``claude`` CLI as the checker model (flat-rate subscription).

    Used directly by the crew rather than through CrewAI's agent abstraction: the
    checker's authority is the deterministic gates, and this supplies the advisory
    critic pass at zero metered cost.
    """

    def __init__(self, spec: ModelSpec):
        self.spec = spec

    def assert_no_metered_key(self) -> None:
        if os.environ.get("ANTHROPIC_API_KEY"):
            raise RuntimeError(
                "ANTHROPIC_API_KEY is set. The checker must run on the flat-rate "
                "subscription, not a metered API call. Unset the key before going live."
            )

    def available(self) -> bool:
        try:
            subprocess.run(
                [self.spec.cli_path, "--version"],
                capture_output=True,
                text=True,
                timeout=20,
            )
            return True
        except (OSError, subprocess.SubprocessError):
            return False

    def review(self, prompt: str, timeout: int = 600) -> str:
        """Send the review prompt to claude headless and return the raw response."""
        self.assert_no_metered_key()
        proc = subprocess.run(
            [
                self.spec.cli_path,
                "--dangerously-skip-permissions",
                "--model",
                self.spec.id if self.spec.id != "claude-cli" else "sonnet",
                "--max-turns",
                str(self.spec.max_turns),
                "-p",
                prompt,
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"claude CLI failed: {(proc.stderr or proc.stdout).strip()}")
        return (proc.stdout or "").strip()
