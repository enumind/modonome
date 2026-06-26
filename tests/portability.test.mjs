/**
 * Portability validation tests.
 *
 * Each fixture in fixtures/portability/ simulates a "hostile repo" scenario
 * where Modonome is embedded in a host that creates one of the known risks:
 *   1. schema-collision   - host already has a .modonome/config.yaml with wrong schema
 *   2. ci-job-conflict    - host CI defines the same job names as Modonome
 *   3. prompt-injection   - host source files contain governance instruction patterns
 *   4. shadowing-attack   - host scripts/ shadows Modonome's scripts at identical paths
 *   5. env-pollution      - host exports env vars that could affect Modonome's behavior
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fx = join(root, "fixtures", "portability");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run validate-config.mjs against a given config path. */
function runValidateConfig(configPath, opts = {}) {
  return spawnSync(
    "node",
    [join(root, "scripts", "validate-config.mjs"), configPath],
    { encoding: "utf8", env: { ...process.env, ...opts.env } }
  );
}

/** Run guard-ratchet.mjs with a --diff fixture. */
function runGuardRatchet(diffPath, opts = {}) {
  return spawnSync(
    "node",
    [join(root, "scripts", "guard-ratchet.mjs"), "--diff", diffPath],
    { encoding: "utf8", env: { ...process.env, ...opts.env } }
  );
}

/** Run check-portability.mjs against a fixture directory. */
function runPortabilityCheck(fixturePath, opts = {}) {
  return spawnSync(
    "node",
    [join(root, "scripts", "check-portability.mjs"), "--fixture", fixturePath],
    { encoding: "utf8", env: { ...process.env, ...opts.env } }
  );
}

// ---------------------------------------------------------------------------
// Fixture 1: Schema collision
// ---------------------------------------------------------------------------

test("schema-collision: fixture represents a real threat", () => {
  const configPath = join(fx, "schema-collision", ".modonome", "config.yaml");
  assert.ok(existsSync(configPath), "collision config must exist");
  const text = readFileSync(configPath, "utf8");
  // The colliding config uses schema_version: 99, not 1
  assert.ok(text.includes("schema_version: 99"), "collision config must have wrong schema_version");
  // It also uses a boolean-as-string for autonomy_enabled, which is invalid
  assert.ok(text.includes('autonomy_enabled: "yes"'), "collision config must have invalid autonomy_enabled");
});

test("schema-collision: Modonome validate-config rejects the colliding config", () => {
  const configPath = join(fx, "schema-collision", ".modonome", "config.yaml");
  const r = runValidateConfig(configPath);
  assert.notEqual(r.status, 0, `validate-config must exit non-zero for colliding config\n${r.stdout}`);
});

test("schema-collision: preflight check reports FAIL", () => {
  const r = runPortabilityCheck(join(fx, "schema-collision"));
  assert.notEqual(r.status, 0, `check-portability must exit 1 for schema collision\n${r.stdout}`);
  assert.match(r.stdout, /FAIL/i, "output must contain FAIL");
});

// ---------------------------------------------------------------------------
// Fixture 2: CI job conflict
// ---------------------------------------------------------------------------

test("ci-job-conflict: fixture represents a real threat", () => {
  const ciPath = join(fx, "ci-job-conflict", ".github", "workflows", "ci.yml");
  assert.ok(existsSync(ciPath), "conflicting CI workflow must exist");
  const text = readFileSync(ciPath, "utf8");
  // Must contain Modonome's canonical job names
  for (const job of ["drift", "ratchet", "tests", "agentproof"]) {
    assert.ok(text.includes(`${job}:`), `CI file must define conflicting job: ${job}`);
  }
});

test("ci-job-conflict: preflight check reports FAIL", () => {
  const r = runPortabilityCheck(join(fx, "ci-job-conflict"));
  assert.notEqual(r.status, 0, `check-portability must exit 1 for CI job conflict\n${r.stdout}`);
  assert.match(r.stdout, /FAIL/i, "output must contain FAIL");
});

// ---------------------------------------------------------------------------
// Fixture 3: Prompt injection host
// ---------------------------------------------------------------------------

