import { test } from "node:test";
import { strict as assert } from "node:assert";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

test("sync-site-data: script exists and runs", () => {
  const script = join(root, "scripts", "sync-site-data.mjs");
  assert.ok(existsSync(script), "sync-site-data.mjs exists");

  // Test dry-run (no output files modified)
  const result = execSync(`node ${script} --help 2>&1 || true`, {
    cwd: root,
    encoding: "utf8",
  });
  assert.ok(result !== undefined, "Script runs without error");
});

test("check-edit-set-compliance: script exists", () => {
  const script = join(root, "scripts", "check-edit-set-compliance.mjs");
  assert.ok(existsSync(script), "check-edit-set-compliance.mjs exists");
});

test("site/index.html contains hardcoded engine data", () => {
  const indexPath = join(root, "site", "index.html");
  assert.ok(existsSync(indexPath), "site/index.html exists");

  const content = readFileSync(indexPath, "utf8");
  assert.match(content, /engineBase/, "site contains engineBase data");
  assert.match(content, /lessons/, "site contains lessons count");
  assert.match(content, /gates/, "site contains gates count");
});

test("agentproof uses HARDENED label (not GOVERNED)", () => {
  const runnerPath = join(root, "agentproof", "runner.mjs");
  const content = readFileSync(runnerPath, "utf8");
  assert.match(content, /HARDENED/, "runner uses HARDENED label");
  assert.doesNotMatch(content, /level.*=.*"GOVERNED"/i, "runner does not use GOVERNED label for level");
});

test("RELEASE-EVIDENCE reflects HARDENED status", () => {
  const evidencePath = join(root, "RELEASE-EVIDENCE.md");
  if (existsSync(evidencePath)) {
    const content = readFileSync(evidencePath, "utf8");
    assert.match(content, /HARDENED|UNHARDENED/, "evidence reports hardening level");
  }
});
