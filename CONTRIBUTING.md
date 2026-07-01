# Contributing to Modonome

Thank you for helping. A few rules keep the project safe and consistent.

## Ground rules

- Keep the defaults safe. Nothing in a default path may enable autonomy, auto-merge, remote
  spend, or cross-repo sharing.
- The prompt, schemas, scripts, and templates are owner-reviewed. They carry the engine's
  guarantees.
- One source of truth. Config levers live in the schema. The prompt and templates follow it.
  The drift guard enforces this.

## Local checks

```bash
npm run verify
```

This runs the full governance gate suite: the drift guard, the house-style check,
repo-hygiene, self-application conformance, learning-traceability, promotion-readiness,
work-item validation, checker-engagement, the test suite, and the AgentProof benchmark. It
needs no network or secrets.

To measure coverage, run:

```bash
npm run test:coverage
```

This uses the Node test runner with no extra dependency. Coverage is measured
over the library and CLI code; the `tests/` and `agentproof/` trees are excluded
because they are test assets (the AgentProof scenarios are exercised by
`npm run agentproof`, a separate gate that asserts 25/25). CI enforces minimum
coverage of 80% lines, 66% branches, and 80% functions. The branch floor is held
below the line floor on purpose: many CLI scripts are integration-tested through
subprocesses, which in-process coverage does not count, so the measured branch
number understates real coverage. Raising the measured branch coverage to 80% for
the OpenSSF gold criterion is tracked work. Do not lower these thresholds to make
a change pass; add tests instead.

## How we respond

We triage new issues and pull requests within 5 business days, and label them so you know
where they stand. Security reports follow the faster timeline in [SECURITY.md](SECURITY.md)
(acknowledged within 7 days). If a thread goes quiet, a polite nudge is welcome.

## House style

- Plain, positive, confident voice. Short sentences. Concrete nouns.
- No em dashes. No AI authorship signatures in any file, commit message, or branch name.
- The style check runs in CI and will flag signatures in files. Commit messages must not
  include AI attribution trailers or generated-by banners. Branch names must not use
  patterns like `claude/*`, `gpt/*`, `ai/*` or other model identifiers.
- Branch names should be descriptive: `feature/ws-g-agentproof`, `fix/config-schema`,
  `docs/embedding-guide`. Avoid auto-generated hashes unless necessary for uniqueness.

## Pull requests

- Keep changes small and test-fenced.
- A change that touches a schema, a script, or the prompt needs owner review.
- Update the changelog when you change a default lever.

## Adding a config lever end to end

Every config lever has four representations that must stay in sync. The drift guard
(`scripts/check-drift.mjs`) fails the build if they disagree. Follow these steps whenever
you add a new lever:

1. **Schema** (`schemas/config.schema.json`): add the property with its type, description,
   and default value.

2. **Template** (`templates/.modonome/config.yaml`): add the lever with its default value
   and a comment explaining what it does.

3. **Prompt** (`prompts/modonome.core.md`): add a line in the lever table so the engine
   knows the lever exists and what its safe default means.

4. **Migration** (`scripts/migrate-config.mjs`): add the lever to the migration map so
   existing installs get the new lever with its safe default on the next `migrate` run.

5. **Run the drift guard** to confirm all four representations agree:
   ```bash
   node scripts/check-drift.mjs
   ```

6. **Add a test** to `tests/config.test.mjs` covering the new lever (valid value, invalid
   value, and the migration path).

"Owner-reviewed" means: a change to schema, prompt, template, or migration requires a
maintainer to approve the pull request before merge. External contributors cannot merge
changes to these files on their own. This is enforced through CODEOWNERS.

## Embedding Modonome in Another Repo

Before embedding Modonome into a host repository, follow these steps to ensure embedding
safety and avoid silent governance breakage.

- **Step 1**: Run the preflight check against the target host repo:
  `node scripts/preflight-embedding.mjs --target-dir /path/to/host`
- **Step 2**: Review any WARN/ERROR items from the preflight report. The report uses
  structured output with severity levels (ERROR, WARN, INFO).
- **Step 3**: Resolve all ERROR items before embedding. WARN items are advisory (they
  indicate potential issues but do not block embedding).
- **Step 4**: Copy `.modonome/` config into the host repo, ensuring `schema_version`
  matches the version expected by the Modonome scripts you are embedding.
- **Step 5**: Add the Modonome CI jobs from `.github/workflows/ci.yml` to the host repo's
  CI configuration. Check for CI job name conflicts first (the preflight check covers this).
- **Step 6**: Run `npm run verify` in the host repo context to confirm all governance gates
  pass end-to-end.

**Known limitations** (see ADR-029 for full detail):
- Multi-line string-literal attacks that span file boundaries are not yet detected by the
  ratchet scanner. Avoid multi-line threshold values in config files in the host repo.
- Unicode homoglyph attacks in non-UTF-8-normalized inputs (e.g., NFC vs NFD) are not
  yet covered. Ensure host repo source files are UTF-8 NFC normalized before embedding.

## Contributing to AgentProof

AgentProof (`agentproof/`) is the fastest path to a first merged contribution. The
benchmark suite proves that every governance control holds against adversarial inputs.
Adding a new scenario means:

1. Write a fixture (a unified-diff, JSON, or YAML attack payload) in `agentproof/fixtures/`
   that represents the attack.
2. Add a scenario to `agentproof/scenarios/` that loads the fixture and asserts the
   expected outcome (blocked, not blocked).
3. Run `node agentproof/runner.mjs` and confirm it passes.
4. Document the attack and the control that defeats it in `agentproof/README.md`.

See `agentproof/CONTRIBUTING.md` for the full scenario authoring guide.
