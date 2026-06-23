<p align="center">
  <img src="https://modonome.com/modonome-logo.svg" alt="Modonome" width="280" />
</p>

<h1 align="center">Modonome</h1>

<p align="center"><strong>The autonomous engineer you can actually leave running.</strong></p>

<p align="center">
Drop it beside any codebase. It learns your rules, runs in dry-run, and turns engineering
debt into small reviewable pull requests. Maker, checker, and merge authority stay separate.
An anti-gaming ratchet means it cannot pass your gates by weakening them. Off by default.
</p>

<p align="center">
  <a href="https://modonome.com">Website</a> ·
  <a href="QUICKSTART.md">Quickstart</a> ·
  <a href="ADOPTION-GUIDE.md">Adoption guide</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="GOVERNANCE.md">Governance</a>
</p>

---

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

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full picture and
[prompts/modonome.bundle.md](prompts/modonome.bundle.md) for the engine definition.

## Why it is safe to run

The controls are code, not promises. The anti-gaming ratchet, the config and packet
validators, and the drift guard all run in CI where the agent cannot edit them. The arming
levers are read from your environment or CI, never from a file the engine can rewrite. Read
[SECURITY.md](SECURITY.md) and [GOVERNANCE.md](GOVERNANCE.md).

## Embed it

- Reference: link to the prompt and keep your state local.
- Vendor: copy `prompts/`, `templates/`, `schemas/`, and `scripts/` into your repo and pin a
  release tag.
- Package: import the schemas and scripts, keep config and state local.

Upgrades preserve your config. New levers always arrive with safe defaults, so an update can
never arm an engine. See [docs/VERSIONING.md](docs/VERSIONING.md).

## Examples

- [examples/node-typescript](examples/node-typescript) with a captured dry-run transcript.
- [examples/python-service](examples/python-service) with a captured dry-run transcript.

## Local development

```bash
npm run verify   # drift guard, style check, and tests. No network or secrets required.
```

## License

MIT. See [LICENSE](LICENSE).