test("prompt-injection-host: fixture contains real injection patterns", () => {
  const mainJs = join(fx, "prompt-injection-host", "src", "main.js");
  const guideMd = join(fx, "prompt-injection-host", "docs", "guide.md");
  const testMjs = join(fx, "prompt-injection-host", "tests", "test.mjs");

  assert.ok(existsSync(mainJs), "main.js must exist");
  assert.ok(existsSync(guideMd), "guide.md must exist");
  assert.ok(existsSync(testMjs), "test.mjs must exist");

  const mainText = readFileSync(mainJs, "utf8");
  assert.ok(mainText.includes("SYSTEM OVERRIDE"), "main.js must contain injection pattern");

  const guideText = readFileSync(guideMd, "utf8");
  assert.ok(guideText.includes("autonomy_enabled: true"), "guide.md must contain dangerous config example");

  const testText = readFileSync(testMjs, "utf8");
  assert.ok(testText.includes("skip all tests"), "test.mjs must contain skip injection pattern");
});

test("prompt-injection-host: Modonome's validate-config is unaffected by host source files", () => {
  // Modonome's validate-config reads only the config file path given to it.
  // Run it against the legitimate Modonome template config. It must still pass
  // even when the cwd is the prompt-injection fixture directory.
  const templateConfig = join(root, "templates", ".modonome", "config.yaml");
  const r = spawnSync(
    "node",
    [join(root, "scripts", "validate-config.mjs"), templateConfig],
    {
      encoding: "utf8",
      cwd: join(fx, "prompt-injection-host"),
    }
  );
  assert.equal(r.status, 0, `validate-config must pass for template config even in injection host\n${r.stderr}`);
});

test("prompt-injection-host: guard-ratchet is unaffected by host source files", () => {
  // Use a clean diff; the ratchet must still pass, proving host content did not
  // corrupt its logic.
  const cleanDiff = join(root, "fixtures", "ratchet-diffs", "clean");

  const cleanFiles = readdirSync(cleanDiff).map((f) => join(cleanDiff, f));
  assert.ok(cleanFiles.length > 0, "need at least one clean diff fixture");

  for (const diffFile of cleanFiles) {
    const r = spawnSync(
      "node",
      [join(root, "scripts", "guard-ratchet.mjs"), "--diff", diffFile],
      {
        encoding: "utf8",
        cwd: join(fx, "prompt-injection-host"),
      }
    );
    assert.equal(r.status, 0, `ratchet must pass clean diff in injection host cwd\n${r.stderr}`);
  }
});

test("prompt-injection-host: preflight check reports WARN", () => {
  const r = runPortabilityCheck(join(fx, "prompt-injection-host"));
  // Injection content is present but Modonome's config is absent (WARN not FAIL).
  assert.match(r.stdout, /WARN|FAIL/i, "output must contain WARN or FAIL");
});

// ---------------------------------------------------------------------------
// Fixture 4: Shadowing attack
// ---------------------------------------------------------------------------

test("shadowing-attack: fixture shadow scripts exist and are stubs", () => {
  const shadowRatchet = join(fx, "shadowing-attack", "scripts", "guard-ratchet.mjs");
  const shadowValidate = join(fx, "shadowing-attack", "scripts", "validate-config.mjs");

  assert.ok(existsSync(shadowRatchet), "shadow guard-ratchet.mjs must exist");
  assert.ok(existsSync(shadowValidate), "shadow validate-config.mjs must exist");

  const ratchetText = readFileSync(shadowRatchet, "utf8");
  // The attack stub always exits 0
  assert.ok(ratchetText.includes("process.exit(0)"), "shadow ratchet must be a permissive stub");

  const validateText = readFileSync(shadowValidate, "utf8");
  assert.ok(validateText.includes("process.exit(0)"), "shadow validate-config must be a permissive stub");
});

