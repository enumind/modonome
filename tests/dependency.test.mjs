import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const scriptsDir = join(root, "scripts");
const testsDir = join(root, "tests");

// Read all .mjs files in a directory (non-recursive by default).
function listMjs(dir, recursive = false) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory() && recursive) {
      results.push(...listMjs(full, true));
    } else if (stat.isFile() && extname(entry) === ".mjs") {
      results.push(full);
    }
  }
  return results;
}

// Extract import specifiers from a file's source text.
// Only matches actual import statements (not comments or JSDoc).
function extractImportSpecifiers(source) {
  const specifiers = [];
  // Remove single-line comments before scanning
  const stripped = source.replace(/\/\/[^\n]*/g, "");
  // Match: import ... from "specifier" or import ... from 'specifier'
  const re = /\bimport\b[^;'"]*\bfrom\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    specifiers.push(m[1]);
  }
  // Also catch bare side-effect imports: import "specifier"
  const bareRe = /^\s*import\s+['"]([^'"]+)['"]/gm;
  while ((m = bareRe.exec(stripped)) !== null) {
    specifiers.push(m[1]);
  }
  return specifiers;
}

function isAllowedImport(specifier) {
  // node: built-ins
  if (specifier.startsWith("node:")) return true;
  // Legacy node built-in names (no prefix), e.g. "fs", "path", "url", "child_process"
  const legacyBuiltins = new Set([
    "assert", "buffer", "child_process", "cluster", "console", "crypto", "dns",
    "domain", "events", "fs", "http", "http2", "https", "inspector", "module",
    "net", "os", "path", "perf_hooks", "process", "punycode", "querystring",
    "readline", "repl", "stream", "string_decoder", "timers", "tls", "trace_events",
    "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib",
  ]);
  if (legacyBuiltins.has(specifier)) return true;
  // Local relative paths
  if (specifier.startsWith(".")) return true;
  return false;
}

describe("dependency: package.json has no production dependencies beyond node built-ins", () => {
  test("given modonome's package.json, when inspecting dependencies, then there are no production dependencies", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const deps = pkg.dependencies ?? {};
    const depNames = Object.keys(deps);
    assert.deepEqual(
      depNames,
      [],
      `package.json must have no production dependencies, found: ${depNames.join(", ")}`,
    );
  });

  test("given modonome's package.json, when inspecting devDependencies, then there are none (no test frameworks)", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const devDeps = pkg.devDependencies ?? {};
    const devDepNames = Object.keys(devDeps);
    assert.deepEqual(
      devDepNames,
      [],
      `package.json must have no devDependencies, found: ${devDepNames.join(", ")}`,
    );
  });
});

describe("dependency: scripts/ files import only from node: or local paths", () => {
  const scriptFiles = listMjs(scriptsDir, true);

  test("given all scripts/*.mjs files, when scanning imports, then all specifiers are node: or relative", () => {
    const violations = [];
    for (const file of scriptFiles) {
      const source = readFileSync(file, "utf8");
      const specifiers = extractImportSpecifiers(source);
      for (const spec of specifiers) {
        if (!isAllowedImport(spec)) {
          violations.push(`${file.replace(root + "/", "")}: imports "${spec}"`);
        }
      }
    }
    assert.deepEqual(
      violations,
      [],
      `Scripts must only import node: built-ins or local paths.\nViolations:\n${violations.join("\n")}`,
    );
  });
});

describe("dependency: test files import only from node: or local paths", () => {
  const testFiles = listMjs(testsDir);

  test("given all tests/*.test.mjs files, when scanning imports, then all specifiers are node: or relative", () => {
    const violations = [];
    for (const file of testFiles) {
      const source = readFileSync(file, "utf8");
      const specifiers = extractImportSpecifiers(source);
      for (const spec of specifiers) {
        if (!isAllowedImport(spec)) {
          violations.push(`${file.replace(root + "/", "")}: imports "${spec}"`);
        }
      }
    }
    assert.deepEqual(
      violations,
      [],
      `Test files must only import node: built-ins or local paths.\nViolations:\n${violations.join("\n")}`,
    );
  });

  test("given all tests/*.test.mjs files, when checking test framework imports, then only node:test is used (no jest/mocha/vitest)", () => {
    const externalFrameworks = ["jest", "@jest", "mocha", "vitest", "chai", "sinon", "ava", "jasmine", "tap"];
    const violations = [];
    for (const file of testFiles) {
      const source = readFileSync(file, "utf8");
      const specifiers = extractImportSpecifiers(source);
      for (const spec of specifiers) {
        for (const fw of externalFrameworks) {
          if (spec === fw || spec.startsWith(fw + "/") || spec.startsWith("@" + fw)) {
            violations.push(`${file.replace(root + "/", "")}: uses external test framework "${spec}"`);
          }
        }
      }
    }
    assert.deepEqual(
      violations,
      [],
      `Test files must not use external test frameworks.\nViolations:\n${violations.join("\n")}`,
    );
  });
});

describe("dependency: config schema does not import external validators", () => {
  test("given the jsonschema lib, when scanning imports, then no external validator packages are used", () => {
    const jsonschemaLib = join(scriptsDir, "lib", "jsonschema.mjs");
    const source = readFileSync(jsonschemaLib, "utf8");
    const specifiers = extractImportSpecifiers(source);
    const violations = specifiers.filter((s) => !isAllowedImport(s));
    assert.deepEqual(
      violations,
      [],
      `jsonschema.mjs must not import external packages, found: ${violations.join(", ")}`,
    );
  });
});
