# Captured run: the two-key arming mechanism, live, at a $0 budget

This is real, verbatim tool output from a live attempt to run the maker/checker loop, not a
simulation. It answers a narrower question than "does the loop work end to end": **does the
armed path actually refuse to spend when the budget is $0, under a real armed attempt, not
just in code review?** Yes, confirmed here. It does not answer the wider question, because no
zero-cost model endpoint was reachable from the environment this was run in (see
`network-policy-check.txt`).

## What ran

1. `dry-run-plan.txt`: `node scripts/agent/run-cycle.mjs --target examples/demo-app`, unarmed,
   default state. Resolves and prints the real cycle plan (distinct maker and checker models,
   correct routing) with no model call. Reports `remoteRunAllowed: false` at the default
   `remote_model_budget_usd_per_day: 0`.
2. `armed-execute-refused.txt`: the same target, this time with the full two-key arming
   mechanism engaged for real: `.modonome/config.yaml`'s `autonomy_enabled: true` and
   `dry_run: false`, plus `MODONOME_ARMED=true` in the environment (the authoritative,
   env-only key a config file alone can never set). `remote_model_budget_usd_per_day` was left
   at `0`, unchanged. The command was `--execute`, telling the loop to actually run.
   **Result: refused, before any network call**, with
   `run-cycle failed: A hosted model is selected but remote_model_budget_usd_per_day is 0.
   Raise the budget or select a local model.` Exit code 1. No model was invoked, no tokens
   spent, no cost.

The repo's config was reverted to its safe defaults (`autonomy_enabled: false`,
`dry_run: true`) immediately after this test; it does not stay armed as a result of this run.

## Why this stops here, honestly

A live maker/checker exchange needs a reachable, non-`paid`-cost-class model endpoint
(`local` or `free` in `scripts/agent/providers.mjs`'s cost-class terms). This run was
attempted from a sandboxed session whose network egress policy allowlists only Anthropic
(the `paid` provider) and a handful of package registries. Both a free-tier option
(`models.github.ai`, GitHub Models) and a source for local model weights
(`huggingface.co`) returned a hard `403` policy denial from the proxy, not an application
error; see `network-policy-check.txt` for the exact evidence. The proxy's own documentation
is explicit that a `403` means "not allowed by your organization's egress policy... do not
retry or route around it."

## What this closes, and what it does not

- **Closed:** "does the arming mechanism actually work, under a real attempt, rather than
  only in code review or unit tests." Yes. The budget gate held under a genuinely armed,
  genuinely `--execute`d attempt.
- **Still open:** a real, live maker proposes something and an independent checker reviews
  it, both models actually invoked, on this repository. That is the fuller claim
  `OWNER-ACTIONS.md`'s launch gate asks for, and it requires either a free/local model
  endpoint reachable from wherever this is next attempted, or an explicit, small paid
  budget raised on purpose, not by default.

## Reproduce

```bash
# Unarmed dry-run (always safe, no model call, no arming needed):
node scripts/agent/run-cycle.mjs --target examples/demo-app

# The armed, $0-budget refusal (temporarily edits .modonome/config.yaml; revert after):
#   autonomy_enabled: true, dry_run: false in .modonome/config.yaml
MODONOME_ARMED=true node scripts/agent/run-cycle.mjs --target examples/demo-app --execute
```
