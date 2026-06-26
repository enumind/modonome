/**
 * Tests for scripts/preflight-embedding.mjs against the portability fixtures.
 *
 * Each fixture is a hostile (or clean) host repo. We run the preflight script as
 * a child process (the real CI-gate entrypoint) and assert on exit code and the
 * structured JSON report.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const script = path.join(repoRoot, "scripts", "preflight-embedding.mjs");
const fixtures = path.join(repoRoot, "fixtures", "portability");

// Run preflight in --json mode against a fixture. Returns { code, report, raw }.
// A clean environment is used so the host's own MODONOME_* shell does not leak
// into the env-pollution check.
function runPreflight(fixtureName) {
  const target = path.join(fixtures, fixtureName);
  const cleanEnv = { ...process.env };
  for (const k of Object.keys(cleanEnv)) {
    if (k.startsWith("MODONOME_")) delete cleanEnv[k];
  }
  const res = spawnSync(
    process.execPath,
    [script, "--target-dir", target, "--json"],
    { encoding: "utf8", env: cleanEnv }
  );
  let report = null;
  try {
    report = JSON.parse(res.stdout);
  } catch {
    /* leave null; tests that need it will fail clearly */
  }
  return { code: res.status, report, raw: res.stdout + res.stderr };
}

function ids(report) {
  return (report.findings || []).map((f) => f.id);
}

function findingsBySeverity(report, severity) {
  return (report.findings || []).filter((f) => f.severity === severity);
}

test("schema-collision: exits 1 and reports a schema collision error", () => {
  const { code, report } = runPreflight("schema-collision");
  assert.equal(code, 1, "must exit 1 (fatal)");
  assert.ok(ids(report).includes("schema-collision"), "must report schema-collision");
  const f = report.findings.find((x) => x.id === "schema-collision");
  assert.equal(f.severity, "ERROR");
  assert.match(f.title.toLowerCase(), /schema collision/);
});

test("ci-job-conflict: exits 1 or 2 and reports a CI conflict", () => {
  const { code, report } = runPreflight("ci-job-conflict");
  assert.ok(code === 1 || code === 2, `expected exit 1 or 2, got ${code}`);
  assert.ok(ids(report).includes("ci-job-conflict"), "must report ci-job-conflict");
  const f = report.findings.find((x) => x.id === "ci-job-conflict");
  assert.match(f.title.toLowerCase(), /ci job name conflict/);
});

test("prompt-injection-host: exits 2 (WARN), host content does not block", () => {
  const { code, report } = runPreflight("prompt-injection-host");
  assert.equal(code, 2, "host content must be advisory (exit 2), not fatal");
  assert.ok(ids(report).includes("prompt-injection"), "must report prompt-injection");
  // No ERROR findings: host source content can never block embedding.
  assert.equal(findingsBySeverity(report, "ERROR").length, 0);
  for (const f of report.findings.filter((x) => x.id === "prompt-injection")) {
    assert.equal(f.severity, "WARN");
  }
});

test("shadowing-attack: exits 1 and reports script shadowing", () => {
  const { code, report } = runPreflight("shadowing-attack");
  assert.equal(code, 1, "must exit 1 (fatal)");
  assert.ok(ids(report).includes("script-shadowing"), "must report script-shadowing");
  const f = report.findings.find((x) => x.id === "script-shadowing");
  assert.equal(f.severity, "ERROR");
  assert.match(f.title.toLowerCase(), /shadowing/);
});

test("env-pollution: exits 2 (WARN), env vars are advisory", () => {
  const { code, report } = runPreflight("env-pollution");
  assert.equal(code, 2, "env vars must be advisory (exit 2)");
  assert.ok(ids(report).includes("env-pollution"), "must report env-pollution");
  const f = report.findings.find((x) => x.id === "env-pollution");
  assert.equal(f.severity, "WARN");
  assert.equal(findingsBySeverity(report, "ERROR").length, 0);
});

test("clean-host: exits 0 and reports All clear", () => {
  const { code, report, raw } = runPreflight("clean-host");
  assert.equal(code, 0, "clean fixture must pass");
  assert.equal((report.findings || []).length, 0, "no findings expected");
  // Human mode (no --json) should say "All clear".
  const cleanEnv = { ...process.env };
  for (const k of Object.keys(cleanEnv)) if (k.startsWith("MODONOME_")) delete cleanEnv[k];
  const human = spawnSync(
    process.execPath,
    [script, "--target-dir", path.join(fixtures, "clean-host")],
    { encoding: "utf8", env: cleanEnv }
  );
  assert.equal(human.status, 0);
  assert.match(human.stdout, /All clear/);
  void raw;
});

test("preflight is non-destructive: target tree is unchanged after a run", async () => {
  const { readdir, stat } = await import("node:fs/promises");
  async function snapshot(dir) {
    const out = {};
    async function walk(cur) {
      let entries;
      try {
        entries = await readdir(cur, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const full = path.join(cur, e.name);
        if (e.isDirectory()) await walk(full);
        else {
          const s = await stat(full);
          out[full] = `${s.size}:${s.mtimeMs}`;
        }
      }
    }
    await walk(dir);
    return out;
  }
  for (const name of ["schema-collision", "shadowing-attack", "env-pollution"]) {
    const dir = path.join(fixtures, name);
    const before = await snapshot(dir);
    runPreflight(name);
    const after = await snapshot(dir);
    assert.deepEqual(after, before, `${name}: target tree was modified by preflight`);
  }
});

test("missing --target-dir prints usage and exits 2", () => {
  const res = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /Usage/);
});

test("every finding has the required shape", () => {
  for (const name of [
    "schema-collision",
    "ci-job-conflict",
    "prompt-injection-host",
    "shadowing-attack",
    "env-pollution",
  ]) {
    const { report } = runPreflight(name);
    for (const f of report.findings) {
      assert.ok(typeof f.id === "string" && f.id.length, `${name}: id`);
      assert.ok(["ERROR", "WARN", "INFO"].includes(f.severity), `${name}: severity`);
      assert.ok(typeof f.title === "string" && f.title.length, `${name}: title`);
      assert.ok(typeof f.description === "string" && f.description.length, `${name}: description`);
      if ("path" in f) assert.ok(typeof f.path === "string", `${name}: path`);
    }
  }
});
