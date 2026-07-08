<p align="center">
  <img src="https://www.modonome.com/assets/modonome-logo.webp" alt="Modonome" width="280" />
</p>

<h1 align="center">Modonome</h1>

<p align="center"><strong>The autonomous engineering loop that arms only on your command, sends every change through an independent checker, and blocks the known structural ways agents weaken tests.</strong></p>

<p align="center">
When armed, it finds tech debt your team keeps deferring and proposes bounded pull requests.
A CI gate integrity check, run from a base-branch copy the agent's run does not control,
rejects diffs that structurally weaken tests or gates: removed assertions, injected skips,
type escapes, lowered coverage. Maker, checker, and merge authority are structurally
separate, enforced in CI. Off by default, and it runs without a central service.
</p>

<p align="center">
  <a href="https://modonome.com">Website</a> ·
  <a href="QUICKSTART.md">Quickstart</a> ·
  <a href="ADOPTION-GUIDE.md">Adoption guide</a> ·
  <a href="docs/enterprise.md">Enterprise</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="GOVERNANCE.md">Governance</a> ·
  <a href="docs/compliance/compliance.md">Compliance</a> ·
  <a href="docs/specs/governed-autonomy-spec.md">Specification</a> ·
  <a href="agentproof/README.md">AgentProof</a> ·
  <a href="apps/control-panel/README.md">Control panel</a>
</p>

<p align="center">
  <a href="https://github.com/enumind/modonome/actions/workflows/ci.yml"><img src="https://github.com/enumind/modonome/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/modonome"><img src="https://img.shields.io/npm/v/modonome" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="agentproof/README.md"><img src="https://img.shields.io/badge/AgentProof-25%2F25-brightgreen" alt="AgentProof 25/25" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/enumind/modonome"><img src="https://api.securityscorecards.dev/projects/github.com/enumind/modonome/badge" alt="OpenSSF Scorecard" /></a>
</p>

---

Autonomous coding agents have a predictable failure mode: they weaken gates to go green (removing test assertions, adding skips, loosening type checks). Modonome blocks the known structural forms of that in CI: the anti-gaming ratchet runs from a base-branch copy the agent's run does not control, and it rejects diffs that structurally weaken a gate. We published the [governed-autonomy spec](docs/specs/governed-autonomy-spec.md), and Modonome is the reference implementation for agent gate integrity, scoring **[25/25 on AgentProof](agentproof/README.md)**, our self-graded adversarial benchmark of known gaming patterns (hardening against those patterns, not third-party certification and not a certificate of full autonomy governance). The check is deterministic and narrow by design; [what it cannot catch](#what-the-gate-integrity-check-cannot-catch) is documented rather than papered over.

## Why businesses adopt Modonome

Engineering teams commonly report a large share of capacity going to tech debt work: test
gaps, stale dependencies, dead branches, type safety holes, observability gaps. Modonome
targets the bounded, provable portion of that backlog (Tier 1 and Tier 2 work). It is off by
default and dry-run first. Once an owner arms it, every change is small, test-fenced,
independently checked by a separate role, and gated before it can merge. It adopts your
existing CI, code owners, and branch rules on day one, and adds no new platform or service.

Support for mainframe, SAP, Oracle, Salesforce, ServiceNow, low-code, and data estates is on
the roadmap, not shipped today. See [docs/enterprise.md](docs/enterprise.md) for the design and
[docs/audits/claims-audit-2026-06-25.md](docs/audits/claims-audit-2026-06-25.md) for what is enforced now.

## Try it in 60 seconds (read-only)

```bash
npx modonome dry-run .
```

Modonome reads your repo, detects your stack and gates, and prints the work it would
propose. It writes nothing. When you are ready, scaffold the local state files (still
disabled and dry-run):

```bash
npx modonome scaffold .
```

This prints a preview. Add `--write` to apply the files:

```bash
npx modonome scaffold . --write
```

**[See the walkthrough](examples/demo-app/WALKTHROUGH.md)**: a real Node.js app with planted tech debt. What the dry-run proposed, plus one recorded maker/checker cycle (distinct models, one real question raised by the independent checker), with every step backed by a committed evidence file. No setup required to read it.

## Defaults that stay in your control

