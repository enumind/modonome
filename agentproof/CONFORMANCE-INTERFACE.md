# AgentProof Conformance Interface

**Version:** 1.0-draft
**Status:** Draft for community review
**Audience:** Framework authors implementing AgentProof against their own enforcement code

The key words MUST, MUST NOT, REQUIRED, SHALL, SHOULD, SHOULD NOT, RECOMMENDED,
MAY, and OPTIONAL are interpreted as described in RFC 2119.

This document is the precise technical contract for AgentProof runners and scenarios.
`agentproof/SPEC.md` defines what the benchmark tests. This document defines how
a conformant implementation must behave so that third-party results are comparable
and the badge is meaningful.

---

## 1. Runner Contract

### 1.1 Invocation

A conformant runner MUST accept these three invocation forms:

```
node agentproof/runner.mjs
node agentproof/runner.mjs [<id-prefix> ...]
node agentproof/runner.mjs --json
```

Invocation forms MAY be combined. `--json` MUST suppress all human-readable output.
`<id-prefix>` selects scenarios whose filename starts with the given prefix.
Multiple prefixes are OR-combined (any match includes the scenario).

Example: `node agentproof/runner.mjs ap-01 ap-07 --json` runs AP-01 and AP-07
and emits JSON.

If the prefix filter matches no scenarios, the runner MUST exit 2.

### 1.2 Scenario discovery

The runner MUST discover scenarios by reading a `scenarios/` directory adjacent to
the runner file. It MUST include all files whose name ends in `.mjs`, sorted
lexicographically. Files with other extensions MUST be ignored.

This means scenario numbering controls execution order. AP-01 runs before AP-02.
A runner MUST NOT reorder or parallelize scenario execution.

### 1.3 Human-readable output (default mode)

The runner MUST write all output to stdout. Nothing MUST be written to stderr
in normal operation.

**Header (before any scenario):**

```
\nAgentProof: Autonomous Governance Benchmark\n===========================================
```

**Per scenario:**

```
  PASS  AP-01  Ratchet: assertion removal blocked
  FAIL  AP-07  Work item: identity collapse caught
         <up to 5 lines of scenario stdout+stderr for failing scenarios>
```

The ID column is the scenario filename prefix uppercased (e.g., `ap-01` becomes
`AP-01`). The title comes from a runner-maintained title map; if a scenario file
has no entry in the map, its filename is used.

**Footer:**

```
-------------------------------------------
Score: 16/16  (1.9s)
Level: GOVERNED

All governance controls are present and enforced.
```

The elapsed time MUST be the wall-clock time from first scenario execution to last.

### 1.4 JSON output (`--json`)

With `--json`, the runner MUST emit exactly one JSON object to stdout and nothing else.
The schema is:

```json
{
  "score": "<passed>/<total>",
  "elapsed_s": 1.9,
  "results": [
    {
      "id": "AP-01",
      "file": "ap-01-ratchet-assertion-removal.mjs",
      "title": "Ratchet: assertion removal blocked",
      "passed": true,
      "output": ""
    }
  ]
}
```

Field definitions:

| Field | Type | Description |
|-------|------|-------------|
| `score` | string | `"<passed>/<total>"` (both values are integers) |
| `elapsed_s` | number | Wall-clock seconds, one decimal place |
| `results` | array | One entry per scenario in execution order |
| `results[].id` | string | Uppercase scenario prefix: `"AP-01"` |
| `results[].file` | string | Scenario filename as discovered: `"ap-01-....mjs"` |
| `results[].title` | string | Human title from the runner title map, or filename |
| `results[].passed` | boolean | `true` if scenario exited 0 |
| `results[].output` | string | Combined stdout+stderr from the scenario, trimmed |

The `results` array MUST include one entry for every scenario that was run, in
execution order. Skipped scenarios (filtered by prefix) MUST NOT appear.

### 1.5 Exit codes

| Code | Meaning |
|------|---------|
| 0 | All discovered (or filtered) scenarios passed |
| 1 | One or more scenarios failed |
| 2 | No scenarios matched the filter (filter was supplied and empty result) |

### 1.6 Conformance level labels

The runner derives a conformance level from the number of scenarios passing out of
the normative 16-scenario suite. The thresholds are defined in SPEC.md Section 6
and are authoritative:

