# agent-factory

A shared CrewAI plus local-LLM substrate that drives **modonome-governed repos**. The
factory builds and maintains **fleets**: common workers (a local maker model and a
`claude`-CLI checker) are shared across repos, and each repo is a binding in a registry.
modonome owns governance per repo (gates, ratchet, work items, the maker-checker
contract); the factory owns model invocation and sequencing. No metered API, no
autonomous merge.

## Why it lives in its own repo

modonome is a clean, published governance engine ("governed autonomy for any repo").
How you *operate and evolve* many repos with agents is meta-tooling, so it stays out of
modonome to avoid convoluting it for adopters. modonome is just a target the factory
drives through its public interface (`npx modonome`, `scripts/*.mjs`), exactly like any
adopter repo. The factory reads each target repo's in-repo agent org
(`.claude/agents/roles/*.md`) as the personas it runs.

## Architecture

- `gateway/` — an OpenAI-compatible proxy in front of LM Studio. Serializes concurrent
  requests from many repos onto scarce local GPU (a global semaphore), and routes by
  model name so it can host more than one local family. Shared infra.
- `fleet_runner/` — the engine. `tools.py` shells out to a target repo's modonome
  scripts (the single source of truth for gates and state); `crew.py` runs the
  maker-then-checker loop for one work item; `agents.py`/`llms.py` build the local maker
  and the claude-CLI checker; `registry.py` binds repos to common workers;
  `scheduler.py` organizes work across repos under a global concurrency cap.
- `fleets/registry.yaml` — the self-organizing list of managed repos. Phase A registers
  modonome alone; adding a repo is config-only.

## Zero metered API by construction

- Maker runs on a local model (Qwen in LM Studio) through the gateway, a dummy key.
- Checker shells out to the local `claude` CLI on the owner's flat-rate subscription.
  `ClaudeCliLLM` refuses to run if `ANTHROPIC_API_KEY` is set, so a metered path is
  never taken silently.
- The maker and checker run different model families, satisfying modonome's
  `require_distinct_maker_checker_model` rule.

## Install

```
cd agent-factory
python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"      # full stack (crewai, langchain-openai, fastapi, ...)
# Tests run without crewai or a live model:
ruff check . && pytest -q
```

## Phase A go-live runbook (modonome on local infra)

Required clearances (all must hold before arming):

1. LM Studio serving Qwen2.5 Coder 32B (default `http://localhost:1234/v1`).
2. `claude` CLI logged into the subscription, with `ANTHROPIC_API_KEY` unset.
3. In the target repo (modonome): `node scripts/validate-config.mjs .modonome/config.yaml`
   passes and `npm run verify` is green on a clean tree.
4. A queued, Tier-1, non-protected work item exists (state `queued`,
   `touches_protected_path: false`, an `allowed_edit_set` that avoids protected paths).

Steps:

```
# 1. start the shared gateway (serializes local model use)
uvicorn gateway.app:app --port 8080

# 2. rehearse with no side effects (claims nothing, writes nothing, reverts edits)
factory-run-one --repo ../modonome --work-item ../modonome/.modonome/work-items/<id>.json \
  --run-id rehearsal-1 --dry-run

# 3. go live on one item: real branch, real gates, independent check, park at merge_ready
factory-run-one --repo ../modonome --work-item ../modonome/.modonome/work-items/<id>.json \
  --run-id live-1

# or run across all registered repos under the global concurrency cap
factory-schedule --registry fleets/registry.yaml --run-id live-1
```

The loop ends at `merge_ready`, **parked for the owner to merge**. There is no
autonomous merge until a separate merge-authority role exists (a later batch), which
preserves maker is not merger.

## Evolution surfaces (this repo keeps getting better)

- `DECISIONS.md` — architecture decisions and their rationale.
- `LEARNINGS.md` — what we learned wiring the factory to modonome.
- `STATUS.md` — what is built, live, and pending.
- `ROADMAP.md` — Phase A and Phase B.
- `AGENTS.md` — how to work on this repo.

Read these first; write progress back to them. Same discipline modonome applies to a
governed repo, applied to the factory itself.
