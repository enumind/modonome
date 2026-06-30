# Anti-Gaming Ratchet Specification

**Version:** 0.1-draft  
**Status:** Draft for community review  
**Audience:** Framework authors, CI platform engineers, OpenSSF Securing Software Repositories WG  

The key words MUST, MUST NOT, REQUIRED, SHALL, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and
OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## Abstract

The anti-gaming ratchet is a CI-resident control that prevents autonomous software agents
from making gates pass by weakening the gates. It operates on a unified diff, applies a
defined set of zero-false-positive checks, and exits with a non-zero status if any check
fails. This specification defines the interface, the normative check set, and the conformance
requirements for a portable ratchet implementation.

---

## 1. Problem Statement

Autonomous agents are trained to keep builds green. A build that is failing is a build the
agent is motivated to fix. The naive path to a green build (removing the assertion that fails,
skipping the test that is hard to satisfy, widening the type that causes an error) is also
the path that erodes test coverage, type safety, and code quality over time. No individual
change looks alarming. The cumulative effect is a test suite that no longer tests, a type
system that no longer types, and a CI pipeline whose green status no longer means the code
works.

Existing controls do not catch this:

- Human code review catches it when a reviewer notices it, which requires knowing what the
  test should have asserted before the agent changed it.
- CI gates catch regressions but cannot detect when the agent writes new tests that assert
  less than the old tests, or skips tests that were previously running.
- Branch protection prevents direct pushes but not pull requests where the agent has
  written, reviewed, and is requesting to merge its own change.

The anti-gaming ratchet is a structural control that runs in CI, outside the agent's write
scope, on every pull request. It compares the proposed diff against the base branch and
rejects any change that makes a gate pass by weakening the gate. It does not require a human
to notice.

---

## 2. Definitions

**Diff:** A unified diff in the format produced by `git diff`, `diff -u`, or equivalent.
The ratchet operates exclusively on unified diffs and MUST NOT require access to the
full file contents of either the base or the proposed branch.

**Gate:** A deterministic check that a codebase must pass before a change can be merged.
Examples: test suite passes, type checker passes, coverage threshold met, schema validation
passes.

**Gate weakening:** A change to the codebase that causes a previously failing gate to pass
not by fixing the underlying condition but by reducing what the gate checks. Examples:
removing an assertion, skipping a test, disabling a type check, deleting a coverage threshold.

**Zero-false-positive check:** A check that never flags correct, intentional behavior.
A check that produces false positives trains operators to disable it, which is worse than no
check. The ratchet MUST contain only zero-false-positive checks. Heuristic or probabilistic
signals MUST be advisory, not blocking.

**Approved exception:** A gate weakening that has been explicitly reviewed and approved by a
principal, recorded out-of-band (for example, in a work item escalation record), and is
outside the scope of the ratchet's automated judgment.

---

## 3. Interface

### 3.1 Input

A conformant ratchet MUST accept a unified diff via one of two mechanisms:

1. A git ref: the ratchet computes `git diff <base-ref>...HEAD` and checks the result.
2. A diff file: the ratchet reads a unified diff from a file path provided as an argument.

A conformant ratchet MUST operate correctly on diffs that touch multiple files.

### 3.2 Output

On success (no gate weakening detected):

- MUST exit with status 0.
- SHOULD emit a single line to stdout confirming passage.

On failure (one or more gate weakenings detected):

- MUST exit with a non-zero status (conventionally 1).
- MUST emit to stderr one human-readable line per violation, each identifying:
  - The file path.
  - The specific pattern that triggered the check.
  - The line content (truncated if necessary).
- MUST NOT exit silently on failure.

### 3.3 Placement

A conformant ratchet MUST run in CI as a separate job or step that the agent cannot modify.
Specifically:

- The ratchet script MUST reside on a path that is in the implementation's protected-path
  set (see the Governed Autonomy Specification, Section 8).
- The CI step that invokes the ratchet MUST be defined in a file the agent cannot
  autonomously modify and merge.

A ratchet that the agent can disable by modifying the CI definition or the ratchet script
itself provides no governance guarantee.

---

## 4. Normative Checks

This section defines the checks a conformant ratchet MUST perform. Each check targets a
specific gate-weakening pattern and MUST satisfy the zero-false-positive requirement.

### 4.1 Test Assertion Removal

