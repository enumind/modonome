#!/usr/bin/env node
// Anti-gaming ratchet. Rejects diffs that make gates pass by weakening the gates.
// Runs in CI, outside the agent loop. Zero-false-positive checks only.
// Supports: JavaScript/TypeScript, Python, Java (JUnit/Mockito/JaCoCo),
//           C# .NET (MSTest/NUnit/xUnit/FluentAssertions/Coverlet).
//
// Usage:
//   node scripts/guard-ratchet.mjs <baseRef>     compare working tree to a git ref
//   node scripts/guard-ratchet.mjs --diff <file> check a saved unified diff (for fixtures)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function getDiff() {
  const arg = process.argv[2];
  if (arg === "--diff") {
    return readFileSync(process.argv[3], "utf8");
  }
  const base = arg || "origin/main";
  return execSync(`git diff ${base}...HEAD`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
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
const COVERAGE_CONFIG = /jest\.config\.(js|ts|mjs|cjs)$|pyproject\.toml$/;

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
// TS / JS: broad any
const TS_ANY_ESCAPE   = /(:\s*any\b|\bas\s+any\b)/;
// Java: suppress unchecked cast warnings (equivalent of `as any`)
const JAVA_UNCHECKED  = /@SuppressWarnings\s*\(\s*"unchecked"/;
// C#: suppress compiler warnings wholesale
const DOTNET_PRAGMA   = /#pragma\s+warning\s+disable\b/;

// TypeScript strictness flags disabled.
const TS_STRICT_OFF = /"(strict|noImplicitAny|strictNullChecks|noUnusedLocals)"\s*:\s*false/;

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
for (const line of diff.split("\n")) {
  const m = line.match(/^\+\+\+ b\/(.+)$/);
  if (m) {
    current = m[1];
    files[current] = files[current] || { added: [], removed: [] };
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

  // 1. Assertion removal in test files (all languages). Python test files also
  //    count bare `assert` statements, which have no call parentheses.
  if (isTest) {
    let addedAsserts   = count(added,   ASSERT);
    let removedAsserts = count(removed, ASSERT);
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

  // 5. Coverage threshold removal (all tools: Jest, pytest-cov, JaCoCo, Coverlet).
  const isCoverageSurface = isTsConfig || isCoverageConfig || isJavaBuild || isDotnetBuild || fname === "pom.xml";
  if (isCoverageSurface) {
    for (const l of removed) {
      if (COVERAGE_THRESHOLD.test(l) && !added.some((a) => COVERAGE_THRESHOLD.test(a))) {
        problems.push(`${file}: removes a coverage threshold: ${l.trim()}`);
      }
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
