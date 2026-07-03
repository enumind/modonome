# Contributing to Modonome

Thank you for helping. A few rules keep the project safe and consistent.

## How to Contribute

We use GitHub pull requests for all contributions. Here is the process:

1. **Fork** the repository on GitHub
2. **Clone** your forked repository locally
3. **Create a branch** for your changes (e.g., `git checkout -b fix/issue-123`)
4. **Make your changes** and commit them with clear, descriptive messages
5. **Run local checks** with `npm run verify` to ensure code quality
6. **Push** your branch to your fork
7. **Submit a pull request** to the main repository with a clear description of your changes
8. **Address review feedback** from maintainers and pass all automated checks
9. A maintainer will merge your pull request once approved

All contributions require:
- Pull request review from a maintainer
- Passing automated tests and checks (drift guard, style, lint, dependency audit, tests, AgentProof)
- External contributors cannot merge changes; maintainer approval required

For bug reports and feature requests, open an issue on GitHub instead of submitting a pull request.

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

This runs the drift guard, the style check, ESLint, a dependency audit, the tests, and
AgentProof. The drift guard, style check, and tests need no network or secrets; the
dependency audit reaches the npm registry to check for known vulnerabilities.

## Static analysis and vulnerability handling

- **ESLint** (`npm run check:lint`) runs on every push and pull request and must pass
  with zero errors before merge.
- **`npm audit`** (`npm run check:audit`) runs in CI at the `moderate` severity floor and
  must pass before merge.
- Any finding from either tool with a CVSS base score of 4.0 (medium) or higher must be
  fixed, or documented as an accepted false positive with a written justification, before
  the pull request that introduced it can merge. Critical findings are fixed immediately,
  not queued.
- Coverage (`npm run check:coverage`) is measured on every run; the project targets 80%+
  line and function coverage. Coverage regressions are called out in review even where
  not hard-gated in CI.

## House style

- Plain, positive, confident voice. Short sentences. Concrete nouns.
- No em dashes. No AI authorship signatures in any file or commit message.
- The style check runs in CI and will flag signatures in files. Commit messages must not
  include AI attribution trailers or generated-by banners.

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

## Contributing to AgentProof

AgentProof (`agentproof/`) is the fastest path to a first merged contribution. The
benchmark suite proves that every governance control holds against adversarial inputs.
Adding a new scenario means:

1. Write a fixture diff in `fixtures/ratchet-diffs/gaming/` or an attack config in
   `fixtures/config/` that represents the attack.
2. Add a scenario to `agentproof/scenarios/` that loads the fixture and asserts the
   expected outcome (blocked, not blocked).
3. Run `node agentproof/runner.mjs` and confirm it passes.
4. Document the attack and the control that defeats it in `agentproof/README.md`.

See `agentproof/CONTRIBUTING.md` for the full scenario authoring guide.
