import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validate } from "../scripts/lib/jsonschema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CLI = join(root, "scripts", "snapshot.mjs");

function run(args, cwd) {
  return spawnSync("node", [CLI, ...args], { encoding: "utf8", timeout: 30000, cwd });
}

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "snap-cli-"));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test", build: "tsc" } }));
  writeFileSync(join(dir, "src", "index.js"), "export function main() { return 1; }\nimport './util.js';\n");
  writeFileSync(join(dir, "src", "util.js"), "export const util = () => 2;\n");
  // A real git history so churn ranking has data.
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["config", "user.email", "t@example.com"], { cwd: dir });
  spawnSync("git", ["config", "user.name", "tester"], { cwd: dir });
  spawnSync("git", ["add", "-A"], { cwd: dir });
  spawnSync("git", ["commit", "-qm", "init"], { cwd: dir });
  return dir;
}

test("snapshot write produces valid, schema-conformant tiers and llms.txt", () => {
  const dir = makeRepo();
  try {
    const r = run(["."], dir);
    assert.equal(r.status, 0, r.stderr);
    const sigPath = join(dir, ".modonome", "snapshot", "signature.json");
    const mapPath = join(dir, ".modonome", "snapshot", "map.json");
    assert.ok(existsSync(sigPath) && existsSync(mapPath), "tier files written");
    assert.ok(existsSync(join(dir, ".modonome", "snapshot", "map.md")), "map.md written");
    assert.ok(existsSync(join(dir, "llms.txt")), "llms.txt written at root");

    const sig = JSON.parse(readFileSync(sigPath, "utf8"));
    const map = JSON.parse(readFileSync(mapPath, "utf8"));
    const sigSchema = JSON.parse(readFileSync(join(root, "schemas", "snapshot-signature.schema.json"), "utf8"));
    const mapSchema = JSON.parse(readFileSync(join(root, "schemas", "snapshot-map.schema.json"), "utf8"));
    assert.deepEqual(validate(sigSchema, sig), [], "signature valid");
    assert.deepEqual(validate(mapSchema, map), [], "map valid");
    assert.equal(sig.merkle_root, map.merkle_root, "tiers share the merkle root");
    assert.ok(sig.commands.test.length > 0, "test command surfaced");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("check passes when current and warns (exit 0) when stale by default", () => {
  const dir = makeRepo();
  try {
    run(["."], dir);
    const ok = run([".", "--check"], dir);
    assert.equal(ok.status, 0);
    assert.match(ok.stdout, /current/);
    writeFileSync(join(dir, "src", "new.js"), "export function added() {}\n");
    const stale = run([".", "--check"], dir);
    assert.equal(stale.status, 0, "warn mode does not fail");
    assert.match(stale.stderr + stale.stdout, /out of date|warn/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("check fails (exit 1) when config sets ci_mode fail", () => {
  const dir = makeRepo();
  try {
    run(["."], dir);
    mkdirSync(join(dir, ".modonome"), { recursive: true });
    writeFileSync(join(dir, ".modonome", "config.yaml"), "snapshot:\n  ci_mode: fail\n");
    writeFileSync(join(dir, "src", "new.js"), "export function added() {}\n");
    const r = run([".", "--check"], dir);
    assert.equal(r.status, 1, "fail mode blocks on stale snapshot");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("verify confirms match and detects drift", () => {
  const dir = makeRepo();
  try {
    run(["."], dir);
    const ok = run([".", "--verify"], dir);
    assert.equal(ok.status, 0);
    assert.match(ok.stdout, /verified/);
    writeFileSync(join(dir, "src", "util.js"), "export const util = () => 999;\n");
    const drift = run([".", "--verify"], dir);
    assert.equal(drift.status, 1, "drift is reported as failure");
    assert.match(drift.stderr, /drift/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("tier prints JSON and since prints a delta", () => {
  const dir = makeRepo();
  try {
    run(["."], dir);
    const t0 = run([".", "--tier", "0"], dir);
    assert.equal(t0.status, 0);
    assert.ok(JSON.parse(t0.stdout).merkle_root, "tier 0 is signature json");
    const since = run([".", "--since", "HEAD"], dir);
    assert.equal(since.status, 0);
    const delta = JSON.parse(since.stdout);
    assert.equal(delta.from_ref, "HEAD");
    assert.ok(Array.isArray(delta.added));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("pack writes a single portable bundle", () => {
  const dir = makeRepo();
  try {
    const r = run([".", "--pack"], dir);
    assert.equal(r.status, 0, r.stderr);
    const packPath = join(dir, ".modonome", "snapshot", "snapshot.msnap");
    assert.ok(existsSync(packPath), "pack written");
    const pack = JSON.parse(readFileSync(packPath, "utf8"));
    assert.ok(pack.signature && pack.map && typeof pack.map_md === "string", "pack bundles all tiers");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
