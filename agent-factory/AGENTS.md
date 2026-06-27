# Working on agent-factory

Read `DECISIONS.md`, `LEARNINGS.md`, and `STATUS.md` before changing anything, and write
progress back to them. This repo applies to itself the same discipline modonome applies
to a governed repo: durable context over session memory.

## Invariants
- modonome stays the source of truth for governance. Do not reimplement gates, the
  ratchet, validation, transitions, or metrics here; shell out to a target repo's Node
  scripts (see `fleet_runner/tools.py`).
- Keep modonome and any target repo clean. When the factory edits a target, stay inside
  the work item's `allowed_edit_set`, respect protected paths, and never weaken tests.
- Zero metered API. The maker runs on a local model via the gateway; the checker runs on
  the `claude` CLI subscription with `ANTHROPIC_API_KEY` unset. Do not add a metered path.
- Maker and checker run different model families. Do not collapse them.
- No autonomous merge until a separate merge-authority role exists. Park at `merge_ready`.

## Development
- Tests run offline without crewai or a live model: `PYTHONPATH=. pytest -q`.
- Lint and format with ruff: `ruff check . && ruff format .`.
- crewai and langchain-openai are imported lazily inside functions so the suite and most
  tooling do not need the heavy stack installed.
- Name tests `test_*.py` so a future in-repo ratchet protects them.

## How the pieces fit
- `gateway/` serves local models with a concurrency cap (shared infra).
- `fleet_runner/registry.py` binds repos to common workers; `scheduler.py` dispatches
  across repos; `crew.py` runs one item; `run_one.py` is the single-item CLI.
- Personas come from each target repo's `.claude/agents/roles/*.md`, not from here.