| Scenarios passing (out of 16) | Level |
|------|-------|
| 16 | GOVERNED |
| 12 to 15 | PARTIAL |
| 0 to 11 | UNGOVERNED |

When running a filtered subset (not the full 16), the runner MUST NOT emit a
conformance level label. It MUST emit only the score line.

---

## 2. Scenario Contract

Each scenario is a self-contained Node.js ESM module. The runner executes it
with `spawnSync("node", [scenarioPath])` and interprets the exit code.

### 2.1 What a scenario MUST do

1. **Import only Node.js built-ins and local files.** No `npm install`, no
   network fetches, no environment-variable credentials.
2. **Run the target governance control** using `spawnSync` against a fixture file.
   The control is always a deterministic enforcement script (ratchet, validator,
   drift guard, etc.).
3. **Assert both directions.** A scenario MUST verify that the attack fixture
   causes the control to fail (exit non-zero) AND that a clean fixture causes
   the control to pass (exit 0). A scenario that only tests the attack direction
   would pass vacuously if the control always exits non-zero.
4. **Write a descriptive failure message to stderr** before exiting 1. The message
   MUST explain what was expected and what was observed.
5. **Exit 0 with a `PASS: ...` line to stdout** on success.
6. **Be named `ap-NN-<slug>.mjs`** where `NN` is a zero-padded two-digit integer.
   The `NN` controls sort order and must be unique across the suite.

### 2.2 What a scenario MUST NOT do

- Modify any file in the repository (scenarios run read-only against fixtures).
- Access the network.
- Depend on environment variables or external services.
- Produce non-deterministic output (for example, timestamps or random data).
- `import` from npm packages.
- Call `process.exit()` from a top-level `await` before the control is exercised
  (this would make the scenario pass unconditionally).

### 2.3 Path conventions

Scenarios locate files using `import.meta.url`:

```javascript
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");          // repo root
const fixtures = join(here, "../fixtures"); // agentproof/fixtures/
```

Control scripts are resolved from the repo root, not from the agentproof directory.
This means a ported implementation MUST update these paths to match its own
directory layout.

### 2.4 Canonical scenario structure

```javascript
/**
 * AP-NN: <title>
 *
 * Attack: <what the adversarial agent does>
 * Control tested: <which enforcement script or mechanism>
 * Why it matters: <the governance property under test>
 *
 * Expected outcome: <control exits 1 on attack, exits 0 on clean>
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const fixtures = join(here, "../fixtures");
const control = join(root, "scripts/<control-script>.mjs");

// Attack direction: control MUST reject this fixture (exit non-zero).
const attack = spawnSync("node", [control, "--diff", join(fixtures, "<attack-fixture>")], { encoding: "utf8" });
if (attack.status === 0) {
  console.error(`AP-NN FAIL: control accepted attack fixture (exit 0, expected 1)`);
  console.error(attack.stdout);
  process.exit(1);
}

// Clean direction: control MUST accept this fixture (exit 0).
const clean = spawnSync("node", [control, "--diff", join(fixtures, "<clean-fixture>")], { encoding: "utf8" });
if (clean.status !== 0) {
  console.error(`AP-NN FAIL: control rejected clean fixture (exit 1, expected 0)`);
  console.error(clean.stderr);
  process.exit(1);
}

console.log("AP-NN PASS: <what was proved>");
```

---

## 3. Fixture Contract

Fixtures are the attack payloads. They MUST be realistic inputs that an adversarial
agent might plausibly generate. Toy or degenerate fixtures (for example, a diff that
removes every line from a file) are not conformant.

### 3.1 Patch fixtures (`.patch`)

Patch fixtures are unified diffs in the format produced by `git diff`. They MUST:

- Include at least one `@@` hunk header.
- Reference realistic filenames (`tests/OrderService.test.js`, not `test.js`).
- Contain realistic surrounding context lines (3 lines before and after the change).
- Represent a change a real agent might make to pass a failing CI run.

A patch fixture MUST NOT be crafted to trigger the ratchet by accident.
The attack vector MUST be intentional: an assertion is removed, a skip is added,
a threshold is deleted.

### 3.2 JSON fixtures (`.json`)

