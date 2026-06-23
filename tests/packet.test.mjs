import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { validatePacket } from "../scripts/validate-knowledge-packet.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fx = join(root, "fixtures");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const files = (dir) => readdirSync(dir).map((f) => join(dir, f));

test("knowledge packets: clean publishable, restricted and leaking blocked", () => {
  for (const f of files(join(fx, "knowledge-packet", "valid"))) {
    assert.deepEqual(validatePacket(readJson(f)), [], `expected publishable: ${f}`);
  }
  for (const f of files(join(fx, "knowledge-packet", "invalid"))) {
    assert.ok(validatePacket(readJson(f)).length > 0, `expected blocked: ${f}`);
  }
});
