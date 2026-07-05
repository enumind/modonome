import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SCAFFOLD = join(root, "scripts", "scaffold.mjs");

function gitRepo() {
  const dir = mkdtempSync(join(tmpdir(), "scaffold-adopt-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "host", scripts: { test: "jest" } }));
  writeFileSync(join(dir, "index.js"), "export const x = 1;\n");
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["config", "user.email", "t@e.com"], { cwd: dir });
  spawnSync("git", ["config", "user.name", "t"], { cwd: dir });
  spawnSync("git", ["add", "-A"], { cwd: dir });
  spawnSync("git", ["commit", "-qm", "init"], { cwd: dir });
  return dir;
}

function scaffold(dir, extra = []) {
  return spawnSync("node", [SCAFFOLD, dir, "--write", ...extra], { encoding: "utf8", timeout: 30000 });
}

test("scaffold --write turns on snapshot consumption by default", () => {
  const dir = gitRepo();
  try {
    const r = scaffold(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, ".modonome", "snapshot", "signature.json")), "snapshot generated");
    assert.ok(existsSync(join(dir, "llms.txt")), "llms.txt written");
    assert.ok(existsSync(join(dir, "AGENTS.md")), "AGENTS.md pointer created");
    assert.match(readFileSync(join(dir, "AGENTS.md"), "utf8"), /\.modonome\/snapshot\/map\.md/);
    const hook = join(dir, ".git", "hooks", "pre-commit");
    assert.ok(existsSync(hook), "pre-commit hook installed");
    assert.match(readFileSync(hook, "utf8"), /modonome snapshot/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scaffold does not overwrite an existing AGENTS.md", () => {
  const dir = gitRepo();
  try {
    writeFileSync(join(dir, "AGENTS.md"), "# House rules\nDo not touch.\n");
    scaffold(dir);
    assert.equal(readFileSync(join(dir, "AGENTS.md"), "utf8"), "# House rules\nDo not touch.\n", "host AGENTS.md preserved");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("--ratchet installs only the anti-gaming hook, skipping AGENTS.md and the snapshot", () => {
  const dir = gitRepo();
  try {
    const r = scaffold(dir, ["--ratchet"]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!existsSync(join(dir, ".modonome", "snapshot")), "no snapshot generated");
    assert.ok(!existsSync(join(dir, "llms.txt")), "no llms.txt");
    assert.ok(!existsSync(join(dir, "AGENTS.md")), "no AGENTS.md pointer created");
    const hook = join(dir, ".git", "hooks", "pre-commit");
    assert.ok(existsSync(hook), "pre-commit hook installed");
    assert.match(readFileSync(hook, "utf8"), /modonome ratchet --staged/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("--no-snapshot opts out of snapshot generation", () => {
  const dir = gitRepo();
  try {
    const r = scaffold(dir, ["--no-snapshot"]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!existsSync(join(dir, ".modonome", "snapshot")), "no snapshot generated");
    assert.ok(!existsSync(join(dir, "llms.txt")), "no llms.txt");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("--tripwires installs the Claude Code and Cursor hook packs plus the vendored kernel", () => {
  const dir = gitRepo();
  try {
    const r = scaffold(dir, ["--no-snapshot", "--tripwires"]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, ".claude", "settings.json")), ".claude/settings.json installed");
    assert.ok(existsSync(join(dir, ".cursor", "hooks.json")), ".cursor/hooks.json installed");
    assert.ok(existsSync(join(dir, "scripts", "tripwire-check.mjs")), "kernel vendored");
    assert.ok(existsSync(join(dir, "scripts", "guard-ratchet.mjs")), "detector vendored");
    assert.match(readFileSync(join(dir, ".claude", "settings.json"), "utf8"), /tripwire-check\.mjs --format=claude/);
    assert.match(readFileSync(join(dir, ".cursor", "hooks.json"), "utf8"), /tripwire-check\.mjs --format=cursor/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("--tripwires never overwrites a file the host already has at the destination", () => {
  const dir = gitRepo();
  try {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(join(dir, ".claude", "settings.json"), "{\n  \"custom\": true\n}\n");
    scaffold(dir, ["--no-snapshot", "--tripwires"]);
    assert.equal(readFileSync(join(dir, ".claude", "settings.json"), "utf8"), "{\n  \"custom\": true\n}\n", "host settings.json preserved");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("without --tripwires, scaffold does not install the hook packs", () => {
  const dir = gitRepo();
  try {
    scaffold(dir, ["--no-snapshot"]);
    assert.ok(!existsSync(join(dir, ".claude", "settings.json")), "no .claude/settings.json without the flag");
    assert.ok(!existsSync(join(dir, ".cursor", "hooks.json")), "no .cursor/hooks.json without the flag");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
