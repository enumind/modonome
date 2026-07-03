// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

import { validatePacket, redactionErrors } from "../scripts/validate-knowledge-packet.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fx = join(root, "fixtures");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const files = (dir) => readdirSync(dir).map((f) => join(dir, f));

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-packet-test-"));
}

test("knowledge packets: clean publishable, restricted and leaking blocked", () => {
  for (const f of files(join(fx, "knowledge-packet", "valid"))) {
    assert.deepEqual(validatePacket(readJson(f)), [], `expected publishable: ${f}`);
  }
  for (const f of files(join(fx, "knowledge-packet", "invalid"))) {
    assert.ok(validatePacket(readJson(f)).length > 0, `expected blocked: ${f}`);
  }
});

test("redactionErrors blocks a packet that does not declare local_validation_required as true", () => {
  const clean = readJson(join(fx, "knowledge-packet", "valid", "clean.json"));
  const notValidated = { ...clean, local_validation_required: false };
  const errors = redactionErrors(notValidated);
  assert.ok(errors.some((e) => e.includes("local_validation_required must be true")));

  // A packet with the field missing entirely must also be blocked.
  const missingField = { ...clean };
  delete missingField.local_validation_required;
  assert.ok(redactionErrors(missingField).some((e) => e.includes("local_validation_required must be true")));

  // The same packet with the field true and nothing else wrong is clean.
  assert.deepEqual(redactionErrors(clean), []);
});

test("validate-knowledge-packet CLI accepts a publishable packet", () => {
  const dir = tmp();
  try {
    const path = join(dir, "packet.json");
    writeFileSync(path, readFileSync(join(fx, "knowledge-packet", "valid", "clean.json"), "utf8"));
    const r = spawnSync("node", [join(root, "scripts/validate-knowledge-packet.mjs"), path], { encoding: "utf8", timeout: 10000 });
    assert.equal(r.status, 0, `expected clean packet to pass: ${r.stderr}`);
    assert.match(r.stdout, /Packet publishable/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate-knowledge-packet CLI rejects a packet that is not publishable", () => {
  const dir = tmp();
  try {
    const path = join(dir, "packet.json");
    writeFileSync(path, readFileSync(join(fx, "knowledge-packet", "invalid", "restricted.json"), "utf8"));
    const r = spawnSync("node", [join(root, "scripts/validate-knowledge-packet.mjs"), path], { encoding: "utf8", timeout: 10000 });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Packet not publishable/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
