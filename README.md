<p align="center">
  <img src="https://modonome.com/modonome-logo.svg" alt="Modonome" width="280" />
</p>

<h1 align="center">Modonome</h1>

<p align="center"><strong>The autonomous engineering loop that can't arm itself, can't review its own work, and can't pass your tests by weakening them.</strong></p>

<p align="center">
It finds tech debt your team keeps deferring, writes bounded pull requests, and cannot pass
your tests by removing them. Maker, checker, and merge authority are structurally separate.
Off by default. No central service.
</p>

<p align="center">
  <a href="https://modonome.com">Website</a> ·
  <a href="QUICKSTART.md">Quickstart</a> ·
  <a href="ADOPTION-GUIDE.md">Adoption guide</a> ·
  <a href="ENTERPRISE.md">Enterprise</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="GOVERNANCE.md">Governance</a> ·
  <a href="COMPLIANCE.md">Compliance</a> ·
  <a href="GOVERNED-AUTONOMY-SPEC.md">Specification</a> ·
  <a href="agentproof/README.md">AgentProof</a>
</p>

<p align="center">
  <a href="https://github.com/nateshpp/modonome/actions/workflows/ci.yml"><img src="https://github.com/nateshpp/modonome/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/modonome"><img src="https://img.shields.io/npm/v/modonome" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="agentproof/README.md"><img src="https://img.shields.io/badge/AgentProof-16%2F16-brightgreen" alt="AgentProof 16/16" /></a>
</p>

---

Autonomous coding agents have a predictable failure mode: they weaken gates to go green (removing test assertions, adding skips, loosening type checks). Modonome is the first tool to make that structurally impossible. The ratchet that blocks it runs in CI, in code the agent cannot edit. [We wrote the spec](GOVERNED-AUTONOMY-SPEC.md) and Modonome is the reference implementation, scoring **[16/16 on AgentProof](agentproof/README.md)**.

## Why businesses adopt Modonome

Engineering teams spend 30 to 40 percent of capacity on tech debt work: test gaps, stale
dependencies, dead branches, type safety holes, observability gaps. Modonome handles the
bounded, provable portion of that backlog autonomously, so engineers stay focused on product
delivery. Every change is small, test-fenced, independently checked, and gated before it
touches production. No central service. No new process. It adopts your existing CI, code
owners, and branch rules on day one.

For mainframe, SAP, Oracle, Salesforce, ServiceNow, low-code, and data estate setups, see
[ENTERPRISE.md](ENTERPRISE.md).

## Try it in 60 seconds (changes nothing)

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

**[See the walkthrough](examples/demo-app/WALKTHROUGH.md)**: one week on a real Node.js app. What the dry-run proposed, what the ratchet blocked, and what the end-of-week report showed. No setup required to read it.

## What it refuses to do by default

- It will not enable autonomy. Arming is a separate, owner-only step through your CI or
  environment.
- It will not auto-merge anything.
- It will not touch protected paths (CI, secrets, schemas, migrations, lockfiles, auth).
- It will not spend on remote models. Local or already-paid models come first.
- It will not share anything across repos.

## How it works

1. Adopt. Read the host repo's instructions, CI, code owners, gates, and conventions, then
   defer to them.
2. Dry-run. Propose bounded work as a queue. Change nothing.
3. Make. A maker implements one tightly scoped packet with a failing test as the fence.
4. Check. An independent checker, never the maker, runs the gates and reviews the diff.
5. Gate. Deterministic gates and the anti-gaming ratchet run in CI, outside the agent.
6. Owner. Protected paths and new claims wait for a human decision.
7. Merge. One merge authority lands the change, never the author, only when every gate is
   green.
8. Learn. Real corrections become staged lessons that an owner promotes into durable rules.

Modonome is a prompt and a set of scripts. Running autonomously requires a harness: a coding
agent, a CI job, or a human session that loads the prompt.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full picture and
[prompts/modonome.bundle.md](prompts/modonome.bundle.md) for the engine definition.

