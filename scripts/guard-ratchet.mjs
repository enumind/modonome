#!/usr/bin/env node
// Anti-gaming ratchet. Rejects diffs that make gates pass by weakening the gates.
// Runs in CI, outside the agent loop. High-signal checks only: inline // and #
// comments are stripped before pattern matching, but block comments and string
// literals are NOT excluded (stripping them would be brittle).
// Supports: JavaScript/TypeScript, Python, Java (JUnit/Mockito/JaCoCo),
//           C# .NET (MSTest/NUnit/xUnit/FluentAssertions/Coverlet).
//
// Usage:
//   node scripts/guard-ratchet.mjs <baseRef>     compare working tree to a git ref
//   node scripts/guard-ratchet.mjs --diff <file> check a saved unified diff (for fixtures)
//   node scripts/guard-ratchet.mjs --staged      check the index against HEAD (pre-commit hooks)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// A git ref this tool will diff against. Refname rules already forbid spaces and
// most shell metacharacters; this keeps the value to the safe subset and to the
// `..`/`...` range syntax the ratchet uses.
const SAFE_REF = /^[A-Za-z0-9._/-]+$/;

function normalizeLF(s) {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function getDiff() {
  const arg = process.argv[2];
  if (arg === "--diff") {
    return normalizeLF(readFileSync(process.argv[3], "utf8"));
  }
  if (arg === "--staged") {
    // A pre-commit hook runs before the commit exists: HEAD is still the parent,
    // so the change under review is the index against HEAD, not a ref...HEAD range.
    const result = spawnSync("git", ["diff", "--cached"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(result.stderr || "git diff --cached failed");
    }
    return normalizeLF(result.stdout);
  }
  const base = arg || "origin/main";
  if (!SAFE_REF.test(base)) {
    throw new Error(`refusing to diff against unsafe ref: ${base}`);
  }
  // Pass git its arguments as an array, never a shell string, so the ref can
  // never be interpreted as a command.
  const result = spawnSync("git", ["diff", `${base}...HEAD`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || `git diff ${base}...HEAD failed`);
  }
  return normalizeLF(result.stdout);
}

// ---------------------------------------------------------------------------
// Language-aware file classification
// ---------------------------------------------------------------------------

// Test files: any language.
const TEST_FILE = new RegExp([
  // JS / TS, including ESM (.mjs/.mts) and CommonJS (.cjs/.cts) extensions
  String.raw`\.(test|spec)\.(c|m)?[jt]sx?$`,
  // Python
  String.raw`_test\.py$`, String.raw`test_.*\.py$`,
  // Java (JUnit 4, JUnit 5, integration tests, Spock)
  String.raw`Test\.java$`, String.raw`Tests\.java$`, String.raw`IT\.java$`, String.raw`Spec\.java$`,
  // Java prefix-style test classes (TestFoo.java). [A-Z] guard excludes Testable.java; [^/]* prevents path leakage.
  String.raw`Test[A-Z][^/]*\.java$`,
  // C# (MSTest, NUnit, xUnit, SpecFlow)
  String.raw`Tests?\.cs$`, String.raw`Spec\.cs$`, String.raw`Should\.cs$`, String.raw`Fixture\.cs$`,
].join("|"));

// Python test files: pytest uses the bare `assert` statement (no call parens),
// which a call-site-only assertion counter cannot see. These need language-aware
// handling for the removal check and a vacuous-assertion check of their own.
const PYTHON_TEST = /(?:^|\/)(?:test_[^/]*|[^/]*_test)\.py$/;

// Source files by language (for non-test type-escape checks).
const JAVA_SRC  = /\.java$/;
const DOTNET_SRC = /\.cs$/;
const TS_SRC    = /\.(c|m)?[jt]sx?$/;

// JaCoCo / Gradle / Coverlet config files.
const JAVA_BUILD   = /^(pom\.xml|build\.gradle(\.kts)?)$/;
const DOTNET_BUILD = /\.(runsettings|csproj|props)$/;
const TS_CONFIG    = /tsconfig.*\.json$/;
const COVERAGE_CONFIG = /(?:jest|vitest)\.config\.(js|ts|mjs|cjs)$|pyproject\.toml$/;

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

// Assertion call sites: all supported test frameworks.
const ASSERT = new RegExp([
  // JS / TS / Python
  String.raw`\b(expect|assert|assertEqual|assertTrue|assertFalse|should)\b\s*\(`,
  // Java: JUnit 4/5, AssertJ, Hamcrest, Mockito
  String.raw`\b(assertEquals|assertNotEquals|assertNotNull|assertNull|assertSame|assertThat|assertThrows|assertDoesNotThrow|assertAll|assertArrayEquals|fail)\s*\(`,
  String.raw`\bverify\s*\(`,
  // C#: MSTest, NUnit, xUnit, FluentAssertions, Moq
  String.raw`Assert\s*\.\s*\w+\s*\(`,
  String.raw`\.Should\s*\(\s*\)`,
  String.raw`\.Verify\s*\(`,
].join("|"), "g");

// Skip / focus annotations: any framework.
const SKIP = new RegExp([
  // JS / TS (Jest, Vitest, Jasmine)
  String.raw`\.(skip|only)\s*\(`,
  String.raw`\b(xit|fit|xdescribe|fdescribe)\s*\(`,
  // Python
  String.raw`@pytest\.mark\.(skip|xfail)\b`,
  // Java (JUnit 4 / JUnit 5)
  String.raw`@Ignore\b`,
  String.raw`@Disabled\b`,
  // Java (TestNG): @Test(enabled = false) disables a test in place.
  String.raw`@Test\s*\(\s*[^)]*\benabled\s*=\s*false\b`,
  // C# (MSTest, NUnit, xUnit)
  String.raw`\[Ignore\b`,
  String.raw`\[Skip\s*\(`,
  String.raw`\[Fact\s*\(\s*Skip`,
  String.raw`\[Theory\s*\(\s*Skip`,
].join("|"));

// Vacuous (tautological) assertions: any framework. A vacuous assertion compares a
// constant against itself, so it can never fail. Agents use it to keep the assertion
// count up (dodging the removal check) while testing nothing. Matching is restricted
// to provably constant tautologies to preserve the zero-false-positive requirement:
// a real value compared to a literal is never flagged, only literal-against-itself.
const LITERAL = String.raw`(true|false|null|undefined|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')`;

const VACUOUS_FIXED = [
  // JS / TS truthiness tautologies (Jest, Vitest, Jasmine).
  /\bexpect\(\s*true\s*\)\s*\.\s*toBeTruthy\s*\(\s*\)/,
  /\bexpect\(\s*false\s*\)\s*\.\s*toBeFalsy\s*\(\s*\)/,
  /\bexpect\(\s*null\s*\)\s*\.\s*toBeNull\s*\(\s*\)/,
  /\bexpect\(\s*undefined\s*\)\s*\.\s*toBeUndefined\s*\(\s*\)/,
  // assertTrue(true) / assertFalse(false): Node assert, Python unittest, JUnit.
  /\bassertTrue\s*\(\s*(?:true|True)\s*[,)]/,
  /\bassertFalse\s*\(\s*(?:false|False)\s*[,)]/,
  // Node assert: assert(true), assert.ok(true).
  /\bassert\s*\(\s*true\s*[,)]/,
  /\bassert\.ok\s*\(\s*true\s*[,)]/,
  // C#: Assert.IsTrue(true) / Assert.True(true) and the false variants.
  /\bAssert\s*\.\s*(?:IsTrue|True)\s*\(\s*true\s*[,)]/,
  /\bAssert\s*\.\s*(?:IsFalse|False)\s*\(\s*false\s*[,)]/,
];

// Equality matchers comparing two identical literals, e.g. expect(1).toBe(1).
const VACUOUS_EQUALITY = [
  new RegExp(String.raw`\bexpect\(\s*${LITERAL}\s*\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\(\s*${LITERAL}\s*\)`),
  new RegExp(String.raw`\b(?:assertEquals|assertEqual)\s*\(\s*${LITERAL}\s*,\s*${LITERAL}\s*[,)]`),
  new RegExp(String.raw`\bAssert\s*\.\s*(?:AreEqual|Equal)\s*\(\s*${LITERAL}\s*,\s*${LITERAL}\s*[,)]`),
];

// Strong (value-comparing) assertions. These pin a concrete expected value, as
// opposed to vacuous-existence matchers (toBeDefined / toBeNull / assertNotNull)
// that pass for almost any value. Replacing a strong assertion with an existence
// check keeps the assertion COUNT up while removing what the test actually proves.
const STRONG_ASSERT = new RegExp([
  // JS / TS (Jest, Vitest, Jasmine)
  String.raw`\.\s*(?:toBe|toEqual|toStrictEqual|toMatchObject|toContain|toHaveBeenCalledWith|toThrow|toBeCloseTo)\s*\(`,
  // JUnit / AssertJ (value comparison)
  String.raw`\b(?:assertEquals|assertArrayEquals|assertSame|assertThat)\s*\(`,
  String.raw`\.\s*isEqualTo\s*\(`,
  // C# (MSTest / NUnit / FluentAssertions)
  String.raw`\bAssert\s*\.\s*(?:AreEqual|AreSame|Equal)\s*\(`,
  String.raw`\.\s*Should\s*\(\s*\)\s*\.\s*Be\s*\(`,
].join("|"), "g");

// Vacuous-existence matchers: pass for nearly any value, prove no concrete result.
const WEAK_EXISTENCE = new RegExp([
  String.raw`\.\s*(?:toBeDefined|toBeUndefined|toBeNull|toBeTruthy|toBeFalsy|toBeNaN)\s*\(\s*\)`,
  String.raw`\b(?:assertNotNull|assertNull)\s*\(`,
  String.raw`\bAssert\s*\.\s*(?:IsNotNull|IsNull|NotNull|Null)\s*\(`,
].join("|"), "g");

// Coverage threshold key/value lines, e.g. `lines: 80` or `branches = 70`. Used
// to catch multi-line zeroing/lowering where the `coverageThreshold` keyword and
// the numeric floor live on different lines of the same hunk.
const COVERAGE_KEY_VALUE =
  /\b(lines|branches|functions|statements|fail_under|minimum)\b\s*[:=]\s*(\d+(?:\.\d+)?)/i;

// Python bare assertion statement (pytest idiom): `assert <expr>` with no call
// parens. Parenthesized forms (`assert(x)`, `assert (x)`) are left to the call-site
// ASSERT counter so they are not double-counted.
const PY_BARE_ASSERT = /^\s*assert\b\s+[^(]/;

// Vacuous Python bare assertions that can never fail.
const PY_VACUOUS_ASSERT = [
  /^\s*assert\s+True\b\s*(?:,.*)?$/,
  /^\s*assert\s+[1-9]\d*\b\s*(?:,.*)?$/,
];

// Type escape injection: language-specific, non-test files only.
// TS / JS: broad any.
// NOTE: inline // and # comments are stripped before matching, but block comments
// and string literals are NOT stripped, so matches inside them are possible.
const TS_ANY_ESCAPE   = /(:\s*any\b|\bas\s+any\b)/;
// Java: suppress unchecked cast warnings (equivalent of `as any`)
const JAVA_UNCHECKED  = /@SuppressWarnings\s*\(\s*"unchecked"/;
// C#: suppress compiler warnings wholesale
const DOTNET_PRAGMA   = /#pragma\s+warning\s+disable\b/;

// TypeScript strictness flags disabled.
const TS_STRICT_OFF = /"(strict|noImplicitAny|strictNullChecks|noUnusedLocals)"\s*:\s*false/;

// Regex to extract a numeric coverage value from a threshold line, anchored to
// known coverage keywords to avoid false positives on arbitrary numbers.
// NOTE: multi-line config blocks (value on a different line) remain a known limitation.
const COVERAGE_VALUE_RE =
  /(?:lines|branches|functions|statements|fail_under|minimum|Threshold)[^\d]*(\d+(?:\.\d+)?)/i;

// Coverage threshold removal: all supported tools.
const COVERAGE_THRESHOLD = new RegExp([
  // Jest / Vitest
  String.raw`coverageThreshold`,
  // pytest-cov
  String.raw`fail_under`,
  // JaCoCo (pom.xml and build.gradle)
  String.raw`<minimum>`,
  String.raw`\bjacocoTestCoverageVerification\b`,
  String.raw`\bviolationRules\b`,
  // Coverlet (.NET)
  String.raw`<Threshold>`,
  String.raw`--threshold\b`,
].join("|"));

// ---------------------------------------------------------------------------
// Parse unified diff into per-file added / removed lines
// ---------------------------------------------------------------------------

const diff = getDiff();
const problems = [];

const files = {};
let current = null;
let preimage = null;
for (const line of diff.split("\n")) {
  // Track the pre-image path so deletions ("+++ /dev/null") can be attributed.
  const mPre = line.match(/^--- a\/(.+)$/);
  if (mPre) {
    preimage = mPre[1];
    continue;
  }
  const mPost = line.match(/^\+\+\+ (.+)$/);
  if (mPost) {
    const rhs = mPost[1];
    // Deleted files emit "+++ /dev/null": attribute removed lines to the pre-image.
    if (rhs === "/dev/null") {
      current = preimage;
    } else {
      current = rhs.replace(/^b\//, "");
    }
    if (current) files[current] = files[current] || { added: [], removed: [] };
    continue;
  }
  if (!current) continue;
  if (line.startsWith("+") && !line.startsWith("+++")) files[current].added.push(line.slice(1));
  else if (line.startsWith("-") && !line.startsWith("---")) files[current].removed.push(line.slice(1));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function count(lines, re) {
  let n = 0;
  for (const l of lines) {
    const matches = l.match(re);
    if (matches) n += matches.length;
  }
  return n;
}

// Map common Unicode homoglyphs (Cyrillic / Greek / fullwidth lookalikes) back to
// their ASCII equivalents so that an evasion like `.ѕkip` (Cyrillic U+0455) cannot
// slip past the ASCII-only SKIP/ASSERT patterns. (AP-22)
const HOMOGLYPHS = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c",
  "х": "x", "ѕ": "s", "і": "i", "ј": "j", "һ": "h",
  "ԁ": "d", "ԛ": "q", "ɡ": "g", "ɴ": "n", "ο": "o",
  "α": "a", "ι": "i", "κ": "k", "ν": "v", "ρ": "p",
  "Ѕ": "s", "А": "a", "Е": "e", "О": "o", "С": "c",
};
function deconfuse(line) {
  let out = "";
  for (const ch of line) out += HOMOGLYPHS[ch] || ch;
  return out;
}
// True when a line carries a non-ASCII character anywhere outside an inline comment.
const NON_ASCII = /[^\x00-\x7F]/;

function stripInlineComment(line) {
  // Remove // comments (JS/TS/Java/C#) and # comments (Python).
  return line.replace(/\/\/.*$/, "").replace(/#.*$/, "");
}

function isVacuousAssertion(line) {
  const clean = stripInlineComment(line);
  if (VACUOUS_FIXED.some((re) => re.test(clean))) return true;
  for (const re of VACUOUS_EQUALITY) {
    const m = clean.match(re);
    if (m && m[1] === m[2]) return true;
  }
  return false;
}

function countBareAsserts(lines) {
  let n = 0;
  for (const l of lines) {
    if (PY_BARE_ASSERT.test(stripInlineComment(l))) n++;
  }
  return n;
}

function isVacuousPyAssert(line) {
  const clean = stripInlineComment(line);
  return PY_VACUOUS_ASSERT.some((re) => re.test(clean));
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

for (const [file, { added, removed }] of Object.entries(files)) {
  const fname = file.split("/").pop();
  const isTest    = TEST_FILE.test(file);
  const isPyTest  = PYTHON_TEST.test(file);
  const isJavaSrc = JAVA_SRC.test(file) && !isTest;
  const isDotnetSrc = DOTNET_SRC.test(file) && !isTest;
  const isTsSrc   = TS_SRC.test(file) && !isTest;
  const isTsConfig   = TS_CONFIG.test(fname);
  const isJavaBuild  = JAVA_BUILD.test(fname);
  const isDotnetBuild = DOTNET_BUILD.test(fname);
  const isCoverageConfig = COVERAGE_CONFIG.test(fname);
  // Rename-evasion defense (AP-18): treat ANY JS/TS/JSON config-shaped file that
  // mentions coverageThreshold in its diff as a coverage surface, even if it has
  // been renamed away from the canonical jest.config.js / vitest.config.ts names.
  const CONFIGISH_EXT = /\.(c|m)?[jt]s$|\.json$/;
  const mentionsCoverageThreshold =
    CONFIGISH_EXT.test(fname) &&
    [...added, ...removed].some((l) => /coverageThreshold/.test(l));

  // 1. Assertion removal in test files (all languages). Python test files also
  //    count bare `assert` statements, which have no call parentheses.
  //
  // Exception: a completely deleted file that only used a test framework not
  // configured in this repository (e.g., vitest with no vitest.config.*) is
  // dead code whose removal is not a governance regression. Detection: no added
  // lines (full deletion) and the removed content imports from 'vitest'.
  const isOrphanedFramework =
    added.length === 0 &&
    removed.some((l) => /from\s+['"]vitest['"]/.test(l));
  if (isTest && !isOrphanedFramework) {
    // Strip inline comments before counting: an assertion commented out in place
    // (removed line: real assertion, added line: `// ` + same call) would otherwise
    // net to zero delta, since the raw ASSERT regex matches inside comments too.
    let addedAsserts   = count(added.map(stripInlineComment),   ASSERT);
    let removedAsserts = count(removed.map(stripInlineComment), ASSERT);
    if (isPyTest) {
      addedAsserts   += countBareAsserts(added);
      removedAsserts += countBareAsserts(removed);
    }
    if (removedAsserts > addedAsserts) {
      problems.push(`${file}: removes more test assertions than it adds (+${addedAsserts} / -${removedAsserts}).`);
    }
  }

  // 2. Skip / focus annotation injection in test files (all languages).
  if (isTest) {
    for (const l of added) {
      if (SKIP.test(l)) {
        problems.push(`${file}: adds a skipped or focused test: ${l.trim()}`);
      }
    }
  }

  // 2-homoglyph. Unicode homoglyph evasion (AP-22). An added test line that is pure
  // ASCII after de-confusing but carries non-ASCII lookalikes is an attempt to hide a
  // skip/focus construct (e.g. `.ѕkip(` with a Cyrillic s) from the ASCII patterns.
  // Any non-ASCII in test code that de-confuses into a gate-weakening token is rejected.
  if (isTest) {
    for (const l of added) {
      const clean = stripInlineComment(l);
      if (!NON_ASCII.test(clean)) continue;
      const norm = deconfuse(clean);
      ASSERT.lastIndex = 0; STRONG_ASSERT.lastIndex = 0;
      if (SKIP.test(norm) || ASSERT.test(norm) || STRONG_ASSERT.test(norm)) {
        problems.push(`${file}: adds a gate construct disguised with Unicode homoglyphs: ${l.trim()}`);
      }
    }
  }

  // 2b. Vacuous (tautological) assertion injection in test files (all languages).
  // Catches keeping the assertion count up with assertions that can never fail.
  if (isTest) {
    for (const l of added) {
      if (isVacuousAssertion(l)) {
        problems.push(`${file}: adds a vacuous assertion that can never fail: ${l.trim()}`);
      }
    }
  }

  // 2c. Vacuous Python bare assertions (assert True, assert 1) in test files.
  if (isPyTest) {
    for (const l of added) {
      if (isVacuousPyAssert(l)) {
        problems.push(`${file}: adds a vacuous Python assertion that can never fail: ${l.trim()}`);
      }
    }
  }

  // 3a. TS/JS broad type escape injection in non-test source files.
  if (isTsSrc) {
    for (const l of added) {
      const clean = stripInlineComment(l);
      if (TS_ANY_ESCAPE.test(clean)) {
        problems.push(`${file}: adds a broad type escape: ${l.trim()}`);
      }
    }
  }

  // 3b. Java unchecked suppression in non-test source files.
  if (isJavaSrc) {
    for (const l of added) {
      if (JAVA_UNCHECKED.test(l)) {
        problems.push(`${file}: adds @SuppressWarnings("unchecked"): address the type safety issue directly: ${l.trim()}`);
      }
    }
  }

  // 3c. C# pragma warning disable in non-test source files.
  if (isDotnetSrc) {
    for (const l of added) {
      if (DOTNET_PRAGMA.test(l)) {
        problems.push(`${file}: adds #pragma warning disable: fix the warning rather than suppressing it: ${l.trim()}`);
      }
    }
  }

  // 4. TypeScript strictness flags weakened.
  if (isTsConfig) {
    for (const l of added) {
      if (TS_STRICT_OFF.test(l)) {
        problems.push(`${file}: weakens TypeScript strictness: ${l.trim()}`);
      }
    }
  }

  // 5. Coverage threshold removal or lowering (all tools: Jest, pytest-cov, JaCoCo, Coverlet).
  const isCoverageSurface = isTsConfig || isCoverageConfig || isJavaBuild || isDotnetBuild || fname === "pom.xml" || mentionsCoverageThreshold;
  if (isCoverageSurface) {
    for (const l of removed) {
      if (!COVERAGE_THRESHOLD.test(l)) continue;
      const matchingAdded = added.filter((a) => COVERAGE_THRESHOLD.test(a));
      if (matchingAdded.length === 0) {
        problems.push(`${file}: removes a coverage threshold: ${l.trim()}`);
      } else {
        // Check whether a matching added line lowers the numeric value.
        const oldM = l.match(COVERAGE_VALUE_RE);
        if (oldM) {
          const oldVal = parseFloat(oldM[1]);
          for (const a of matchingAdded) {
            const newM = a.match(COVERAGE_VALUE_RE);
            if (newM && parseFloat(newM[1]) < oldVal) {
              problems.push(`${file}: lowers a coverage threshold (${oldVal} -> ${parseFloat(newM[1])}): ${l.trim()}`);
              break;
            }
          }
        }
      }
    }

    // 5b. Multi-line zeroing / lowering (AP-17). The `coverageThreshold` keyword and
    // its numeric floor often live on separate lines, so a `lines: 80 -> lines: 0`
    // edit leaves the keyword line untouched and slips past check 5. Compare per-key
    // numeric floors across the hunk: a removed `key: N` whose added counterpart is
    // lower (or absent while the key survives elsewhere) is a lowering.
    const removedKeys = new Map();
    for (const l of removed) {
      const m = stripInlineComment(l).match(COVERAGE_KEY_VALUE);
      if (m) removedKeys.set(m[1].toLowerCase(), parseFloat(m[2]));
    }
    const addedKeys = new Map();
    for (const l of added) {
      const m = stripInlineComment(l).match(COVERAGE_KEY_VALUE);
      if (m) addedKeys.set(m[1].toLowerCase(), parseFloat(m[2]));
    }
    for (const [key, oldVal] of removedKeys) {
      if (addedKeys.has(key)) {
        const newVal = addedKeys.get(key);
        if (newVal < oldVal) {
          problems.push(`${file}: lowers the ${key} coverage floor (${oldVal} -> ${newVal}).`);
        }
      }
    }
  }

  // 6. Assertion-strength downgrade (AP-20). Replacing value-comparing assertions
  // (toBe / toEqual / assertEquals) with vacuous-existence checks (toBeDefined /
  // assertNotNull) keeps the assertion COUNT constant while deleting what the test
  // proves. The count-only check (check 1) cannot see this. Flag a net decrease in
  // strong assertions that coincides with newly added existence-only checks.
  if (isTest) {
    // Same comment-stripping rationale as check 1: a strong assertion commented
    // out in place must not net to zero against its own commented reappearance.
    const removedClean  = removed.map(stripInlineComment);
    const addedClean    = added.map(stripInlineComment);
    const strongRemoved = count(removedClean, STRONG_ASSERT);
    const strongAdded   = count(addedClean,   STRONG_ASSERT);
    const weakAdded     = count(addedClean,   WEAK_EXISTENCE);
    if (strongRemoved > strongAdded && weakAdded > 0) {
      problems.push(
        `${file}: downgrades assertion strength (strong value-checks ${strongAdded} added / ${strongRemoved} removed, replaced by ${weakAdded} existence-only check(s)). Existence checks do not prove the expected value.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

if (problems.length > 0) {
  console.error("Anti-gaming ratchet rejected this change:\n");
  for (const p of problems) console.error("  - " + p);
  console.error("\nDo not weaken gates to go green. Get owner review for an intended exception.");
  process.exit(1);
}
console.log("Anti-gaming ratchet: no weakened tests, skips, type escapes, or loosened gates.");
