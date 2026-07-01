import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkLicenses } from "../scripts/check-licenses.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const noDeps = { dependencies: {} };

test("clean manifest with permissive licenses passes", () => {
  const manifest = {
    adapters: [
      { name: "mit-tool", license: "MIT", boundary: "process", version: "1.0.0" },
      { name: "isc-tool", license: "isc", boundary: "sidecar", version: "2.1.0" },
      { name: "bsd-tool", license: "BSD-3-Clause", boundary: "ci-native", version: "3.0.0", url: "https://example.com" },
      { name: "bsd2-short", license: "BSD-2", boundary: "process", version: "0.9.0" },
    ],
  };
  assert.deepEqual(checkLicenses(noDeps, manifest), []);
});

test("empty manifest passes", () => {
  assert.deepEqual(checkLicenses(noDeps, { adapters: [] }), []);
});

test("no manifest (undefined) passes when there are no runtime deps", () => {
  assert.deepEqual(checkLicenses(noDeps, undefined), []);
});

test("top-level array manifest form is accepted", () => {
  const manifest = [{ name: "a", license: "MIT", boundary: "process", version: "1.0.0" }];
  assert.deepEqual(checkLicenses(noDeps, manifest), []);
});

test("GPL entry fails", () => {
  const manifest = { adapters: [{ name: "gpl-tool", license: "GPL-3.0", boundary: "process", version: "1.0.0" }] };
  const problems = checkLicenses(noDeps, manifest);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /copyleft or source-available/);
});

test("AGPL entry fails", () => {
  const manifest = { adapters: [{ name: "agpl-tool", license: "AGPL-3.0", boundary: "sidecar", version: "1.0.0" }] };
  assert.match(checkLicenses(noDeps, manifest)[0], /refused/);
});

test("LGPL, BUSL, and SSPL entries fail", () => {
  for (const license of ["LGPL-2.1", "BUSL-1.1", "SSPL-1.0"]) {
    const manifest = { adapters: [{ name: "x", license, boundary: "process", version: "1.0.0" }] };
    assert.match(checkLicenses(noDeps, manifest)[0], /refused/, `expected ${license} to be refused`);
  }
});

test("Apache-2.0 without an adr note fails", () => {
  const manifest = { adapters: [{ name: "apache-tool", license: "Apache-2.0", boundary: "process", version: "1.0.0" }] };
  const problems = checkLicenses(noDeps, manifest);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /Apache-2.0 is allowed only with a truthy "adr"/);
});

test("Apache-2.0 with an adr note passes", () => {
  const manifest = { adapters: [{ name: "apache-tool", license: "Apache-2.0", boundary: "process", version: "1.0.0", adr: "ADR-032" }] };
  assert.deepEqual(checkLicenses(noDeps, manifest), []);
});

test("unknown license fails", () => {
  const manifest = { adapters: [{ name: "weird", license: "WTFPL", boundary: "process", version: "1.0.0" }] };
  assert.match(checkLicenses(noDeps, manifest)[0], /not on the permissive allowlist/);
});

test("missing license fails", () => {
  const manifest = { adapters: [{ name: "no-lic", boundary: "process", version: "1.0.0" }] };
  assert.match(checkLicenses(noDeps, manifest)[0], /missing license/);
});

test("invalid boundary fails", () => {
  const manifest = { adapters: [{ name: "bad-boundary", license: "MIT", boundary: "npm", version: "1.0.0" }] };
  const problems = checkLicenses(noDeps, manifest);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /boundary "npm" is not permitted/);
});

test("missing boundary fails", () => {
  const manifest = { adapters: [{ name: "no-boundary", license: "MIT", version: "1.0.0" }] };
  assert.match(checkLicenses(noDeps, manifest)[0], /missing boundary/);
});

test("package.json with a runtime dependency fails", () => {
  const pkg = { dependencies: { chalk: "^5.0.0", lodash: "^4.0.0" } };
  const problems = checkLicenses(pkg, { adapters: [] });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /runtime dependencies \(chalk, lodash\)/);
});

test("non-array adapters field fails clearly", () => {
  const problems = checkLicenses(noDeps, { adapters: {} });
  assert.match(problems[0], /must have an "adapters" array/);
});

test("adapter without a name is labeled by index", () => {
  const manifest = { adapters: [{ license: "GPL-3.0", boundary: "process", version: "1.0.0" }] };
  assert.match(checkLicenses(noDeps, manifest)[0], /adapters\[0\]/);
});

test("the real manifest and package.json pass via the CLI", () => {
  const r = spawnSync("node", [join(root, "scripts/check-licenses.mjs")], { encoding: "utf8", timeout: 30000 });
  assert.strictEqual(r.status, 0, `expected exit 0:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /PASS: zero runtime dependencies/);
});

test("the CLI exits 1 on a repo with a violation", () => {
  // Drive the CLI against a temp root that has a runtime dependency.
  const r = spawnSync(
    "node",
    ["-e", `import("${join(root, "scripts/check-licenses.mjs").replace(/\\/g, "/")}").then(m => { const p = m.checkLicenses({ dependencies: { x: "1" } }, null); process.exit(p.length ? 1 : 0); })`],
    { encoding: "utf8", timeout: 30000 }
  );
  assert.strictEqual(r.status, 1);
});