**Condition:** For any file matching the test file pattern (see Section 4.1.1), the number of
assertion call sites removed by the diff exceeds the number of assertion call sites added.

**Rationale:** Removing assertions reduces what the test suite verifies. An agent that cannot
fix a failing assertion may remove it instead. The count comparison is symmetric: adding new
assertions while removing old ones is permitted when the net count does not decrease.

**Implementation note:** The check MUST count assertion call sites per file, not per diff
hunk. A diff that removes assertions in one hunk and adds them in another MUST be assessed
on the net count for that file.

#### 4.1.1 Test File Pattern

A conformant ratchet MUST recognize files matching at least the following patterns as test
files:

- `*.test.js`, `*.test.ts`, `*.test.jsx`, `*.test.tsx`
- `*.spec.js`, `*.spec.ts`, `*.spec.jsx`, `*.spec.tsx`
- `*_test.py`, `test_*.py`
- `*Test.java`, `*Tests.java`, `*IT.java`, `*Spec.java` : JUnit 4/5, Spock
- `*Tests.cs`, `*Test.cs`, `*Spec.cs`, `*Should.cs`, `*Fixture.cs` : MSTest, NUnit, xUnit

Implementors SHOULD make this pattern set configurable to accommodate additional conventions.

#### 4.1.2 Assertion Patterns

A conformant ratchet MUST count call sites matching at least the following patterns as
assertions:

