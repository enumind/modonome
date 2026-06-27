# Learnings

Durable lessons from wiring the factory to modonome. Each: the signal, the lesson, and
where it is encoded so it is not relearned.

## L1: modonome already exposes a clean drive interface
- Signal: `scripts/agent/run-cycle.mjs` invokes a pluggable CLI (`runners.<runner>.cli_path`)
  with `--model/--max-turns/-p`, and `scripts/transition-work-item.mjs` is a lease-aware
  compare-and-swap.
- Lesson: the factory can drive modonome through existing scripts; no fork of the engine.
- Encoded in: `fleet_runner/tools.py`.

## L2: Local provider models bypass the remote budget block
- Signal: `run-cycle.mjs` refuses hosted models when `remote_model_budget_usd_per_day`
  is 0, but `provider: local` passes.
- Lesson: a local maker is zero-charge by construction; keep the checker off the metered
  path too (claude CLI subscription).
- Encoded in: `fleet_runner/llms.py` (`ClaudeCliLLM.assert_no_metered_key`).

## L3: config roles are a fixed set; models are open
- Signal: `schemas/config.schema.json` locks `roles` to maker/checker/dogfood
  (`additionalProperties: false`) but allows new `models.*`.
- Lesson: the ten logical roles map onto the three cost slots; do not try to add role
  names to a target repo's config. The factory carries roles itself (from briefs).

## L4: the ratchet treats Python as first-class
- Signal: `guard-ratchet.mjs` and AgentProof `ap-16` cover `test_*.py`, `@pytest.mark.skip`,
  and `pyproject.toml` `fail_under`.
- Lesson: name fleet tests `test_*.py` so any future in-repo gate protects them; keep
  coverage thresholds intact.

## L5: the factory's own files should not perturb a target repo's gates
- Signal: modonome's `check-style.mjs` scans `.md`, `.yaml`, `.json`, `.txt` (not `.py`).
- Lesson: keep the factory out of modonome (D1); when editing a target repo, stay in the
  `allowed_edit_set` and respect its house style.

## L6: subagents can misread their mode
- Signal: a delegated worker refused, claiming plan mode when none applied.
- Lesson: give delegated file-writing tasks exact content and verify the files on disk
  afterward rather than trusting the worker's self-report.
