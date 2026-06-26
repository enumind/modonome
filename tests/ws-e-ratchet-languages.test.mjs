import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url)).slice(0, -1);
const GUARD_RATCHET = join(__dirname, "..", "scripts", "guard-ratchet.mjs");
const FIXTURES_DIR = join(__dirname, "..", "fixtures", "ratchet-diffs");

function runRatchet(diffFile) {
  const result = spawnSync("node", [GUARD_RATCHET, "--diff", diffFile], {
    encoding: "utf8",
  });
  return {
    exit: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

test("python-assert-removal is flagged as gaming", () => {
  const diffFile = join(FIXTURES_DIR, "gaming", "python-assert-removal.diff");
  const result = runRatchet(diffFile);
  assert.equal(result.exit, 1, "Ratchet should reject python assertion removal");
  assert.match(
    result.stderr,
    /removes more test assertions than it adds/,
    "Should report assertion removal"
  );
});

test("python-skip is flagged as gaming", () => {
  const diffFile = join(FIXTURES_DIR, "gaming", "python-skip.diff");
  const result = runRatchet(diffFile);
  assert.equal(result.exit, 1, "Ratchet should reject python skip annotation");
  assert.match(
    result.stderr,
    /@pytest\.mark\.(skip|xfail)/,
    "Should report skip annotation"
  );
});

test("dotnet-assert-removal is flagged as gaming", () => {
  const diffFile = join(FIXTURES_DIR, "gaming", "dotnet-assert-removal.diff");
  const result = runRatchet(diffFile);
  assert.equal(result.exit, 1, "Ratchet should reject .NET assertion removal");
  assert.match(
    result.stderr,
    /removes more test assertions than it adds/,
    "Should report assertion removal"
  );
});

test("python-add-assertions is clean (not flagged)", () => {
  const diffFile = join(FIXTURES_DIR, "clean", "python-add-assertions.diff");
  const result = runRatchet(diffFile);
  assert.equal(result.exit, 0, "Ratchet should allow adding assertions");
  assert.match(
    result.stdout,
    /no weakened tests/,
    "Should report clean bill of health"
  );
});