- `expect(` : Jest, Vitest, Jasmine, Playwright
- `assert(`, `assert.*(` : Node assert, Python unittest, Go testing
- `assertEqual(`, `assertTrue(` : xUnit-family
- `should(` : BDD-style
- `assertEquals(`, `assertNotNull(`, `assertThat(`, `assertThrows(`, `assertAll(`, `verify(` : JUnit 4/5, AssertJ, Mockito
- `Assert.*(` : MSTest, NUnit, xUnit (C#)
- `.Should()` : FluentAssertions (C#)
- `.Verify(` : Moq (C#)

Implementors SHOULD make this pattern set configurable.

### 4.2 Test Skip and Focus Injection

**Condition:** The diff adds any line in a test file that matches a skip or focus annotation.

**Rationale:** Skip annotations exclude test cases from execution. Focus annotations exclude
all other test cases. Both produce a suite that appears to pass while running fewer cases
than before the change.

**Patterns a conformant ratchet MUST detect:**

- `.skip(` : Jest, Vitest, Jasmine (also `describe.skip`, `it.skip`, `test.skip`)
- `.only(` : Jest, Vitest, Jasmine focus
- `xit(`, `fit(`, `xdescribe(`, `fdescribe(` : Jasmine legacy
- `@pytest.mark.skip` : Python pytest
- `@Ignore` : JUnit 4
- `@Disabled` : JUnit 5
- `[Ignore]` : MSTest, NUnit (C#)
- `[Skip(` : xUnit (C#)
- `[Fact(Skip=` : xUnit (C#)
- `[Theory(Skip=` : xUnit (C#)

Implementors SHOULD make this pattern set configurable.

**Note:** The check applies to added lines only. Removing a `.skip` annotation is not a
violation; it is the correct direction of change.

### 4.3 Broad Type Escape Injection

**Condition:** The diff adds any line in a non-test TypeScript or JavaScript file that
introduces a broad type escape, after stripping inline comments.

**Rationale:** Type escapes silence the type checker without fixing the underlying type
unsafety. An agent that cannot resolve a type error may widen the type to `any` instead.

**Patterns a conformant ratchet MUST detect in added lines (non-test files only):**

- `: any` : explicit `any` annotation
- `as any` : type assertion to `any`

**Comment stripping requirement:** The check MUST strip inline comments (`//` to end of
line) before pattern matching to avoid false positives on commented-out code.

**Test file exclusion:** This check MUST NOT apply to test files. Test utilities frequently
use `any` as a deliberate fixture type.

### 4.4 Compiler Strictness Weakening

**Condition:** The diff adds any line to a TypeScript configuration file that sets a
strictness flag to `false`.

**Rationale:** Disabling compiler strictness causes the type checker to accept code it would
otherwise reject. This is a gate weakening that affects the entire codebase, not the changed file alone.

**Patterns a conformant ratchet MUST detect:**

- `"strict": false`
- `"noImplicitAny": false`
- `"strictNullChecks": false`
- `"noUnusedLocals": false`

**Scope:** This check applies to files matching `tsconfig*.json`.

### 4.5 Coverage Threshold Removal

**Condition:** The diff removes a line containing a coverage threshold key from a coverage
configuration file, and no line adding the same key appears elsewhere in the diff for that
file.

**Rationale:** Coverage thresholds enforce a minimum level of test coverage. Removing the
threshold causes coverage gates to pass regardless of actual coverage.

**Patterns a conformant ratchet MUST detect in removed lines:**

- `coverageThreshold` : Jest, Vitest
- `fail_under` : Python coverage.py
- `<minimum>`, `jacocoTestCoverageVerification`, `violationRules` : JaCoCo (Maven/Gradle)
- `<Threshold>`, `--threshold` : Coverlet (.NET)

**False-positive prevention:** The check MUST verify that the removed key does not reappear
in the added lines of the same file before flagging. A threshold that is moved or reformatted
within the same file MUST NOT be flagged.

### 4.6 Language-Specific Type Safety Suppression

**Condition:** The diff adds any line in a non-test source file that suppresses a type safety
warning via a compiler directive.

**Rationale:** Suppressing type safety warnings silences the compiler without resolving the
underlying type unsafety. This is the Java and C# equivalent of injecting `as any` in TypeScript.

**Java (non-test `.java` files):**

- `@SuppressWarnings("unchecked")` : suppresses unchecked cast warnings, masking type-unsafe casts

**C# (non-test `.cs` files):**

- `#pragma warning disable` : disables one or more compiler warnings wholesale

**Test file exclusion:** This check MUST NOT apply to test files. Test code legitimately
uses unchecked casts in fixture construction.

### 4.7 Vacuous Assertion Injection

**Condition:** The diff adds any line in a test file containing an assertion that compares a
constant against itself and therefore can never fail.

**Rationale:** Once an agent learns the assertion count is checked (Section 4.1), the next
evasion is to keep the count up with assertions that test nothing: `expect(true).toBe(true)`,
`assertTrue(true)`, `Assert.IsTrue(true)`, or an equality matcher with two identical literals
such as `expect(1).toBe(1)`. The net assertion count does not drop, so the removal check
passes, but the suite verifies less than before. This check closes that gap.

**Patterns a conformant ratchet MUST detect in added lines (test files only):**

- Truthiness tautologies: `expect(true).toBeTruthy()`, `expect(false).toBeFalsy()`,
  `expect(null).toBeNull()`, `expect(undefined).toBeUndefined()`
- Boolean constant assertions: `assertTrue(true)`, `assertFalse(false)` (Node assert, Python
  unittest, JUnit), `assert(true)`, `assert.ok(true)` (Node), `Assert.IsTrue(true)`,
  `Assert.True(true)`, `Assert.IsFalse(false)`, `Assert.False(false)` (C#)
- Equality matchers with two identical literals: `expect(LIT).toBe(LIT)`,
  `expect(LIT).toEqual(LIT)`, `assertEquals(LIT, LIT)`, `Assert.AreEqual(LIT, LIT)`, where
  both operands are the same boolean, number, string, `null`, or `undefined` literal

**Zero-false-positive boundary:** The equality check fires only when both operands are the
same literal token. An assertion comparing a real value to a literal (`expect(sum(2, 2)).toBe(4)`)
is never flagged, because one operand is not a literal. Comment stripping is applied before
matching.

**Test file exclusion does not apply:** Unlike type-escape checks, this check applies to test
files specifically, because that is where vacuous assertions are used to game the count.

### 4.8 Python Bare Assertion Integrity

**Condition (two parts):**

1. For Python test files, the ratchet MUST count bare `assert` statements (the pytest idiom
   `assert expr`, with no parentheses) toward the assertion total used by the removal check in
   Section 4.1, in addition to call-site assertions such as `self.assertEqual(...)`.
2. The diff adds any line in a Python test file that is a vacuous bare assertion which can
   never fail: `assert True` or `assert <non-zero integer literal>` (optionally followed by a
   message).

**Rationale:** pytest's dominant assertion form is the bare `assert` statement, which has no
call parentheses and is therefore invisible to a call-site-only assertion counter. Without
part 1, an agent could delete `assert response.status == 200` lines from a pytest suite and
the removal check would not notice. Part 2 is the Python analogue of Section 4.7: `assert True`
keeps a test "passing" while asserting nothing.

**Patterns a conformant ratchet MUST detect:**

- Bare assertion statement (counted, not blocked): a line matching `assert` followed by
  whitespace and a non-parenthesis token, after comment stripping
- Vacuous bare assertion (blocked when added in a test file): `assert True`,
  `assert <non-zero integer literal>`

**Zero-false-positive boundary:** Counting bare asserts toward the removal total is symmetric
across added and removed lines, so reformatting does not trigger a false positive. The vacuous
check fires only on `assert True` and non-zero integer literals, never on `assert <expression>`
where the expression references real values. `assert(expr)` and `assert (expr)` (parenthesized
forms) are counted by the existing call-site patterns, not double-counted.

**Scope:** Both parts apply to Python test files only (`*_test.py`, `test_*.py`).

---

## 5. Advisory Signals (Non-Normative)

The following patterns MAY be emitted as advisory warnings but MUST NOT cause the ratchet to
exit non-zero. They fail the zero-false-positive requirement when used as blocking gates.

- Snapshot file changes that reduce the number of assertions captured.
- Test files whose line count decreases without a proportional decrease in test case count.
- Dependency changes unrelated to the declared work item scope (requires external context).
- Hand-edited generated files (requires knowledge of which files are generated).
- Deleted test files (deletion of an entire file may be correct; the check cannot know).

Implementations that wish to make any advisory signal blocking MUST provide an approved
exception mechanism that a principal can use to acknowledge the signal without modifying the
ratchet.

---

## 6. Conformance

### 6.1 Minimum Conformance

A ratchet implementation is conformant if it implements all five normative checks (Sections
4.1 through 4.5), satisfies the zero-false-positive requirement for each, implements the
interface defined in Section 3, and runs in CI outside the agent's write scope (Section 3.3).

### 6.2 Extended Conformance

An extended-conformant ratchet additionally:

- Makes test file patterns and assertion patterns configurable per repository.
- Emits structured output (JSON) in addition to human-readable output, for CI platform
  integration.
- Provides an approved-exception mechanism that allows a principal to acknowledge a specific
  violation without modifying the ratchet script.

### 6.3 Reference Implementation

The reference implementation is `scripts/guard-ratchet.mjs` in the Modonome repository
(github.com/enumind/modonome). It satisfies minimum conformance. The reference test suite
is AgentProof scenarios AP-01 through AP-04 in `agentproof/scenarios/`.

### 6.4 Conformance Test Suite

Any implementation claiming conformance MUST pass AgentProof scenarios AP-01 through AP-04.
These scenarios are language-agnostic: the fixture diffs are standard unified diffs, and the
expected exit codes are 0 (clean) or 1 (violation). The scenarios can be adapted to invoke
any ratchet implementation by changing the command in the scenario script.

---

## 7. Relationship to Existing Standards

### 7.1 OWASP Top 10 for Agentic Applications

The anti-gaming ratchet addresses **AG07 (Rogue Agent Actions)** directly: it prevents an
agent from taking the action of weakening tests to produce a passing CI status. It supports
**AG05 (Excessive Autonomy)** by ensuring that autonomous merges cannot degrade code quality
without detection.

### 7.2 OpenSSF Scorecard

The ratchet contributes to the **CI-Tests** and **Branch-Protection** checks in OpenSSF
Scorecard by ensuring that CI gates cannot be trivially circumvented by an autonomous author.

### 7.3 NIST AI RMF

The ratchet implements the **Measure** function: it provides a deterministic, repeatable
measurement of whether a proposed change degrades the codebase's quality gates.

---

## 8. Extending the Ratchet

Implementations MAY add checks beyond the five defined in Section 4. Any additional check
MUST satisfy the zero-false-positive requirement before it is made blocking. The recommended
process for adding a check:

1. Implement the check in advisory mode (warn, do not block).
2. Run it on the repository's own history for a period sufficient to assess false-positive
   rate (suggested: 90 days or 100 merged PRs, whichever comes first).
3. If no false positives are observed, promote the check to blocking.
4. Document the check in an extension of this specification.

---

*This specification is published under the MIT License as part of the Modonome project.*  
*Submissions and extensions: github.com/enumind/modonome*  
*Proposed for adoption by: OpenSSF Securing Software Repositories WG, OWASP Agentic WG*
