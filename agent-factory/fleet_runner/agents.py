"""CrewAI maker agent: turn a work packet into scoped file edits.

The maker proposes new full contents for files inside the allowed_edit_set. The crew
(crew.py) applies them, then runs the ratchet and gates. This structured-edit shape is
deterministic and safe for a local model: the model never gets shell or unscoped file
access, and the runner enforces the edit fence.
"""

from __future__ import annotations

from .config import FleetConfig
from .util import extract_json


def build_maker_prompt(brief: str, packet: dict, current_files: dict[str, str]) -> str:
    files_block = (
        "\n\n".join(f"### FILE: {path}\n```\n{content}\n```" for path, content in current_files.items())
        or "(the allowed files do not exist yet; create them)"
    )
    allowed = "\n".join(f"- {p}" for p in packet.get("allowed_edit_set", []))
    return f"""{brief}

# Work packet
- goal: {packet.get("goal") or packet.get("title") or packet.get("id")}
- why_now: {packet.get("why_now", "see work item")}
- fence (what proves done): {packet.get("fence") or packet.get("gates")}
- constraints: do not touch protected paths; do not weaken tests or types; keep the
  diff small; change only the files listed below.

# Files you may edit (allowed_edit_set)
{allowed or "(none declared)"}

# Current contents
{files_block}

# Output format
Return ONLY a JSON object mapping each file path you changed to its complete new
contents, for example:
{{"path/to/file": "full new file contents"}}
Do not include any path outside the allowed_edit_set. Do not add commentary.
"""


def run_maker(cfg: FleetConfig, brief: str, packet: dict, current_files: dict[str, str]) -> dict[str, str]:
    """Run the maker crew and return the proposed {path: content} edits."""
    from crewai import Agent, Crew, Process, Task

    from .llms import make_maker_llm

    agent = Agent(
        role="developer (maker)",
        goal="Implement the work item's fence with the smallest scoped change.",
        backstory=brief,
        llm=make_maker_llm(cfg),
        allow_delegation=False,
        verbose=False,
    )
    task = Task(
        description=build_maker_prompt(brief, packet, current_files),
        expected_output="A JSON object mapping each edited file path to its full new contents.",
        agent=agent,
    )
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    result = crew.kickoff()
    edits = extract_json(str(result))
    if not isinstance(edits, dict):
        raise ValueError("maker did not return a path->content object")
    return {str(k): str(v) for k, v in edits.items()}


def build_checker_prompt(brief: str, diff_text: str, rationale: str, gate_summary: str) -> str:
    return f"""{brief}

The deterministic gates have already run and are the authority. Their result:
{gate_summary}

Maker rationale:
{rationale}

Diff under review:
```diff
{diff_text}
```

Return ONLY a JSON object:
{{"requested_changes": true|false, "questions_raised": <integer>, "summary": "<one paragraph>"}}
Request changes only with a concrete, gate-grounded reason. A persuasive rationale is
not a verdict.
"""


def parse_checker_verdict(text: str) -> dict:
    verdict = extract_json(text)
    return {
        "requested_changes": bool(verdict.get("requested_changes", False)),
        "questions_raised": int(verdict.get("questions_raised", 0) or 0),
        "summary": str(verdict.get("summary", "")).strip(),
    }
