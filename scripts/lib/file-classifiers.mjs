// Language-aware file classification, the single source of truth for "what kind of
// file is this path" across the gate-integrity tooling. Extracted verbatim from
// guard-ratchet.mjs so the ratchet and any tool that has to find files of the same
// kind (for example scripts/gauntlet.mjs, which looks for a real host file to mutate
// per category) classify paths identically, with no second copy of these regexes to
// drift. These match on the path only and carry no `g` flag, so `.test()` is stateless
// and safe to share.

// Test files: any language.
export const TEST_FILE = new RegExp([
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
export const PYTHON_TEST = /(?:^|\/)(?:test_[^/]*|[^/]*_test)\.py$/;

// Source files by language (for non-test type-escape checks).
export const JAVA_SRC  = /\.java$/;
export const DOTNET_SRC = /\.cs$/;
export const TS_SRC    = /\.(c|m)?[jt]sx?$/;

// JaCoCo / Gradle / Coverlet config files.
export const JAVA_BUILD   = /^(pom\.xml|build\.gradle(\.kts)?)$/;
export const DOTNET_BUILD = /\.(runsettings|csproj|props)$/;
export const TS_CONFIG    = /tsconfig.*\.json$/;
export const COVERAGE_CONFIG = /(?:jest|vitest)\.config\.(js|ts|mjs|cjs)$|pyproject\.toml$/;
