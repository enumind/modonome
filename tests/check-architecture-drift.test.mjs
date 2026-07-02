import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function makeMinimalRepo() {
  const tmp = mkdtempSync(join(tmpdir(), "modonome-arch-drift-test-"));
  mkdirSync(join(tmp, "scripts", "agent"), { recursive: true });
  mkdirSync(join(tmp, "schemas"), { recursive: true });
  return tmp;
}

function runScript(tmp) {
  return spawnSync("node", [join(root, "scripts/check-architecture-drift.mjs")], {
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, MODONOME_ROOT: tmp },
  });
}

test("this repo's own ARCHITECTURE.md passes", () => {
  const r = spawnSync("node", [join(root, "scripts/check-architecture-drift.mjs")], { encoding: "utf8", timeout: 30000 });
  assert.strictEqual(r.status, 0, `expected exit 0 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
});

test("negative: a scripts/agent/*.mjs file not mentioned in ARCHITECTURE.md is caught", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "scripts", "agent", "new-orchestrator.mjs"), "// new file\n");
    writeFileSync(join(tmp, "ARCHITECTURE.md"), "# Architecture\n\nNo mention of the new file here.\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[unmentioned-script\] new-orchestrator\.mjs exists but is not mentioned/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: a scripts/agent/*.mjs file mentioned anywhere in ARCHITECTURE.md passes", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "scripts", "agent", "new-orchestrator.mjs"), "// new file\n");
    writeFileSync(join(tmp, "ARCHITECTURE.md"), "# Architecture\n\nSee `scripts/agent/new-orchestrator.mjs` for details.\n");
    const r = runScript(tmp);
    assert.doesNotMatch(r.stdout + r.stderr, /\[unmentioned-script\]/, `unexpected finding:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: a scripts/mcp-server.mjs that exists but is unmentioned is caught", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "scripts", "mcp-server.mjs"), "// mcp server\n");
    writeFileSync(join(tmp, "ARCHITECTURE.md"), "# Architecture\n\nThree execution contexts.\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[unmentioned-script\] mcp-server\.mjs exists but is not mentioned/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: a stale backtick-quoted scripts/*.mjs reference is caught", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "ARCHITECTURE.md"), "# Architecture\n\nSee `scripts/does-not-exist.mjs` for details.\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[stale-reference\] ARCHITECTURE\.md cites `scripts\/does-not-exist\.mjs`, which does not exist/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: a backtick-quoted scripts/*.mjs reference that exists passes", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(join(tmp, "scripts", "real.mjs"), "// real\n");
    writeFileSync(join(tmp, "ARCHITECTURE.md"), "# Architecture\n\nSee `scripts/real.mjs` for details.\n");
    const r = runScript(tmp);
    assert.doesNotMatch(r.stdout + r.stderr, /\[stale-reference\]/, `unexpected finding:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("negative: a work-item state missing from the agent-loop section is caught", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(
      join(tmp, "schemas", "work-item.schema.json"),
      JSON.stringify({ properties: { state: { enum: ["queued", "escalated"] } } })
    );
    writeFileSync(join(tmp, "ARCHITECTURE.md"), "# Architecture\n\n## The agent loop\n\nOnly mentions queued here.\n");
    const r = runScript(tmp);
    assert.strictEqual(r.status, 1, `expected exit 1 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /\[unmentioned-state\] work-item state "escalated".*is not named/);
    assert.doesNotMatch(r.stdout + r.stderr, /\[unmentioned-state\] work-item state "queued"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("positive: every work-item state named in the agent-loop section passes", () => {
  const tmp = makeMinimalRepo();
  try {
    writeFileSync(
      join(tmp, "schemas", "work-item.schema.json"),
      JSON.stringify({ properties: { state: { enum: ["queued", "escalated"] } } })
    );
    writeFileSync(
      join(tmp, "ARCHITECTURE.md"),
      "# Architecture\n\n## The agent loop\n\nMentions queued and escalated here.\n\n## Next section\n\nescalated should not need to appear again but this section is out of scope anyway.\n"
    );
    const r = runScript(tmp);
    assert.doesNotMatch(r.stdout + r.stderr, /\[unmentioned-state\]/, `unexpected finding:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a fixture with no ARCHITECTURE.md is a clean no-op", () => {
  const tmp = makeMinimalRepo();
  try {
    const r = runScript(tmp);
    assert.strictEqual(r.status, 0, `expected exit 0 but got ${r.status}:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