## How it learns and keeps up

When a gate fails, a reviewer corrects the engine, or a change gets reverted, a follower role
captures one generalized, evidence-backed lesson and stages it in `.modonome/LEARNINGS.md`.
An owner promotes durable lessons into canonical rules, config, or tests, then adds a
deterministic gate when one fits. The queue stays capped, dated, and owner-controlled. The
engine never rewrites its own rules without a human in the loop. A market-researcher role
watches for standards and dependency shifts and routes sourced findings for owner review.

## Why is this different from prompting an agent directly?

You can tell an agent to add tests. The agent can also remove assertions to make the tests
pass faster. The difference with Modonome is structural: the ratchet that blocks assertion
removal runs in CI, in a file the agent cannot edit. The arming levers are environment
variables the agent cannot read. A prompt can be overridden by a cleverer prompt. A CI gate
running outside the agent's write scope cannot be.

## Why it is safe to run

The controls are code, not promises. The anti-gaming ratchet, the config and packet
validators, and the drift guard all run in CI where the agent cannot edit them. The arming
levers are gated by the `MODONOME_ARMED` environment variable, enforced at runtime: with it
unset, `autonomy_enabled` is forced to false no matter what the config file says. The levers
are read from your environment or CI, never from a file the engine can rewrite.

[AgentProof](agentproof/README.md) proves this with 16 adversarial scenarios: assertion removal,
skip injection, type escape, coverage removal, unsafe config combinations, identity collapse,
raw code leakage, drift, protected-path bypass, Java and .NET ratchet coverage, and prompt
injection inertness. Modonome scores **16/16**. Run it yourself:

```bash
node agentproof/runner.mjs
```

Read [SECURITY.md](SECURITY.md), [GOVERNANCE.md](GOVERNANCE.md), and
[GOVERNED-AUTONOMY-SPEC.md](GOVERNED-AUTONOMY-SPEC.md).

## Embed it

- Reference: link to the prompt and keep your state local.
- Vendor: copy `prompts/`, `templates/`, `schemas/`, and `scripts/` into your repo and pin a
  release tag.
- Package: import the schemas and scripts, keep config and state local.

Upgrades preserve your config. New levers always arrive with safe defaults, so an update can
never arm an engine. See [docs/VERSIONING.md](docs/VERSIONING.md).

## Examples

- **[Demo app walkthrough](examples/demo-app/WALKTHROUGH.md)**: one week on a Node.js app. Dry-run, ratchet blocks, merges, and governance report. No setup required to read it.
- [examples/node-typescript](examples/node-typescript): Node and TypeScript service with [dry-run transcript](examples/node-typescript/dry-run-transcript.txt).
- [examples/python-service](examples/python-service): Python service with [dry-run transcript](examples/python-service/dry-run-transcript.txt).

## Alpha limitations (v0.1-alpha)

Modonome is in public alpha. The governance loop, ratchet, CLI, MCP server, and report command
are stable and machine-verified. The following capabilities are on the roadmap but not yet shipped:

| Capability | Status | Planned |
|-----------|--------|---------|
| Cryptographically signed work items (Ed25519) | Not yet | v0.2 |
| OpenTelemetry span emission for governance events | Not yet | v0.3 |
| Before/after tech debt measurement | Not yet | v0.2 |
| Multi-team estate metrics aggregation | Not yet | v0.3 |

State is stored as flat files in `.modonome/`. This is right for single-repo, owner-supervised
runs. It is not ready for compliance audit trails or multi-team estates without the v0.2
additions. See [ROADMAP.md](ROADMAP.md).

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
npm run verify   # drift guard, style check, and tests. No network or secrets required.
```

`.modonome/` in this repo is a demo state directory showing what governance activity looks like.
Adopters should delete it and run `npx modonome scaffold . --write` to start fresh with their
own config and empty state.

## License

MIT. See [LICENSE](LICENSE).
