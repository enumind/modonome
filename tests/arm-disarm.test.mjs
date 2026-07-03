// Tests for `modonome arm` and `modonome disarm`: the guided ceremony that flips
// autonomy_enabled after verifying the preconditions Modonome can check locally
// (distinct maker/checker model families, CODEOWNERS vs protected_paths_extra
// agreement, the require_* separation-of-duties flags), and the unconditional
// kill switch that flips it back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-arm-"));
}

function run(script, ...args) {
  return spawnSync("node", [join(root, script), ...args], { encoding: "utf8", timeout: 30000 });
}

function scaffold(dir) {
  const r = spawnSync("node", [join(root, "scripts/scaffold.mjs"), dir, "--write", "--no-snapshot"], {
    encoding: "utf8",
    timeout: 30000,
  });
  assert.strictEqual(r.status, 0, `scaffold exited ${r.status}: ${r.stderr}`);
}

function readConfig(dir) {
  return readFileSync(join(dir, ".modonome", "config.yaml"), "utf8");
}

test("arm refuses when there is no config", () => {
  const dir = tmp();
  try {
    const r = run("scripts/arm.mjs", dir);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /No config found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("arm passes on a freshly scaffolded repo and writes autonomy_enabled: true", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const r = run("scripts/arm.mjs", dir);
    assert.strictEqual(r.status, 0, `arm exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /autonomy_enabled: true written/);
    assert.match(readConfig(dir), /^autonomy_enabled: true$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("arm preserves comments and every other line in config.yaml", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const before = readConfig(dir);
    run("scripts/arm.mjs", dir);
    const after = readConfig(dir);
    const beforeLines = before.split("\n").filter((l) => !/^autonomy_enabled:/.test(l));
    const afterLines = after.split("\n").filter((l) => !/^autonomy_enabled:/.test(l));
    assert.deepStrictEqual(afterLines, beforeLines, "every non-autonomy_enabled line must be untouched");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("arm is idempotent: re-running an already-armed repo reports success without changing other lines", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    run("scripts/arm.mjs", dir);
    const armedOnce = readConfig(dir);
    const r = run("scripts/arm.mjs", dir);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /already has autonomy_enabled: true/);
    assert.strictEqual(readConfig(dir), armedOnce, "second run must not change the file");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("arm refuses when maker and checker share a model family", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const configPath = join(dir, ".modonome", "config.yaml");
    const patched = readConfig(dir).replace("model: claude-opus-4-8", "model: claude-sonnet-4-5");
    writeFileSync(configPath, patched);

    const r = run("scripts/arm.mjs", dir);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /same model family \(sonnet\)/);
    assert.match(readConfig(dir), /^autonomy_enabled: false$/m, "config must stay disarmed on refusal");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("arm refuses when a require_* flag is off", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const configPath = join(dir, ".modonome", "config.yaml");
    const patched = readConfig(dir).replace("require_distinct_maker_checker_model: true", "require_distinct_maker_checker_model: false");
    writeFileSync(configPath, patched);

    const r = run("scripts/arm.mjs", dir);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /require_distinct_maker_checker_model is set to false/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("arm refuses when protected_paths_extra lists a path CODEOWNERS does not cover", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const configPath = join(dir, ".modonome", "config.yaml");
    writeFileSync(configPath, readConfig(dir).replace("protected_paths_extra: []", "protected_paths_extra: [scripts]"));
    mkdirSync(join(dir, ".github"), { recursive: true });
    writeFileSync(join(dir, ".github", "CODEOWNERS"), "/bin/ @owner\n");

    const r = run("scripts/arm.mjs", dir);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /CODEOWNERS does not protect: scripts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("arm passes when CODEOWNERS covers every protected_paths_extra entry", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const configPath = join(dir, ".modonome", "config.yaml");
    writeFileSync(configPath, readConfig(dir).replace("protected_paths_extra: []", "protected_paths_extra: [scripts]"));
    mkdirSync(join(dir, ".github"), { recursive: true });
    writeFileSync(join(dir, ".github", "CODEOWNERS"), "/scripts/ @owner\n");

    const r = run("scripts/arm.mjs", dir);
    assert.strictEqual(r.status, 0, `arm exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /CODEOWNERS covers all 1 protected_paths_extra entry/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("arm never sets MODONOME_ARMED and always prints the CI-secret command for the second key", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const r = run("scripts/arm.mjs", dir);
    assert.match(r.stdout, /gh secret set MODONOME_ARMED --body true/);
    // The template's own header comment documents the two-key split by name
    // ("autonomy_enabled + MODONOME_ARMED"); that prose predates this command and
    // is fine. What must never appear is an actual assigned key, e.g. arm.mjs
    // writing a `MODONOME_ARMED: true` line into the file it can edit.
    assert.doesNotMatch(readConfig(dir), /^MODONOME_ARMED\s*:/m, "config.yaml must never gain a MODONOME_ARMED key");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("disarm refuses when there is no config", () => {
  const dir = tmp();
  try {
    const r = run("scripts/disarm.mjs", dir);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /nothing to disarm/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("disarm flips an armed repo back to autonomy_enabled: false unconditionally", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    run("scripts/arm.mjs", dir);
    assert.match(readConfig(dir), /^autonomy_enabled: true$/m);

    const r = run("scripts/disarm.mjs", dir);
    assert.strictEqual(r.status, 0, `disarm exited ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, /autonomy_enabled: false written/);
    assert.match(readConfig(dir), /^autonomy_enabled: false$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("disarm on an already-disarmed repo reports no change", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const r = run("scripts/disarm.mjs", dir);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /already has autonomy_enabled: false/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("disarm has no separation-of-duties preconditions: it works even when arm would refuse", () => {
  const dir = tmp();
  try {
    scaffold(dir);
    const configPath = join(dir, ".modonome", "config.yaml");
    writeFileSync(configPath, readConfig(dir).replace("model: claude-opus-4-8", "model: claude-sonnet-4-5"));

    const r = run("scripts/disarm.mjs", dir);
    assert.strictEqual(r.status, 0, `disarm exited ${r.status}: ${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