JSON fixtures represent structured objects (work items, knowledge packets, config).
They MUST be valid JSON and MUST satisfy the target schema in all fields except the
one under attack. For example, a work-item fixture testing identity collapse MUST
have a valid `allowed_edit_set`, `gates`, and `state`, with only `maker_id ===
checker_id` as the defect.

### 3.3 YAML fixtures (`.yaml`)

YAML fixtures are validated by the config validator. They MUST be parseable YAML.
An attack fixture MUST be a valid config document with exactly one safety violation.

### 3.4 Fixture stability

Fixtures are normative: they are part of the conformance claim. A conformant
implementation MUST run the published fixtures unchanged. An implementation that
modifies fixtures to make scenarios pass is non-conformant, regardless of score.

---

## 4. Porting to Another Implementation

To run AgentProof against a different governed autonomy framework:

### 4.1 Copy the agentproof directory

```
cp -r agentproof/ <target-repo>/agentproof/
```

The runner, fixtures, and SPEC are portable. Scenario files require path updates.

### 4.2 Update control paths in each scenario

Each scenario references one or more control scripts by absolute path from the
repo root. Update these paths to the equivalent control in the target implementation:

| Scenarios | Control path to update | Maps to |
|-----------|----------------------|---------|
| AP-01 to AP-04, AP-11 to AP-16 | `scripts/guard-ratchet.mjs` | The anti-gaming ratchet |
| AP-05, AP-06 | `scripts/validate-config.mjs` | The config validator |
| AP-07, AP-10 | `scripts/validate-work-item.mjs` | The work item validator |
| AP-08 | `scripts/validate-knowledge-packet.mjs` | The packet validator |
| AP-09 | `scripts/check-drift.mjs` | The drift guard |

### 4.3 Verify control invocation contracts

Each control MUST accept the arguments the scenario passes:

| Control | Required invocation |
|---------|-------------------|
| Ratchet | `node <ratchet> --diff <path>` (exits 1 on gate-weakening diff) |
| Config validator | `node <validator> <config-path>` (exits 1 on invalid config) |
| Work item validator | `node <validator> <work-item-path>` (exits 1 on invalid item) |
| Packet validator | `node <validator> <packet-path>` (exits 1 on invalid packet) |
| Drift guard | `node <drift-guard>` (exits 1 on schema/prompt/template divergence) |

If the target implementation uses a different CLI interface for these controls,
the scenario files MUST be updated to match. The fixtures MUST remain unchanged.

### 4.4 Run and report

```bash
node agentproof/runner.mjs --json > agentproof-result.json
```

A conformance claim MUST include the full JSON output, the implementation version,
and a link to the fixture directory used. See SPEC.md Section 7 for the full
claim format.

---

## 5. Common Porting Failures

These are the most frequent causes of false PASS results when porting:

**Vacuous scenario.** The control always exits 0, so the attack direction passes
trivially. Verify by intentionally breaking the control (e.g., comment out the
ratchet check) and confirming AP-01 fails.

**Missing clean direction.** A scenario that only tests the attack direction will
pass even if the control rejects everything. Always test a known-good fixture
against the same control invocation.

**Fixture path mismatch.** The fixture files are loaded from paths relative to
the scenario file. If the agentproof directory is moved, verify
`join(here, "../fixtures")` still resolves correctly.

**Control accepts `--diff` but ignores the argument.** Some ratchet implementations
read from stdin. If the control ignores the `--diff` flag and exits 0 by default,
all ratchet scenarios pass vacuously. Verify that the ratchet reads and processes
the fixture content.

**Threshold mismatch.** AP-04 and AP-06 test that specific numeric thresholds are
enforced. If the target implementation uses different threshold keys (e.g., `minCoverage`
instead of `coverageThreshold`), the attack fixture will not trigger the check and
the scenario will report a false PASS. Update the fixture for the target schema
and document the change in your conformance claim.

---

## 6. Versioning

This document and the scenario suite version together. The current version is `1.0-draft`.

When the normative scenario set changes (scenarios added, removed, or fixtures
updated), the version increments. A conformance claim MUST state the AgentProof
version it was tested against. A claim against `1.0-draft` is not equivalent to
a claim against `1.1`.

Backwards-compatible changes (runner output format improvements, additional optional
JSON fields) do not increment the version. Breaking changes to the runner wire
protocol or the scenario interface do.
