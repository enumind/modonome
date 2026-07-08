// Coverage for the adapter conformance verifier (docs/adapters.md). Tier 1
// (static) is tested against the real repo manifest and schema, no mocking
// needed. Tier 2 (live) is tested two ways: against a fully fake spawnImpl
// (matching the tool-loop-adapter.test.mjs convention, no real process), and
// end-to-end against the real bundled reference adapter as an actual
// subprocess talking to a real local HTTP server (fast, local-only, no
// external network), which is the same path `--self-test` exercises.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadAndValidateManifest,
  checkArgvSanity,
  runLiveProbe,
} from "../scripts/adapter-verify.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const REFERENCE_ADAPTER = {
  name: "reference-adapter",
  command: "node",
  args: [join(root, "fixtures", "adapters", "reference-adapter.mjs"), "--prompt-stdin"],
  license: "MIT",
  boundary: "process",
  version: "0",
};

// ---------------------------------------------------------------------------
// Tier 1: static, against the real committed manifest
// ---------------------------------------------------------------------------

test("loadAndValidateManifest finds the registered opencode entry with no problems", () => {
  const { entry, problems } = loadAndValidateManifest(root, "opencode");
  assert.ok(entry, "opencode must be registered in adapters.json");
  assert.equal(entry.license, "MIT");
  assert.deepEqual(problems, []);
});

test("loadAndValidateManifest reports a name that is not registered", () => {
  const { entry } = loadAndValidateManifest(root, "does-not-exist");
  assert.equal(entry, undefined);
});

test("loadAndValidateManifest flags a schema violation", () => {
  const dir = mkdtempSync(join(tmpdir(), "adapter-verify-schema-"));
  try {
    mkdirSync(join(dir, "schemas"), { recursive: true });
    cpSync(join(root, "schemas", "adapters.schema.json"), join(dir, "schemas", "adapters.schema.json"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", dependencies: {} }));
    writeFileSync(join(dir, "adapters.json"), JSON.stringify({
      adapters: [{ name: "bad", license: "GPL-3.0", boundary: "process", version: "1" }],
    }));
    const { problems } = loadAndValidateManifest(dir, "bad");
    assert.ok(problems.some((p) => /license\/boundary/.test(p)), `expected a license problem, got: ${JSON.stringify(problems)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// checkArgvSanity
// ---------------------------------------------------------------------------

test("checkArgvSanity is clean for a well-formed adapter entry", () => {
  const problems = checkArgvSanity(REFERENCE_ADAPTER);
  assert.deepEqual(problems, []);
});

test("checkArgvSanity reports a missing command", () => {
  const problems = checkArgvSanity({});
  assert.ok(problems.some((p) => /resolveAdapterCommand/.test(p)));
});

// ---------------------------------------------------------------------------
// Tier 2 (live) against a fully fake spawn, matching tool-loop-adapter.test.mjs
// ---------------------------------------------------------------------------

function makeFakeSpawn(script = {}) {
  const calls = [];
  const spawnImpl = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    const writes = [];
    child.stdin = { write: (d) => writes.push(String(d)), end: () => {} };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdinWrites = writes;
    child.kill = () => {};
    queueMicrotask(() => {
      if (script.stdout) child.stdout.emit("data", script.stdout);
      child.emit("close", script.code ?? 0, null);
    });
    return child;
  };
  return { spawnImpl, calls };
}

test("runLiveProbe skips cleanly when the command is not on PATH", async () => {
  const result = await runLiveProbe({ name: "nope", command: "definitely-not-a-real-binary-xyz" });
  assert.equal(result.status, "skipped");
  assert.match(result.detail, /not found on PATH/);
});

test("runLiveProbe fails when the adapter exits non-zero", async () => {
  const { spawnImpl } = makeFakeSpawn({ code: 3 });
  const result = await runLiveProbe(REFERENCE_ADAPTER, { forceCommand: true, deps: { spawnImpl } });
  assert.equal(result.status, "fail");
  assert.match(result.detail, /exited 3/);
});

test("runLiveProbe fails when the adapter exits 0 but wrote nothing", async () => {
  const { spawnImpl } = makeFakeSpawn({ code: 0 });
  const result = await runLiveProbe(REFERENCE_ADAPTER, { forceCommand: true, deps: { spawnImpl } });
  assert.equal(result.status, "fail");
  assert.match(result.detail, /wrote no output/);
});

// ---------------------------------------------------------------------------
// Tier 2 (live) end to end against the real reference adapter subprocess
// ---------------------------------------------------------------------------

test("runLiveProbe passes end to end against the real reference adapter", async () => {
  const result = await runLiveProbe(REFERENCE_ADAPTER, { forceCommand: true, timeoutMs: 15000 });
  assert.equal(result.status, "pass", result.detail);
  assert.match(result.detail, /confined to the target directory/);
});

test("runLiveProbe against the real reference adapter with a scratch root leaves no stray output outside the target", async () => {
  const scratchRoot = mkdtempSync(join(tmpdir(), "adapter-verify-real-"));
  try {
    mkdirSync(join(scratchRoot, "target"), { recursive: true });
    const result = await runLiveProbe(REFERENCE_ADAPTER, { forceCommand: true, scratchRoot, timeoutMs: 15000 });
    assert.equal(result.status, "pass", result.detail);
    assert.ok(existsSync(join(scratchRoot, "target", "ADAPTER-OUTPUT.txt")));
    assert.ok(!existsSync(join(scratchRoot, "ADAPTER-OUTPUT.txt")), "must not write outside the target directory");
  } finally {
    rmSync(scratchRoot, { recursive: true, force: true });
  }
});