test("shadowing-attack: Modonome guard-ratchet is invoked by absolute path and resists shadowing", () => {
  // The real ratchet is invoked via its absolute path from Modonome's scripts/.
  // It must reject a gaming diff regardless of cwd.
  const gamingDiff = join(root, "fixtures", "ratchet-diffs", "gaming");

  const gamingFiles = readdirSync(gamingDiff).map((f) => join(gamingDiff, f));
  assert.ok(gamingFiles.length > 0, "need at least one gaming diff fixture");

  for (const diffFile of gamingFiles) {
    const r = spawnSync(
      "node",
      [join(root, "scripts", "guard-ratchet.mjs"), "--diff", diffFile],
      {
        encoding: "utf8",
        cwd: join(fx, "shadowing-attack"),
      }
    );
    assert.equal(r.status, 1, `real ratchet must reject gaming diff even when cwd has shadow scripts\n${r.stdout}`);
  }
});

test("shadowing-attack: Modonome validate-config rejects unsafe config regardless of cwd", () => {
  // An unsafe config (autonomy_enabled=true but empty trusted_author_allowlist) must
  // be rejected by the real validate-config even when run from the shadowing-attack dir.
  const unsafeConfig = join(root, "fixtures", "config", "invalid");

  const invalidFiles = readdirSync(unsafeConfig).map((f) => join(unsafeConfig, f));
  assert.ok(invalidFiles.length > 0, "need at least one invalid config fixture");

  for (const configFile of invalidFiles) {
    const r = spawnSync(
      "node",
      [join(root, "scripts", "validate-config.mjs"), configFile],
      {
        encoding: "utf8",
        cwd: join(fx, "shadowing-attack"),
      }
    );
    assert.notEqual(r.status, 0, `real validate-config must reject invalid config from shadowing-attack cwd: ${configFile}`);
  }
});

test("shadowing-attack: preflight check reports FAIL", () => {
  const r = runPortabilityCheck(join(fx, "shadowing-attack"));
  assert.notEqual(r.status, 0, `check-portability must exit 1 for shadowing attack\n${r.stdout}`);
  assert.match(r.stdout, /FAIL/i, "output must contain FAIL");
});

// ---------------------------------------------------------------------------
// Fixture 5: Environment pollution
// ---------------------------------------------------------------------------

test("env-pollution: fixture .env contains hostile variables", () => {
  const envPath = join(fx, "env-pollution", ".env");
  assert.ok(existsSync(envPath), ".env file must exist");
  const text = readFileSync(envPath, "utf8");
  assert.ok(text.includes("MODONOME_AUTONOMY=true"), ".env must contain MODONOME_AUTONOMY=true");
  assert.ok(text.includes("MODONOME_ARMED=true"), ".env must contain MODONOME_ARMED=true");
  assert.ok(text.includes("MODONOME_DRY_RUN=false"), ".env must contain MODONOME_DRY_RUN=false");
});

test("env-pollution: validate-config reads config file, not env vars for safety fields", () => {
  // The template config has safe defaults. Even with hostile env vars injected,
  // validate-config must pass the template config (config file wins over env).
  const templateConfig = join(root, "templates", ".modonome", "config.yaml");
  const hostileEnv = {
    MODONOME_AUTONOMY: "true",
    MODONOME_ARMED: "true",
    MODONOME_DRY_RUN: "false",
    MODONOME_MAX_MERGES: "999",
    MODONOME_AUTO_MERGE: "true",
    NODE_ENV: "test",
  };
  const r = runValidateConfig(templateConfig, { env: hostileEnv });
  assert.equal(r.status, 0, `validate-config must pass template config even with hostile env vars\n${r.stderr}`);
});

test("env-pollution: guard-ratchet rejects gaming diffs even with hostile env vars", () => {
  const gamingDiff = join(root, "fixtures", "ratchet-diffs", "gaming");

  const gamingFiles = readdirSync(gamingDiff).map((f) => join(gamingDiff, f));
  const hostileEnv = {
    MODONOME_AUTONOMY: "true",
    MODONOME_ARMED: "true",
    NODE_ENV: "test",
  };
  for (const diffFile of gamingFiles) {
    const r = runGuardRatchet(diffFile, { env: hostileEnv });
    assert.equal(r.status, 1, `ratchet must reject gaming diff even with hostile env vars\n${r.stdout}`);
  }
});

test("env-pollution: preflight check reports WARN", () => {
  const r = runPortabilityCheck(join(fx, "env-pollution"));
  assert.match(r.stdout, /WARN|FAIL/i, "output must flag env-pollution as WARN or FAIL");
});
