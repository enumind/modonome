import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

import { validate } from "../scripts/lib/jsonschema.mjs";
import { validateConfig, loadConfig } from "../scripts/validate-config.mjs";
import { validatePacket } from "../scripts/validate-knowledge-packet.mjs";
import { migrate } from "../scripts/migrate-config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fx = join(root, "fixtures");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const files = (dir) => readdirSync(dir).map((f) => join(dir, f));

test("valid configs pass, invalid configs fail", () => {
  for (const f of files(join(fx, "config", "valid"))) {
    assert.deepEqual(validateConfig(readJson(f)), [], `expected valid: ${f}`);
  }
  for (const f of files(join(fx, "config", "invalid"))) {
    assert.ok(validateConfig(readJson(f)).length > 0, `expected invalid: ${f}`);
  }
});

test("the shipped template config is valid and safe", () => {
  const cfg = loadConfig(join(root, "templates", ".modonome", "config.yaml"));
  assert.deepEqual(validateConfig(cfg), []);
  assert.equal(cfg.autonomy_enabled, false);
  assert.equal(cfg.dry_run, true);
  assert.equal(cfg.auto_merge, false);
  assert.equal(cfg.max_merges_per_day, 0);
});

test("work items validate against the schema", () => {
  const schema = readJson(join(root, "schemas", "work-item.schema.json"));
  for (const f of files(join(fx, "work-item", "valid"))) {
    assert.deepEqual(validate(schema, readJson(f)), [], `expected valid: ${f}`);
  }
  for (const f of files(join(fx, "work-item", "invalid"))) {
    assert.ok(validate(schema, readJson(f)).length > 0, `expected invalid: ${f}`);
  }
});

test("knowledge packets: clean publishable, restricted and leaking blocked", () => {
  for (const f of files(join(fx, "knowledge-packet", "valid"))) {
    assert.deepEqual(validatePacket(readJson(f)), [], `expected publishable: ${f}`);
  }
  for (const f of files(join(fx, "knowledge-packet", "invalid"))) {
    assert.ok(validatePacket(readJson(f)).length > 0, `expected blocked: ${f}`);
  }
});

test("ratchet passes clean diffs and rejects gaming diffs", () => {
  const guard = join(root, "scripts", "guard-ratchet.mjs");
  for (const f of files(join(fx, "ratchet-diffs", "clean"))) {
    const r = spawnSync("node", [guard, "--diff", f], { encoding: "utf8" });
    assert.equal(r.status, 0, `expected clean: ${f}\n${r.stderr}`);
  }
  for (const f of files(join(fx, "ratchet-diffs", "gaming"))) {
    const r = spawnSync("node", [guard, "--diff", f], { encoding: "utf8" });
    assert.equal(r.status, 1, `expected rejected: ${f}`);
  }
});

test("migration adds missing levers with safe defaults and never arms", () => {
  const { config, added } = migrate({ schema_version: 0, dry_run: true });
  assert.equal(config.schema_version, 1);
  assert.ok(added.includes("autonomy_enabled"));
  assert.equal(config.autonomy_enabled, false);
  assert.equal(config.auto_merge, false);
  assert.equal(config.max_merges_per_day, 0);
});

test("prompt bundle is current and levers do not drift", () => {
  const bundle = spawnSync("node", [join(root, "scripts", "build-prompt.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(bundle.status, 0, bundle.stderr);
  const drift = spawnSync("node", [join(root, "scripts", "check-drift.mjs")], { encoding: "utf8" });
  assert.equal(drift.status, 0, drift.stderr);
});
