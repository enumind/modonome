#!/usr/bin/env node
// Anti-gaming ratchet. Rejects diffs that make gates pass by weakening the gates.
// Runs in CI, outside the agent loop. High-signal checks only: inline // and #
// comments are stripped before pattern matching. For the type-escape check,
// string literals and block comments that provably open and close on the same
// line are also stripped (false-positive-only, ADR-045); multi-line spans are
// left alone because a line-based scanner cannot see their state.
// Supports: JavaScript/TypeScript, Python, Java (JUnit/Mockito/JaCoCo),
//           C# .NET (MSTest/NUnit/xUnit/FluentAssertions/Coverlet).
//
// Usage:
//   node scripts/guard-ratchet.mjs <baseRef>     compare working tree to a git ref
//   node scripts/guard-ratchet.mjs --diff <file> check a saved unified diff (for fixtures)
//   node scripts/guard-ratchet.mjs --staged      check the index against HEAD (pre-commit hooks)
// Add --json or --sarif (SARIF 2.1.0) to any of the above for machine-readable output
// with stable MR### rule codes, for CI annotations and security dashboards.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";
import {
  TEST_FILE,
  PYTHON_TEST,
  JAVA_SRC,
  DOTNET_SRC,
  TS_SRC,
  JAVA_BUILD,
  DOTNET_BUILD,
  TS_CONFIG,
  COVERAGE_CONFIG,
} from "./lib/file-classifiers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

// A git ref this tool will diff against. Refname rules already forbid spaces and
// most shell metacharacters; this keeps the value to the safe subset and to the
// `..`/`...` range syntax the ratchet uses.
const SAFE_REF = /^[A-Za-z0-9._/-]+$/;

// Output format. The default (human) path prints to stderr and stays byte-identical
// so the AgentProof scenarios that assert on the rejection text keep passing. The
// --json and --sarif flags add machine-readable output for CI annotations, security
// tabs (SARIF 2.1.0), and the attestation predicate, without touching the human path.
// Format flags are stripped from the positional args getDiff reads, so they compose
// with --diff/--staged/<ref> in any order.
const RAW_ARGS = process.argv.slice(2);
const FORMAT = (RAW_ARGS.includes("--sarif") || RAW_ARGS.includes("--format=sarif"))
  ? "sarif"
  : (RAW_ARGS.includes("--json") || RAW_ARGS.includes("--format=json"))
    ? "json"
    : "human";
const ARGS = RAW_ARGS.filter((a) => !/^--(json|sarif|format=(json|sarif))$/.test(a));

function normalizeLF(s) {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function getDiff() {
  const arg = ARGS[0];
  if (arg === "--diff") {
    return normalizeLF(readFileSync(ARGS[1], "utf8"));
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
      throw new Error(result.stderr || formatMessage("gate.ratchet.staged-diff-failed", {}, overrides).message);
    }
    return normalizeLF(result.stdout);
  }
  const base = arg || "origin/main";
  if (!SAFE_REF.test(base)) {
    throw new Error(formatMessage("gate.ratchet.unsafe-ref", { ref: base }, overrides).message);
  }
  // Pass git its arguments as an array, never a shell string, so the ref can
  // never be interpreted as a command.
  const result = spawnSync("git", ["diff", `${base}...HEAD`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || formatMessage("gate.ratchet.diff-failed", { base }, overrides).message);
  }
  return normalizeLF(result.stdout);
}

// ---------------------------------------------------------------------------
// Language-aware file classification
// ---------------------------------------------------------------------------
// TEST_FILE, PYTHON_TEST, JAVA_SRC, DOTNET_SRC, TS_SRC, JAVA_BUILD, DOTNET_BUILD,
// TS_CONFIG, and COVERAGE_CONFIG are imported from ./lib/file-classifiers.mjs so the
// ratchet and other gate-integrity tools classify paths from one source of truth.

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

