---
status: active
owner: "@nateshpp"
last_reviewed: 2026-07-08
canonical: [adapters]
---

# Bringing an external agentic CLI (the adapter contract)

Modonome's default maker/checker path talks to a model endpoint directly (`scripts/agent/openai-client.mjs`).
For harder work, the tool-loop path (`scripts/agent/tool-loop-adapter.mjs`, ADR-032) spawns an
external, MIT-licensed agentic coding CLI instead, pointed at the resolved endpoint. The external
tool edits files in the target directory directly; Modonome owns containment, the turn cap, the
wall-clock timeout, and transcript capture around it. The tool is a component; the governance
stays here (ADR-032: "adapt, don't absorb", zero runtime dependencies preserved).

**Status:** the contract below is real and exercised by `opencode` (the only registered adapter
today, `adapters.json`). There is no automated conformance verifier yet, this doc is the
specification a contributor implements and a reviewer checks by hand. An `adapter-verify`
command that automates these checks is a natural, well-scoped follow-up once a second adapter is
proposed (see `OWNER-ACTIONS.md` for the current contribution on-ramp list).

## Declaring an adapter

Every adapter is one entry in `adapters.json`, validated against `schemas/adapters.schema.json`:

```json
{
  "name": "your-cli",
  "license": "MIT",
  "boundary": "process",
  "version": "1.2.3",
  "url": "https://github.com/you/your-cli",
  "role": "agentic-coding-cli",
  "exec_mode": "tool-loop"
}
```

- `license` must be MIT-category permissive (MIT, ISC, BSD-2-Clause, BSD-3-Clause), or
  Apache-2.0 with an `adr` field pointing at an owner note recording the patent-clause review.
  GPL/AGPL/LGPL/BUSL/SSPL are refused outright (`scripts/check-licenses.mjs`, enforced in CI).
- `boundary` must be `process`, `sidecar`, or `ci-native`. Never an npm runtime dependency: the
  published package keeps zero runtime dependencies regardless of which adapters are registered.
- `version` is the adapter's own version, for the audit trail; Modonome does not pin or vendor it.

## What the adapter must do

The CLI is invoked as a child process (`runToolLoopAdapter` in `tool-loop-adapter.mjs`):

1. **Read the prompt from stdin**, not argv. `buildAdapterArgs` defaults to
   `--prompt-stdin --max-turns <n> [--base-url <url>] [--model <name>]`, the common
   opencode/aider convention. An adapter with a different flag surface overrides these via an
   `args` array on its `adapters.json` entry.
2. **Honor the endpoint from its environment**, not argv: `OPENAI_BASE_URL`, `OPENAI_MODEL`, and
   `OPENAI_API_KEY` are set on the child's environment, never passed as command-line arguments or
   embedded in the prompt (ADR-009 rule 4: no credential on the argv/prompt surface, where it
   could leak into process listings or logs).
3. **Edit files only inside its working directory**, which Modonome pins to the resolved,
   contained target path before spawning (`containedCwd`): a target that would resolve outside
   the repo root, via `..` or an absolute path elsewhere, is refused before the adapter ever
   starts. The adapter is trusted to stay inside the directory it is launched in; it is not
   further sandboxed beyond that containment check.
4. **Respect `--max-turns` if it can**, but must not be relied on to: Modonome enforces its own
   wall-clock timeout (`timeoutMs`, default 300000ms) independently, and `SIGKILL`s a runaway or
   hung child regardless of whether it honors the turn cap. The forwarded turn count is always
   clamped to `HARD_TURN_CAP` (80), whatever the caller requests.
5. **Exit 0 on success, non-zero otherwise.** A non-zero exit, a spawn failure, a timeout, or a
   containment refusal all resolve to the same bounded, no-throw status shape
   (`{ status, transcript, reason }`) that `run-cycle.mjs` records through the same
   `writeTranscriptAndMetric` path as the single-shot maker/checker route, so the cycle continues
   rather than crashing.

## What a reviewer checks by hand today

Until an automated `adapter-verify` exists, a PR adding a new adapter should demonstrate, with a
committed transcript or a recorded local run:

- The adapter accepts a prompt on stdin and does not require it on argv.
- The adapter reads `OPENAI_BASE_URL`/`OPENAI_MODEL`/`OPENAI_API_KEY` from its environment and
  does not require credentials elsewhere.
- A deliberately out-of-bounds target (a path escaping the repo root) is refused by Modonome
  before the adapter starts, not something the adapter itself needs to guard.
- A deliberately slow or hung invocation is killed by Modonome's timeout, independent of the
  adapter's own turn accounting.
- A non-zero exit from the adapter surfaces as a `status !== 0` result Modonome logs and moves on
  from, not an unhandled crash.

## Adding your own

1. Confirm the license and boundary fit ADR-032. Add the `adapters.json` entry; `check-licenses.mjs`
   validates it in CI.
2. If the CLI's flags differ from the opencode/aider convention, set `args` on the adapter entry.
3. Run it through the checklist above locally, ideally against `fixtures/` or a scratch repo, and
   attach the transcript to the PR.
4. Add or update a role's `models`/`runner` in `.modonome/config.yaml` to route through the new
   adapter's `exec_mode: tool-loop` path. See [agents.md](agents.md) for the role configuration
   reference.
