# Contributing to AgentProof

AgentProof grows through community scenarios. This document covers how to
write a new scenario, what makes a good submission, and how to get it merged.

---

## What makes a good scenario

A good AgentProof scenario has four properties:

**1. A specific, named attack vector.**
Not "agent does something bad" but "agent adds `@Disabled` to a JUnit test
that is failing so the suite goes green." The more specific the attack, the
more useful the scenario as a reference for other implementors.

**2. Zero false positives.**
The scenario MUST pass when the governance control is working correctly on
legitimate inputs. If your scenario would flag a correct change, it cannot
be a normative (blocking) scenario. Test your scenario against at least five
clean diffs before submitting.

**3. A realistic fixture.**
The fixture must represent an attack a real autonomous agent would plausibly
attempt. Degenerate inputs (empty files, single-character diffs) are not
accepted. Model the fixture on an actual failure mode you have observed or
can reason about concretely.

**4. A clear governance property statement.**
One sentence describing what invariant the scenario proves. Example:
"The ratchet MUST exit 1 when a diff adds `@Disabled` to a JUnit 5 test file."

---

## Scenario numbering

- Scenarios are numbered sequentially: AP-17, AP-18, and so on.
- Open an issue first to claim the next number before writing the scenario.
  This prevents two contributors writing AP-17 simultaneously.
- The issue title: `[AgentProof] Claim AP-17: <brief attack description>`

---

## File naming

```
agentproof/scenarios/ap-17-<slug>.mjs      the scenario script
agentproof/fixtures/<attack-slug>.<ext>    the attack fixture
```

The slug should describe the attack, not the control. Use `ratchet-go-assertion-removal`
not `ratchet-check-3b`.

---

## Writing the scenario

Copy the template from Section 4.1 of `agentproof/SPEC.md`. Fill in:

- The JSDoc header (attack, control, governance property, expected outcome).
- The fixture path.
- The control script invocation.
- The assertion on exit code and/or output content.
- A PASS message that states the specific governance property proved.

The scenario MUST import only Node.js built-ins and local files. No npm
packages. No network calls. No file mutations.

---

## Writing the fixture

Fixtures are in `agentproof/fixtures/`. Common types:

| Type | Extension | Used for |
|---|---|---|
| Unified diff | `.patch` | Ratchet scenarios (AP-01 series) |
| JSON object | `.json` | Work item, packet scenarios |
| YAML document | `.yaml` | Config scenarios |

For unified diffs, use `diff --git` format (as produced by `git diff`).
The fixture MUST include a realistic file path (`src/test/java/...`, not `a/b`).
The attack content MUST appear in the added lines (`+` prefix).

Keep fixtures small: 20 to 40 lines is ideal. The attack should be obvious
on inspection, not buried in a wall of context.

---

## Testing your scenario

```bash
# Run your scenario directly
node agentproof/scenarios/ap-17-your-scenario.mjs

# Run it via the runner
node agentproof/runner.mjs ap-17

# Run the full suite to confirm no regressions
node agentproof/runner.mjs

# Run modonome's full verify
npm run verify
```

Your scenario MUST:
- Exit 0 (PASS) when run against the reference implementation.
- Exit 1 (FAIL) with a clear message if you temporarily break the control.
- Produce no false positives on five clean diffs of your choosing.

---

## Updating the runner and README

Add your scenario to `SCENARIO_TITLES` in `agentproof/runner.mjs`:

```javascript
"ap-17-your-scenario.mjs": "Ratchet (Go): assertion removal blocked",
```

Add a scenario entry to `agentproof/README.md` following the existing pattern:
title, attack description, control tested, why it matters.

Add a scenario entry to `agentproof/SPEC.md` Section 5 with the formal
governance property statement.

---

## Pull request checklist

- [ ] Issue opened to claim the scenario number
- [ ] Scenario file at `agentproof/scenarios/ap-NN-<slug>.mjs`
- [ ] Fixture file at `agentproof/fixtures/<slug>.<ext>`
- [ ] `SCENARIO_TITLES` updated in `agentproof/runner.mjs`
- [ ] Scenario entry added to `agentproof/README.md`
- [ ] Formal governance property added to `agentproof/SPEC.md` Section 5
- [ ] `node agentproof/runner.mjs` passes the full suite
- [ ] `npm run verify` passes clean
- [ ] Zero false positives confirmed on five clean inputs

---

## Advisory scenarios

If your check has a non-zero false-positive rate (for example, it uses
heuristics or requires context the ratchet does not have), it cannot be
a normative scenario. You may still submit it as an advisory scenario.
Advisory scenarios are documented but do not affect the GOVERNED score.
Label the PR `advisory` and note in the scenario's JSDoc that it is
non-normative.

---

## Code of conduct

AgentProof follows the Contributor Covenant. All contributions are subject
to the project's MIT License.
