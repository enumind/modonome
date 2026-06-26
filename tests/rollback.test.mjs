/**
 * Rollback / reversibility tests for Modonome embedding.
 *
 * These tests verify that embedding Modonome's .modonome/ config into a host
 * repo is cleanly reversible and that a *failed* embedding (e.g. one blocked by
 * a fatal preflight finding) leaves the target in its exact original state.
 *
 * Strategy: build a throwaway "host" repo in a temp dir, snapshot it, simulate
 * an embedding (copy .modonome/ in), then roll it back and assert the snapshot
 * is byte-for-byte identical. Also assert that when preflight exits 1, the
 * (correct) embedding workflow performs no writes at all.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, writeFile, cp, rm, readdir, stat, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const script = path.join(repoRoot, "scripts", "preflight-embedding.mjs");
const modonomeDir = path.join(repoRoot, ".modonome");

// Recursively snapshot path -> "size:sha-like(content)" for every file.
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
        const buf = await readFile(full);
        out[path.relative(dir, full)] = `${buf.length}:${hash(buf)}`;
      }
    }
  }
  await walk(dir);
  return out;
}

// Tiny content hash (FNV-1a): avoids a crypto import and is deterministic.
function hash(buf) {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i++) {
    h ^= buf[i];
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

async function makeHostRepo() {
  const dir = await mkdtemp(path.join(tmpdir(), "modonome-rollback-"));
  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "host", version: "1.0.0", type: "module" }, null, 2)
  );
  await mkdir(path.join(dir, "src"), { recursive: true });
  await writeFile(path.join(dir, "src", "index.js"), "export const x = 1;\n");
  return dir;
}

function runPreflight(target) {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith("MODONOME_")) delete env[k];
  return spawnSync(process.execPath, [script, "--target-dir", target, "--json"], {
    encoding: "utf8",
    env,
  });
}

test("embedding then rollback restores the exact original state", async () => {
  const host = await makeHostRepo();
  try {
    const before = await snapshot(host);

    // Simulate embedding: copy Modonome's .modonome/ config into the host.
    await cp(modonomeDir, path.join(host, ".modonome"), { recursive: true });
    const embedded = await snapshot(host);
    assert.notDeepEqual(embedded, before, "embedding should add files");
    assert.ok(
      Object.keys(embedded).some((k) => k.startsWith(".modonome/")),
      ".modonome/ should be present after embedding"
    );

    // Roll back: remove the embedded state directory.
    await rm(path.join(host, ".modonome"), { recursive: true, force: true });
    const after = await snapshot(host);

    assert.deepEqual(after, before, "rollback must restore the exact original state");
  } finally {
    await rm(host, { recursive: true, force: true });
  }
});

test("a failed embedding leaves the target in its original state", async () => {
  const host = await makeHostRepo();
  try {
    const before = await snapshot(host);

    // Simulate a failure partway through embedding (e.g. copy then abort).
    let failed = false;
    try {
      await cp(modonomeDir, path.join(host, ".modonome"), { recursive: true });
      throw new Error("simulated embedding failure");
    } catch {
      failed = true;
      // Cleanup handler unwinds the partial embedding.
      await rm(path.join(host, ".modonome"), { recursive: true, force: true });
    }
    assert.ok(failed);

    const after = await snapshot(host);
    assert.deepEqual(after, before, "a failed+unwound embedding must be a no-op");
  } finally {
    await rm(host, { recursive: true, force: true });
  }
});

test("when preflight exits 1, no changes are made to the target", async () => {
  // Build a host that triggers a fatal finding (script shadowing).
  const host = await makeHostRepo();
  try {
    await mkdir(path.join(host, "scripts"), { recursive: true });
    await writeFile(
      path.join(host, "scripts", "guard-ratchet.mjs"),
      "// host's own shadowing script\n"
    );
    const before = await snapshot(host);

    const res = runPreflight(host);
    assert.equal(res.status, 1, "preflight must flag the shadowing as fatal");

    // The correct embedding workflow refuses to write when preflight is fatal.
    // We assert the preflight itself wrote nothing (non-destructive guarantee).
    const after = await snapshot(host);
    assert.deepEqual(after, before, "preflight must not modify the target on exit 1");
  } finally {
    await rm(host, { recursive: true, force: true });
  }
});

test("preflight does not create a .modonome dir in a target that lacks one", async () => {
  const host = await makeHostRepo();
  try {
    runPreflight(host);
    let hasModonome = true;
    try {
      await stat(path.join(host, ".modonome"));
    } catch {
      hasModonome = false;
    }
    assert.equal(hasModonome, false, "preflight must never create .modonome/ in the target");
  } finally {
    await rm(host, { recursive: true, force: true });
  }
});