// Assertion call sites: all supported test frameworks.
const ASSERT = new RegExp([
  // JS / TS / Python
  String.raw`\b(expect|assert|assertEqual|assertTrue|assertFalse|should)\b\s*\(`,
  // Node built-in assert module, member-call style: assert.equal, assert.strictEqual,
  // assert.deepEqual, assert.match, assert.rejects, assert.throws, assert.ok, and so
  // on. The bare-call pattern above (`\bassert\b\s*\(`) does not match this: after
  // "assert" comes "." not "(". This is the dominant assertion style in this
  // project's own test suite (node:assert/strict), so its absence was a real gap.
  String.raw`\bassert\s*\.\s*\w+\s*\(`,
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
  // Node built-in assert module, value-comparing member calls (see ASSERT above).
  String.raw`\bassert\s*\.\s*(?:equal|strictEqual|deepEqual|deepStrictEqual|match|throws|rejects)\s*\(`,
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
  // Node built-in assert module, existence-only member calls (see ASSERT above):
  // ok/ifError prove truthiness or absence-of-error, not a concrete expected value.
  String.raw`\bassert\s*\.\s*(?:ok|ifError)\s*\(`,
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
// NOTE: inline // and # comments are stripped before matching, and same-line
// string literals / block comments are stripped for this check (ADR-045).
// Matches inside multi-line strings or block comments remain possible: the
// line-local stripper deliberately bails on anything it cannot prove closed.
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

// Advisory-only repo-level assertion tally (ADR-045). This is deliberately NOT a
// check: the per-file assertion-removal check above already flags any single test
// file whose removed-assertion count exceeds its added count, and a repo-level sum
// of non-negative per-file deltas can never itself go negative without at least one
// per-file delta already being negative and already reported. Summing therefore adds
// no new detection power; it exists purely to give a human reviewer one line of
// cross-file context (how many test files this diff touches, and the aggregate
// shape) alongside the per-file findings above. It never affects the exit code.
let assertionTally = { filesWithTests: 0, added: 0, removed: 0 };

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

// Strip string literals and block comments that provably open AND close on the
// same diff line, replacing their contents with nothing. Anything uncertain
// (a quote or /* that does not close on this line, or a possible regex literal
// ahead of a quote) returns the line unchanged, so the caller falls back to
// today's behavior. This is a false-positive-only relaxation for checks where a
// match means REJECT: it can only let provably-benign lines through, never hide
// a token the raw line would not also have hidden (ADR-045).
function stripLineLocalNoise(line) {
  let out = "";
  let i = 0;
  const n = line.length;
  while (i < n) {
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      let closed = false;
      while (j < n) {
        if (line[j] === "\\") { j += 2; continue; }
        if (line[j] === ch) { closed = true; break; }
        j++;
      }
      if (!closed) return line; // string continues past this line: uncertain
      out += ch + ch; // keep the empty quotes so the line stays structurally intact
      i = j + 1;
      continue;
    }
    if (ch === "/" && line[i + 1] === "*") {
      const close = line.indexOf("*/", i + 2);
      if (close === -1) return line; // block comment continues past this line: uncertain
      i = close + 2;
      continue;
    }
    if (ch === "/") {
      // A bare slash ahead of a quote could be a regex literal containing that
      // quote, which would fool this scanner into eating real code as if it were
      // string content. Adversarially constructible, so bail to the raw line.
      if (/["'`]/.test(line.slice(i + 1))) return line;
      out += ch;
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
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
    assertionTally.filesWithTests += 1;
    assertionTally.added += addedAsserts;
    assertionTally.removed += removedAsserts;
    if (removedAsserts > addedAsserts) {
      problems.push(
        formatMessage(
          "gate.ratchet.assertion-removal",
          { file, added: addedAsserts, removed: removedAsserts },
          overrides
        ).message
      );
    }
  }

  // 2. Skip / focus annotation injection in test files (all languages).
  if (isTest) {
    for (const l of added) {
      if (SKIP.test(l)) {
        problems.push(formatMessage("gate.ratchet.skip-injection", { file, line: l.trim() }, overrides).message);
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
        problems.push(
          formatMessage("gate.ratchet.homoglyph-disguise", { file, line: l.trim() }, overrides).message
        );
      }
    }
  }

  // 2b. Vacuous (tautological) assertion injection in test files (all languages).
  // Catches keeping the assertion count up with assertions that can never fail.
  if (isTest) {
    for (const l of added) {
      if (isVacuousAssertion(l)) {
        problems.push(
          formatMessage("gate.ratchet.vacuous-assertion", { file, line: l.trim() }, overrides).message
        );
      }
    }
  }

  // 2c. Vacuous Python bare assertions (assert True, assert 1) in test files.
  if (isPyTest) {
    for (const l of added) {
      if (isVacuousPyAssert(l)) {
        problems.push(
          formatMessage("gate.ratchet.vacuous-python-assertion", { file, line: l.trim() }, overrides).message
        );
      }
    }
  }

  // 3a. TS/JS broad type escape injection in non-test source files.
  // Same-line string literals and block comments are stripped first (ADR-045):
  // a ": any" inside `"cast as any is banned"` or `/* not: any */` is prose, not
  // a type escape. The stripper bails to the raw line on anything uncertain, so
  // this is a false-positive-only relaxation.
  if (isTsSrc) {
    for (const l of added) {
      const clean = stripInlineComment(stripLineLocalNoise(l));
      if (TS_ANY_ESCAPE.test(clean)) {
        problems.push(formatMessage("gate.ratchet.type-escape-ts", { file, line: l.trim() }, overrides).message);
      }
    }
  }

  // 3b. Java unchecked suppression in non-test source files.
  if (isJavaSrc) {
    for (const l of added) {
      if (JAVA_UNCHECKED.test(l)) {
        problems.push(
          formatMessage("gate.ratchet.type-escape-java", { file, line: l.trim() }, overrides).message
        );
      }
    }
  }

  // 3c. C# pragma warning disable in non-test source files.
  if (isDotnetSrc) {
    for (const l of added) {
      if (DOTNET_PRAGMA.test(l)) {
        problems.push(
          formatMessage("gate.ratchet.type-escape-dotnet", { file, line: l.trim() }, overrides).message
        );
      }
    }
  }

  // 4. TypeScript strictness flags weakened.
  if (isTsConfig) {
    for (const l of added) {
      if (TS_STRICT_OFF.test(l)) {
        problems.push(
          formatMessage("gate.ratchet.ts-strictness-weakened", { file, line: l.trim() }, overrides).message
        );
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
        problems.push(
          formatMessage("gate.ratchet.coverage-threshold-removed", { file, line: l.trim() }, overrides).message
        );
      } else {
        // Check whether a matching added line lowers the numeric value.
        const oldM = l.match(COVERAGE_VALUE_RE);
        if (oldM) {
          const oldVal = parseFloat(oldM[1]);
          for (const a of matchingAdded) {
            const newM = a.match(COVERAGE_VALUE_RE);
            if (newM && parseFloat(newM[1]) < oldVal) {
              problems.push(
                formatMessage(
                  "gate.ratchet.coverage-threshold-lowered",
                  { file, oldVal, newVal: parseFloat(newM[1]), line: l.trim() },
                  overrides
                ).message
              );
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
          problems.push(
            formatMessage("gate.ratchet.coverage-floor-lowered", { file, key, oldVal, newVal }, overrides).message
          );
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
        formatMessage(
          "gate.ratchet.assertion-strength-downgrade",
          { file, strongAdded, strongRemoved, weakAdded },
          overrides
        ).message
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Machine-readable emitters (MR codes)
// ---------------------------------------------------------------------------

// Stable rule codes for the gate-weakening categories. These are the public IDs a
// CI annotation, a security-tab alert, or the attestation predicate refer to, so
// they must not be renumbered. Each resolves to https://modonome.com/codes/<CODE>.
const MR_RULES = {
  MR101: "assertion-removal",
  MR102: "skip-injection",
  MR103: "vacuous-assertion",
  MR104: "coverage-lowering",
  MR105: "type-escape",
  MR106: "assertion-strength-downgrade",
  MR107: "homoglyph-disguise",
  MR100: "gate-weakening",
};

function classifyCode(msg) {
  const m = msg.toLowerCase();
  if (m.includes("homoglyph")) return "MR107";
  if (m.includes("skipped or focused")) return "MR102";
  if (m.includes("vacuous")) return "MR103";
  if (m.includes("downgrades assertion strength")) return "MR106";
  if (m.includes("coverage")) return "MR104";
  if (m.includes("type escape") || m.includes("suppresswarnings")
    || m.includes("pragma warning") || m.includes("typescript strictness")) return "MR105";
  if (m.includes("removes more test assertions")) return "MR101";
  return "MR100";
}

// Each problem message is "<file>: <detail>". Recover the file path for a location.
function fileOf(msg) {
  const i = msg.indexOf(": ");
  return i > 0 ? msg.slice(0, i) : "";
}

function helpUri(code) {
  return `https://modonome.com/codes/${code}`;
}

function toFindings(list) {
  return list.map((message) => {
    const code = classifyCode(message);
    return { code, rule: MR_RULES[code], file: fileOf(message), message, helpUri: helpUri(code) };
  });
}

function emitJson(findings) {
  return JSON.stringify({
    tool: "modonome-gate-integrity",
    version: "1",
    result: findings.length ? "fail" : "pass",
    summary: findings.length
      ? `${findings.length} gate-weakening finding(s)`
      : "no weakened tests, skips, type escapes, or loosened gates",
    findings,
  }, null, 2);
}

function emitSarif(findings) {
  const usedCodes = [...new Set(findings.map((f) => f.code))];
  const rules = usedCodes.map((code) => ({
    id: code,
    name: MR_RULES[code],
    shortDescription: { text: MR_RULES[code] },
    helpUri: helpUri(code),
  }));
  const results = findings.map((f) => ({
    ruleId: f.code,
    level: "error",
    message: { text: f.message },
    partialFingerprints: { "modonomeGateIntegrity/v1": `${f.code}:${f.file}` },
    locations: f.file
      ? [{ physicalLocation: { artifactLocation: { uri: f.file }, region: { startLine: 1 } } }]
      : [],
  }));
  return JSON.stringify({
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "Modonome", informationUri: "https://modonome.com", rules } },
      results,
    }],
  }, null, 2);
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

if (FORMAT !== "human") {
  const findings = toFindings(problems);
  process.stdout.write((FORMAT === "sarif" ? emitSarif(findings) : emitJson(findings)) + "\n");
  process.exit(problems.length > 0 ? 1 : 0);
}

// Advisory-only, informational, never affects the exit code (see the comment where
// assertionTally is declared above). Printed in both outcomes so a reviewer sees the
// cross-file shape whether or not a specific file was rejected.
function printAssertionTallyAdvisory() {
  if (assertionTally.filesWithTests === 0) return;
  console.log(
    `Advisory (not a gate): ${assertionTally.filesWithTests} test file(s) touched, ` +
    `+${assertionTally.added} / -${assertionTally.removed} assertions net across this diff. ` +
    `Per-file findings above are the enforcement; this line is context only.`
  );
}

if (problems.length > 0) {
  console.error(formatMessage("gate.ratchet.fail-header", {}, overrides).message);
  for (const p of problems) console.error("  - " + p);
  console.error(formatMessage("gate.ratchet.fail-footer", {}, overrides).message);
  printAssertionTallyAdvisory();
  process.exit(1);
}
console.log("Anti-gaming ratchet: no weakened tests, skips, type escapes, or loosened gates.");
printAssertionTallyAdvisory();
