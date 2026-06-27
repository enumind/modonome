"""Small helpers shared across the runner: robust JSON extraction and identities."""

from __future__ import annotations

import json
import re


def extract_json(text: str) -> dict:
    """Parse a JSON object from model output, tolerating prose wrapping and fences.

    Local models often wrap JSON in commentary or ```json fences. The guardrails
    require parsing and validating model JSON before acting on it, so this never
    trusts the raw string blindly: it finds the outermost balanced object and
    decodes that.
    """
    if text is None:
        raise ValueError("no text to parse")
    stripped = text.strip()

    # Fast path: the whole string is JSON.
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # Strip a ```json ... ``` fence if present.
    fence = re.search(r"```(?:json)?\s*(.*?)```", stripped, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Fall back to the first balanced {...} block.
    start = stripped.find("{")
    if start != -1:
        depth = 0
        for i in range(start, len(stripped)):
            ch = stripped[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = stripped[start : i + 1]
                    return json.loads(candidate)
    raise ValueError("no JSON object found in text")


def maker_identity(run_id: str, model: str) -> str:
    return f"maker:fleet:{run_id}:{model}"


def checker_identity(run_id: str, model: str) -> str:
    return f"checker:fleet:{run_id}:{model}"
