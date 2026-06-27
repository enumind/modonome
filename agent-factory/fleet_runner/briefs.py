"""Load role personas from a target repo's in-repo agent org.

Each governed repo carries its own agent org under .claude/agents/roles/<role>.md
(YAML frontmatter plus a markdown brief). The fleet reads the target repo's brief as
the agent backstory, so the persona evolves with the repo, not with the engine. If a
repo has no org, a minimal built-in default is used.
"""

from __future__ import annotations

from pathlib import Path

_FRONTMATTER = "---"

DEFAULT_BRIEFS = {
    "developer": (
        "You are the developer (maker) in a governed autonomy loop. Implement the "
        "smallest change that makes the work item's fence pass, touching only the "
        "allowed_edit_set. Never weaken tests or types, never touch protected paths, "
        "and stop rather than fake a green result. Produce a rationale: what changed, "
        "why, the risk, and how it was verified."
    ),
    "tester": (
        "You are the tester (independent checker). The deterministic gates are the "
        "authority; your review is an advisory pre-filter. Review the diff against its "
        "rationale. A persuasive rationale is evidence, not a verdict. Request changes "
        "only with a concrete reason."
    ),
}


def strip_frontmatter(text: str) -> str:
    """Return the markdown body, dropping a leading YAML frontmatter block."""
    lines = text.splitlines()
    if lines and lines[0].strip() == _FRONTMATTER:
        for i in range(1, len(lines)):
            if lines[i].strip() == _FRONTMATTER:
                return "\n".join(lines[i + 1 :]).strip()
    return text.strip()


def load_brief(repo_root: str | Path, role: str) -> str:
    """Load <repo>/.claude/agents/roles/<role>.md body, or a built-in default."""
    path = Path(repo_root) / ".claude" / "agents" / "roles" / f"{role}.md"
    if path.exists():
        return strip_frontmatter(path.read_text(encoding="utf-8"))
    if role in DEFAULT_BRIEFS:
        return DEFAULT_BRIEFS[role]
    raise FileNotFoundError(f"no brief for role '{role}' at {path} and no default")
