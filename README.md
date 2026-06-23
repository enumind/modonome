<p align="center">
  <img src="https://modonome.com/modonome-logo.svg" alt="Modonome" width="280" />
</p>

<h1 align="center">Modonome</h1>

<p align="center"><strong>The autonomous engineering loop that can't arm itself, can't review its own work, and can't pass your tests by weakening them.</strong></p>

<p align="center">
Drop it beside any codebase. It learns your rules, runs in dry-run, and turns engineering
debt into small reviewable pull requests. Maker, checker, and merge authority stay separate.
An anti-gaming ratchet means it cannot pass your gates by weakening them. Off by default.
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
</p>

---

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

## Why it is safe to run

The controls are code, not promises. The anti-gaming ratchet, the config and packet
validators, and the drift guard all run in CI where the agent cannot edit them. The arming
levers are read from your environment or CI, never from a file the engine can rewrite.

[AgentProof](agentproof/README.md) proves this with ten adversarial scenarios: assertion removal,
skip injection, type escape, coverage removal, unsafe config combinations, identity collapse,
raw code leakage, drift, and protected-path bypass. Modonome scores 10/10. Run it yourself:

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

- [examples/node-typescript](examples/node-typescript): Node and TypeScript service.
  [See the dry-run transcript](examples/node-typescript/dry-run-transcript.txt).
- [examples/python-service](examples/python-service): Python service.
  [See the dry-run transcript](examples/python-service/dry-run-transcript.txt).

## Alpha limitations (v0.1-alpha)

Modonome is in public alpha. The governance loop is stable and machine-verified. The following
capabilities are on the roadmap but not yet implemented:

| Capability | Status | Planned |
|-----------|--------|---------|
| Cryptographically signed work items | Not yet | v0.3 |
| OpenTelemetry span emission for governance events | Not yet | v0.3 |
| MCP server for harness integration | Not yet | v0.3 |
| `modonome report`: value summary from metrics log | Not yet | v0.2 |
| Before/after tech debt measurement | Not yet | v0.2 |
| Multi-team estate metrics aggregation | Not yet | v0.3 |

State is stored as flat files in `.modonome/`. This is right for single-repo, owner-supervised
runs. It is not ready for compliance audit trails or multi-team estates without the v0.3
additions. See [ROADMAP.md](ROADMAP.md).

## Local development

```bash
npm run verify   # drift guard, style check, and tests. No network or secrets required.
```

## License

MIT. See [LICENSE](LICENSE).
