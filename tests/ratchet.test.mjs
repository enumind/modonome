import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fx = join(root, "fixtures");
const files = (dir) => readdirSync(dir).map((f) => join(dir, f));

const guard = join(root, "scripts", "guard-ratchet.mjs");
const apFixtures = join(root, "agentproof", "fixtures");

function ratchet(diffPath) {
  return spawnSync("node", [guard, "--diff", diffPath], { encoding: "utf8" });
}

test("ratchet passes clean diffs and rejects gaming diffs", () => {
  for (const f of files(join(fx, "ratchet-diffs", "clean"))) {
    const r = ratchet(f);
    assert.equal(r.status, 0, `expected clean: ${f}\n${r.stderr}`);
  }
  for (const f of files(join(fx, "ratchet-diffs", "gaming"))) {
    const r = ratchet(f);
    assert.equal(r.status, 1, `expected rejected: ${f}`);
  }
});

test("ratchet rejects vacuous (tautological) assertions across languages", () => {
  for (const f of [
    "ratchet-vacuous-matcher.patch",
    "ratchet-vacuous-java.patch",
    "ratchet-vacuous-csharp.patch",
  ]) {
    const r = ratchet(join(apFixtures, f));
    assert.equal(r.status, 1, `expected vacuous assertion rejected: ${f}\n${r.stdout}`);
    assert.match(r.stderr, /vacuous assertion/, `must name the vacuous assertion: ${f}`);
  }
});

test("ratchet does not flag real assertions that compare a value to a literal", () => {
  const r = ratchet(join(apFixtures, "ratchet-vacuous-clean.patch"));
  assert.equal(r.status, 0, `real assertions must pass:\n${r.stderr}`);
});

test("ratchet catches assertion removal in .mjs and .cjs test files", () => {
  const r = ratchet(join(apFixtures, "ratchet-mjs-assertion-removal.patch"));
  assert.equal(r.status, 1, `mjs assertion removal must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /removes more test assertions/, "must report the net assertion drop");
});

test("ratchet counts removed Python bare assert statements", () => {
  const r = ratchet(join(apFixtures, "ratchet-python-bare-assert-removal.patch"));
  assert.equal(r.status, 1, `bare assert removal must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /removes more test assertions/, "must report the net assertion drop");
});

test("ratchet rejects vacuous Python bare assertions", () => {
  const r = ratchet(join(apFixtures, "ratchet-python-vacuous-assert.patch"));
  assert.equal(r.status, 1, `assert True must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /vacuous Python assertion/, "must name the vacuous Python assertion");
});

test("ratchet accepts a Python diff that adds real bare assertions", () => {
  const r = ratchet(join(apFixtures, "ratchet-python-bare-assert-clean.patch"));
  assert.equal(r.status, 0, `real bare assertions must pass:\n${r.stderr}`);
});

test("ratchet does not flag complete deletion of an orphaned vitest file", () => {
  const r = ratchet(join(apFixtures, "ratchet-orphaned-vitest-deletion.patch"));
  assert.equal(r.status, 0, `orphaned vitest file deletion must pass:\n${r.stderr}`);
});

// Regression tests for adversarial audit fixes A1-A5.

test("A1: CRLF line endings do not bypass file classification or assertion removal check", () => {
  // Build a diff with CRLF line endings at the binary level and write it to a temp file.
  const crlf = "\r\n";
  const lines = [
    "diff --git a/src/checkout.test.ts b/src/checkout.test.ts",
    "--- a/src/checkout.test.ts",
    "+++ b/src/checkout.test.ts",
    "@@",
    "-    expect(charge(card)).toBe(\"ok\");",
    "-    expect(receipt(card)).toBeDefined();",
    "+    charge(card);",
  ];
  const crlfDiff = lines.join(crlf) + crlf;
  const tmpPath = join(root, "fixtures", "ratchet-diffs", "gaming", "_crlf-tmp.diff");
  writeFileSync(tmpPath, crlfDiff, "utf8");
  try {
    const r = ratchet(tmpPath);
    assert.equal(r.status, 1, `CRLF diff must be rejected (assertion removal):\n${r.stdout}`);
  } finally {
    // Clean up temp file.
    spawnSync("rm", ["-f", tmpPath]);
  }
});

test("A2: deleted test file (with +++ /dev/null) triggers assertion removal check", () => {
  const r = ratchet(join(fx, "ratchet-diffs", "gaming", "delete-test-file.diff"));
  assert.equal(r.status, 1, `deleted test file must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /removes more test assertions/, "must report the net assertion drop for deleted file");
});

test("A3: Java prefix-style test class (TestFoo.java) triggers assertion removal check", () => {
  const r = ratchet(join(fx, "ratchet-diffs", "gaming", "java-prefix-test-removal.diff"));
  assert.equal(r.status, 1, `TestFoo.java assertion removal must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /removes more test assertions/, "must report the net assertion drop");
});

test("A4: vitest.config.ts coverage threshold removal is detected", () => {
  const r = ratchet(join(fx, "ratchet-diffs", "gaming", "vitest-config-removal.diff"));
  assert.equal(r.status, 1, `vitest.config.ts threshold removal must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /coverage threshold/, "must report coverage threshold removal");
});

test("A5: lowering coverage threshold value (80 -> 0) is detected", () => {
  const r = ratchet(join(fx, "ratchet-diffs", "gaming", "coverage-threshold-lowered.diff"));
  assert.equal(r.status, 1, `coverage threshold lowering must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /coverage threshold/, "must report coverage threshold change");
});

test("A6: commenting out an assertion in place does not net to zero (check 1)", () => {
  // Removed line is a real assertion; added line is the same call text behind `//`.
  // The raw ASSERT regex matches inside the comment, so an uncleaned count sees
  // +1/-1 and stays silent while the test's coverage was actually deleted.
  const r = ratchet(join(fx, "ratchet-diffs", "gaming", "comment-out-evasion.diff"));
  assert.equal(r.status, 1, `commented-out assertion must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /removes more test assertions/, "must report the net assertion drop");
});

test("A7: commenting out a strong assertion while adding an existence check is a strength downgrade (check 6)", () => {
  // Same evasion against check 6: the commented-out toBe() must not count as a
  // surviving strong assertion, so the added toBeDefined() reads as a downgrade.
  const r = ratchet(join(fx, "ratchet-diffs", "gaming", "comment-out-strength-downgrade.diff"));
  assert.equal(r.status, 1, `commented-out strong assertion must be rejected:\n${r.stdout}`);
  assert.match(r.stderr, /downgrades assertion strength/, "must report the strength downgrade");
});

test("--staged checks the index against HEAD, for pre-commit hook use", () => {
  const dir = mkdtempSync(join(tmpdir(), "ratchet-staged-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["config", "user.email", "t@e.com"], { cwd: dir });
    spawnSync("git", ["config", "user.name", "t"], { cwd: dir });
    writeFileSync(
      join(dir, "checkout.test.ts"),
      'expect(charge(card)).toBe("ok");\nexpect(receipt(card)).toBeDefined();\n'
    );
    spawnSync("git", ["add", "-A"], { cwd: dir });
    spawnSync("git", ["commit", "-qm", "init"], { cwd: dir });

    // Stage a gaming change: delete the strong assertion, keep only the weak one.
    writeFileSync(join(dir, "checkout.test.ts"), 'expect(receipt(card)).toBeDefined();\n');
    spawnSync("git", ["add", "-A"], { cwd: dir });

    const r = spawnSync("node", [guard, "--staged"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 1, `staged assertion removal must be rejected:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /removes more test assertions/, "must report the net assertion drop");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