- Autonomy stays off until you arm it, through an owner-only step in your CI or environment.
- Auto-merge stays off; a separate merge authority lands changes only when every gate is green.
- Protected paths (CI, secrets, schemas, migrations, lockfiles, auth) wait for owner review.
- Model spend stays opt-in; local or already-paid models come first.
- Cross-repo sharing stays off until you enable it.

## Operator control panel

A reference control panel lives at [`apps/control-panel/`](apps/control-panel/README.md):
arm and disarm, tune caps and budget, watch the work queue and gates, approve protected-path
changes, and promote or prune learnings, for a host repo or for modonome governing itself.
It reads real `.modonome/` state and, opt-in, writes back to it. Status: in progress, tracked
as [Milestone 3](ROADMAP.md#milestone-3--control-panel-and-metrics-dashboard).

## How it works

1. Adopt. Read the host repo's instructions, CI, code owners, gates, and conventions, then
   defer to them.
2. Dry-run. Propose bounded work as a queue, read-only.
3. Make. A maker implements one tightly scoped packet with a failing test as the fence.
4. Check. An independent checker, separate from the maker, runs the gates and reviews the diff.
5. Gate. Deterministic gates and the anti-gaming ratchet run in CI, outside the agent.
6. Owner. Protected paths and new claims wait for a human decision.
7. Merge. A separate merge authority, distinct from the author, lands the change only when
   every gate is green.
8. Learn. Real corrections become staged lessons that an owner promotes into durable rules.

Modonome is a prompt and a set of scripts. Running autonomously requires a harness: a coding
agent, a CI job, or a human session that loads the prompt.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full picture and
[prompts/modonome.bundle.md](prompts/modonome.bundle.md) for the engine definition.

## How it learns and keeps up

When a gate fails, a reviewer corrects the engine, or a change gets reverted, a follower role
captures one generalized, evidence-backed lesson and stages it in `.modonome/LESSONS.md`.
An owner promotes durable lessons into canonical rules, config, or tests, then adds a
deterministic gate when one fits. The queue stays capped, dated, and owner-controlled. The
engine rewrites its own rules only with a human in the loop. Promoted lessons are validated in
CI for full traceability (`scripts/check-learning-traceability.mjs`) and are queryable with
`npm run audit:learnings`. A market-researcher role that watches for standards and dependency
shifts is on the roadmap, not yet implemented.

## Why is this different from prompting an agent directly?

You can tell an agent to add tests. The agent can also remove assertions to make the tests
pass faster. Modonome handles this structurally: the ratchet that catches assertion removal
runs in CI from a base-branch copy the agent's run does not control. The arming levers live
in environment variables, outside the agent's read scope. A prompt can be overridden by a
cleverer prompt; a CI gate that runs outside the agent's write scope holds.

## Why it is safe to run

The controls live in code that runs in CI. The anti-gaming ratchet and the house-style
linter run from a trusted base-branch copy; the drift guard, self-application conformance,
work-item validation, learning-traceability, promotion-readiness, and checker-engagement
checks also run in CI, and every enforcing script is protected by CODEOWNERS review. The
arming levers are gated by the `MODONOME_ARMED` environment variable, enforced at runtime:
with it unset, `autonomy_enabled` is forced to false no matter what the config file says. The
levers are read from your environment or CI, never from a file the engine can rewrite.

[AgentProof](agentproof/README.md), our self-graded adversarial benchmark, exercises this with 25 scenarios: assertion removal,
skip injection, type escape, coverage removal, unsafe config combinations, identity collapse,
raw code leakage, drift, protected-path bypass, Java and .NET ratchet coverage, prompt
injection inertness, state-machine acyclicity, deterministic gate ordering, trust-boundary code
loading, audit-trail integrity, model-family distinctness, concurrency safety, gate-dependency
DAG validation, evidence secret screening, and resource-exhaustion caps. Modonome scores
**25/25**. Run it yourself:

```bash
node agentproof/runner.mjs
```

Read [SECURITY.md](SECURITY.md), [GOVERNANCE.md](GOVERNANCE.md), and
[docs/specs/governed-autonomy-spec.md](docs/specs/governed-autonomy-spec.md).

## What the gate integrity check cannot catch

The ratchet is a deterministic, line-based diff analyzer. That makes it fast, dependency-free,
and immune to prompt injection. It also bounds what it can see. It catches **structural**
gate-weakening: removed or downgraded assertions, injected skips, type escapes, lowered or
deleted coverage thresholds, across JS/TS, Python, Java, and .NET. It does not catch
**semantic** weakening: an expected value quietly changed to match buggy output, an assertion
whose operands were loosened while its shape stayed intact, or a test rewritten to pass
vacuously.

Two layers cover that gap, and we say so rather than imply the ratchet does:

- The **independent checker** reviews every armed change with a distinct identity and model
  family; semantic review is its job, and the separation is enforced structurally, not by
  prompt (see [How it works](#how-it-works)).
- **The Gauntlet** (`npx modonome gauntlet .`) replays known weakening attacks against your
  repo's own files and scores your actually-configured gates, with an honest denominator:
  languages you don't use count as N/A, not as passes.

If you can construct a diff that weakens a gate and slips past the ratchet, we want it:
file it with the [AgentProof scenario issue form](https://github.com/enumind/modonome/issues/new/choose)
and it becomes a named scenario credited to you.

## Repo snapshot for LLM context

`modonome snapshot` reads any repo and writes a tiered, Merkle-verified artifact under
`.modonome/snapshot/` so an agent can understand the code without re-reading every file each
turn:

- Tier 0 `signature.json`: a small fingerprint (Merkle root, stack, entrypoints, commands,
  governance posture). If `merkle_root` is unchanged, the repo is unchanged.
- Tier 1 `map.json` and `map.md`: modules, public API signatures, import edges, and an
  attention ranking by degree centrality and PageRank. Short `F:` and `S:` anchors resolve to
  an exact file and line so an agent can cite and act without a full read.

It is dependency-free, deterministic, and read-only. Secrets are redacted before anything is
written. Keep it fresh with a git hook and a CI check; verify integrity any time.

```bash
npx modonome snapshot .            # write .modonome/snapshot/ and llms.txt
npx modonome snapshot . --verify   # recompute the Merkle root and confirm no drift
npx modonome snapshot . --since HEAD~1   # print the signature-level delta since a ref
```

Agents discover it through the root `llms.txt`, a pointer in `AGENTS.md` or `CLAUDE.md`, or
the `modonome_snapshot` MCP tool. See [docs/adr/ADR-033-repo-snapshot.md](docs/adr/ADR-033-repo-snapshot.md).

## Embed it

- Reference: link to the prompt and keep your state local.
- Vendor: copy `prompts/`, `templates/`, `schemas/`, and `scripts/` into your repo and pin a
  release tag.
- Package: import the schemas and scripts, keep config and state local.

Upgrades preserve your config. New levers always arrive with safe defaults, so an update
leaves an engine disarmed unless an owner arms it. See [docs/versioning.md](docs/versioning.md).

## Examples

- **[Demo app walkthrough](examples/demo-app/WALKTHROUGH.md)**: a Node.js app with planted debt. Dry-run proposals and one recorded, independently checked maker/checker cycle, each step backed by committed evidence. No setup required to read it.
- [examples/node-typescript](examples/node-typescript): Node and TypeScript service with [dry-run transcript](examples/node-typescript/dry-run-transcript.txt).
- [examples/python-service](examples/python-service): Python service with [dry-run transcript](examples/python-service/dry-run-transcript.txt).

## Two products, one repo

**Modonome Guard (v0.1, shipped today)** is the guardrail layer any team can adopt in minutes:

- Anti-gaming ratchet: blocks assertion removal, skip injection, type escape, coverage removal across JS/TS, Python, Java, .NET
- [AgentProof](agentproof/README.md): self-graded adversarial benchmark for gate integrity, 25/25 HARDENED
- Validators: config, work-item, drift, self-application, evidence, learning traceability
- CLI: `dry-run`, `scaffold`, `validate`, `report`

Add the gate-integrity check to any GitHub repo as a Marketplace action, then mark
`Modonome Gate Integrity` a required check via a ruleset. It declares `merge_group`, so it
also reports in a merge queue, and the gate code runs from the pinned action ref, not from
the pull request under review:

```yaml
name: gate-integrity
on:
  pull_request:
  merge_group:
jobs:
  gate-integrity:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write   # for the SARIF upload to code scanning
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: enumind/modonome@v1
```

Findings render as SARIF in the Security tab with stable `MR###` rule codes. Prefer a raw
step instead? The ratchet is one dependency-free script:

```yaml
- name: Modonome gate integrity
  run: npx modonome ratchet            # add --sarif or --json for machine-readable output
```

**Modonome Loop (v0.2, roadmap)** is the governed maker/checker loop. The machinery is fully
wired (`modonome-auto.yml`, `run-cycle.mjs`) and exercised end-to-end once on the demo app
([`examples/demo-app/runs/2026-06-26T11-46-00Z/`](examples/demo-app/runs/2026-06-26T11-46-00Z/)):
Haiku maker, Sonnet checker, distinct model families, checker approved with one question
raised. The cycle is recorded as evidence, not applied to the sample. It has not yet run in
armed mode on a live production repository. That is v0.2.

## Alpha limitations (v0.1-alpha)

Modonome is in public alpha. The ratchet, CLI, MCP server, report command, and the CI
governance gates (drift, self-application, work-item validation, learning traceability,
promotion readiness, checker engagement) are stable and machine-verified. The two-phase
maker/checker loop is structurally defined and CI-enforced, but has not yet run in armed mode
on a live repository. The following capabilities are on the roadmap but not yet shipped:

| Capability | Status | Planned |
|-----------|--------|---------|
| Live armed autonomy run (engine authors and a separate checker reviews on a real repo) | Not yet | v0.2 |
| Cross-repo knowledge network (transport, signing, import) | Design only (ADRs 014-019) | v0.2 |
| Multi-stack support beyond JS/TS, Python, Java, .NET (mainframe, SAP, Oracle, and so on) | Not yet | roadmap |
| Market-researcher role | Not yet | roadmap |
| Cryptographically signed work items (Ed25519) | Not yet | v0.2 |
| OpenTelemetry span emission for governance events | Not yet | v0.3 |
| Before/after tech debt measurement | Not yet | v0.2 |
| Multi-team estate metrics aggregation | Not yet | v0.3 |

State is stored as flat files in `.modonome/`. This suits single-repo, owner-supervised
runs today; compliance audit trails and multi-team estates arrive with the v0.2 additions.
See [ROADMAP.md](ROADMAP.md).

## Cost model

Modonome's cost is entirely the LLM API you use. The tool itself is zero-cost
(MIT, no telemetry, no service). There is no central service call.

| Run type | Turns | Approximate API cost |
|---|---|---|
| Dry-run sweep (read-only) | 2-4 | $0.01 - $0.05 |
| Tier 1 work item (docs, tests) | 6-10 | $0.05 - $0.20 |
| Tier 2 work item (scripts, schemas) | 10-20 | $0.20 - $1.00 |
| Full autonomous cycle (5 items) | 40-60 | $0.50 - $2.00 |

Figures assume Claude Sonnet pricing at June 2026 rates. Haiku runs Tier 1 items
at roughly one-fifth the cost. Opus is appropriate for security-critical Tier 2
items. See `QUICKSTART.md` for how to match model tier to work item tier.

If you run modonome via the Claude Code CLI with a Claude Pro or Teams subscription
(not an API key), the cost is zero beyond your subscription. VS Code with the Claude
Code extension uses the same subscription-based billing.

## Local development

```bash
npm run verify   # drift, style, hygiene, self-application, learning, promotion, work-item,
                 # and checker-engagement gates, plus tests and AgentProof. No network or secrets.
```

`.modonome/` in this repo is Modonome's own governance state: its work queue, its promoted
learnings, and a `metrics.example.jsonl` sample (the live `metrics.jsonl` is written by the
engine at runtime and is not committed). Adopters should run `npx modonome scaffold . --write`
to start fresh with their own config and empty state.

## Development practice

This project is developed with AI assistance, governed by the same autonomy loop it ships. The governance process (CI gates, independent checker, anti-gaming ratchet) is the trust signal, not the identity of any tool involved.

## License

MIT. See [LICENSE](LICENSE).
