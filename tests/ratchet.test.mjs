import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fx = join(root, "fixtures");
const files = (dir) => readdirSync(dir).map((f) => join(dir, f));

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
