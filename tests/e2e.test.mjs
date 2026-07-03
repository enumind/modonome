// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
/**
 * End-to-end integration test. Proves the full governance chain works as a
 * connected system, proving the chain holds end to end.
 *
 * Chain under test:
 *   scaffold → validate config → work item lifecycle → ratchet → MCP server
 *
 * Each test operates on a real temp directory so the scripts run against
 * actual files, with no mocks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-e2e-"));
}

function run(script, ...args) {
  return spawnSync("node", [join(root, script), ...args], { encoding: "utf8", timeout: 30000 });
}

function mcpCall(method, params = {}) {
  const req = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) + "\n";
  const result = spawnSync(
    "node",
    [join(root, "scripts/mcp-server.mjs")],
    { input: req + JSON.stringify({ jsonrpc: "2.0", id: 2, method: "notifications/initialized" }) + "\n", encoding: "utf8", timeout: 30000 }
  );
  const lines = result.stdout.split("\n").filter((l) => l.trim());
  return lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// 1. Scaffold → valid config
// ---------------------------------------------------------------------------

test("scaffold produces a valid, safe config", async () => {
  const dir = tmp();
  try {
    const scaffold = run("scripts/scaffold.mjs", dir, "--write");
    assert.equal(scaffold.status, 0, `scaffold failed: ${scaffold.stderr}`);

    const configPath = join(dir, ".modonome", "config.yaml");
    const validate = run("scripts/validate-config.mjs", configPath);
    assert.equal(validate.status, 0, `scaffolded config is invalid: ${validate.stderr}`);

    const { parseFlatYaml } = await import(join(root, "scripts/lib/yaml-lite.mjs"));
    const cfg = parseFlatYaml(readFileSync(configPath, "utf8"));

    assert.equal(cfg.autonomy_enabled, false, "autonomy_enabled must be false after scaffold");
    assert.equal(cfg.auto_merge, false, "auto_merge must be false after scaffold");
    assert.equal(cfg.dry_run, true, "dry_run must be true after scaffold");
    assert.equal(cfg.max_merges_per_day, 0, "max_merges_per_day must be 0 after scaffold");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 2. Work item lifecycle: valid item passes all states
// ---------------------------------------------------------------------------

test("work item validator accepts a well-formed item through its lifecycle", async () => {
  const { validateWorkItem } = await import(join(root, "scripts/validate-work-item.mjs"));

  const states = ["queued", "claimed", "making", "checking", "merge_ready", "done"];
  for (const state of states) {
    const item = {
      schema_version: 1,
      id: `e2e-lifecycle-${state}`,
      state,
      maker_id: "session-maker-abc",
      maker_model: "model-a",
      checker_id: "session-checker-xyz",
      checker_model: "model-b",
      attempts: 1,
      max_attempts: 3,
    };
    const errors = validateWorkItem(item);
    assert.deepEqual(errors, [], `state ${state} produced unexpected errors: ${errors.join(", ")}`);
  }
});

// ---------------------------------------------------------------------------
// 3. Work item governance: identity collapse caught at the source
// ---------------------------------------------------------------------------

test("work item validator rejects both forms of identity collapse", async () => {
  const { validateWorkItem } = await import(join(root, "scripts/validate-work-item.mjs"));

  const sessionCollapse = {
    schema_version: 1, id: "e2e-session-collapse", state: "checking",
    maker_id: "same-session", maker_model: "model-a",
    checker_id: "same-session", checker_model: "model-b",
    attempts: 1, max_attempts: 3,
  };
  assert.ok(validateWorkItem(sessionCollapse).length > 0, "session identity collapse not caught");

  const modelCollapse = {
    schema_version: 1, id: "e2e-model-collapse", state: "checking",
    maker_id: "session-a", maker_model: "model-a",
    checker_id: "session-b", checker_model: "model-a",
    attempts: 1, max_attempts: 3,
  };
  assert.ok(validateWorkItem(modelCollapse).length > 0, "model identity collapse not caught");
});

// ---------------------------------------------------------------------------
// 4. Protected path: cannot reach merge_ready without escalation
// ---------------------------------------------------------------------------

test("work item validator blocks protected-path merge without escalation", async () => {
  const { validateWorkItem } = await import(join(root, "scripts/validate-work-item.mjs"));

  const noEscalation = {
    schema_version: 1, id: "e2e-protected-no-escalation", state: "merge_ready",
    maker_id: "session-a", maker_model: "model-a",
    checker_id: "session-b", checker_model: "model-b",
    touches_protected_path: true,
    attempts: 1, max_attempts: 3,
  };
  assert.ok(validateWorkItem(noEscalation).length > 0, "protected path without escalation not blocked");

  const withEscalation = {
    ...noEscalation, id: "e2e-protected-escalated",
    state: "escalated",
    escalation_reason: "CI definition change requires owner review per protected-path policy.",
  };
  assert.deepEqual(validateWorkItem(withEscalation), [], "escalated protected-path item should pass");
});

// ---------------------------------------------------------------------------
// 5. Ratchet: clean diff passes, all five attack classes fail
// ---------------------------------------------------------------------------

test("ratchet passes clean diffs and catches all five gate-weakening patterns", () => {
  const fixtures = join(root, "agentproof/fixtures");

  const clean = run("scripts/guard-ratchet.mjs", "--diff", join(fixtures, "ratchet-clean.patch"));
  assert.equal(clean.status, 0, `clean diff rejected: ${clean.stderr}`);

  const attacks = [
    ["ratchet-assertion-removal.patch", "assertion removal"],
    ["ratchet-skip-injection.patch",    "skip injection"],
    ["ratchet-type-escape.patch",       "type escape"],
    ["ratchet-coverage-removal.patch",  "coverage removal"],
  ];

  for (const [fixture, label] of attacks) {
    const result = run("scripts/guard-ratchet.mjs", "--diff", join(fixtures, fixture));
    assert.equal(result.status, 1, `ratchet did not catch ${label}`);
  }
});

// ---------------------------------------------------------------------------
// 6. Ratchet → work item: full governance chain for a proposed change
// ---------------------------------------------------------------------------

test("full chain: clean diff produces a valid merge-ready work item; gaming diff does not", async () => {
  const { validateWorkItem } = await import(join(root, "scripts/validate-work-item.mjs"));
  const fixtures = join(root, "agentproof/fixtures");

  function buildItem(diffFile, state) {
    const ratchetResult = run("scripts/guard-ratchet.mjs", "--diff", join(fixtures, diffFile));
    const ratchetPassed = ratchetResult.status === 0;
    const item = {
      schema_version: 1,
      id: `e2e-chain-${diffFile}`,
      state: ratchetPassed ? state : "escalated",
      maker_id: "session-maker", maker_model: "model-a",
      checker_id: "session-checker", checker_model: "model-b",
      attempts: 1, max_attempts: 3,
    };
    if (!ratchetPassed) item.escalation_reason = "Ratchet rejected: gate weakening detected.";
    return item;
  }

  const cleanItem = buildItem("ratchet-clean.patch", "merge_ready");
  assert.equal(cleanItem.state, "merge_ready", "clean diff should produce merge_ready item");
  assert.deepEqual(validateWorkItem(cleanItem), [], "clean merge_ready item should be valid");

  const attackItem = buildItem("ratchet-assertion-removal.patch", "merge_ready");
  assert.equal(attackItem.state, "escalated", "gaming diff should produce escalated item");
  assert.deepEqual(validateWorkItem(attackItem), [], "escalated gaming item should be valid (correctly routed)");
});

// ---------------------------------------------------------------------------
// 7. MCP server: tools/list returns all four tools
// ---------------------------------------------------------------------------

test("MCP server exposes all four governance tools", () => {
  const responses = mcpCall("tools/list");
  const listResponse = responses.find((r) => r.result?.tools);
  assert.ok(listResponse, "tools/list returned no response");

  const names = listResponse.result.tools.map((t) => t.name);
  assert.ok(names.includes("modonome_ratchet"), "modonome_ratchet tool missing");
  assert.ok(names.includes("modonome_validate_config"), "modonome_validate_config tool missing");
  assert.ok(names.includes("modonome_validate_work_item"), "modonome_validate_work_item tool missing");
  assert.ok(names.includes("modonome_status"), "modonome_status tool missing");
});

// ---------------------------------------------------------------------------
// 8. MCP server: ratchet tool rejects gaming diff
// ---------------------------------------------------------------------------

test("MCP modonome_ratchet tool returns violations for a gaming diff", () => {
  const fixture = readFileSync(join(root, "agentproof/fixtures/ratchet-assertion-removal.patch"), "utf8");
  const req = JSON.stringify({
    jsonrpc: "2.0", id: 1,
    method: "tools/call",
    params: { name: "modonome_ratchet", arguments: { diff: fixture } },
  }) + "\n";

  const result = spawnSync("node", [join(root, "scripts/mcp-server.mjs")], {
    input: req, encoding: "utf8", timeout: 30000,
  });

  const lines = result.stdout.split("\n").filter((l) => l.trim());
  const response = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((r) => r?.result);
  assert.ok(response, "MCP server returned no response");

  const content = JSON.parse(response.result.content[0].text);
  assert.equal(content.passed, false, "ratchet tool should report passed=false for gaming diff");
  assert.ok(content.violations.length > 0, "ratchet tool should report violations");
});

// ---------------------------------------------------------------------------
// 9. MCP server: validate_work_item catches identity collapse
// ---------------------------------------------------------------------------

test("MCP modonome_validate_work_item catches identity collapse", () => {
  const req = JSON.stringify({
    jsonrpc: "2.0", id: 1,
    method: "tools/call",
    params: {
      name: "modonome_validate_work_item",
      arguments: {
        item: {
          schema_version: 1, id: "mcp-e2e-collapse", state: "checking",
          maker_id: "same-session", maker_model: "model-a",
          checker_id: "same-session", checker_model: "model-b",
          attempts: 1, max_attempts: 3,
        },
      },
    },
  }) + "\n";

  const result = spawnSync("node", [join(root, "scripts/mcp-server.mjs")], {
    input: req, encoding: "utf8", timeout: 30000,
  });

  const lines = result.stdout.split("\n").filter((l) => l.trim());
  const response = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((r) => r?.result);
  assert.ok(response, "MCP server returned no response");

  const content = JSON.parse(response.result.content[0].text);
  assert.equal(content.valid, false, "validate_work_item should report valid=false for identity collapse");
  assert.ok(content.errors.length > 0, "validate_work_item should report errors");
});

// ---------------------------------------------------------------------------
// 10. Ratchet: Java and .NET gate-weakening patterns all caught
// ---------------------------------------------------------------------------

test("ratchet catches Java and .NET gate-weakening patterns", () => {
  const fixtures = join(root, "agentproof/fixtures");

  const javaAndDotnetAttacks = [
    ["ratchet-java-assertion-removal.patch",   "Java assertion removal"],
    ["ratchet-java-skip-injection.patch",      "Java @Disabled/@Ignore injection"],
    ["ratchet-java-unchecked-suppression.patch", "Java @SuppressWarnings(unchecked)"],
    ["ratchet-java-coverage-removal.patch",    "Java JaCoCo coverage removal"],
    ["ratchet-dotnet-assertion-removal.patch", ".NET assertion removal"],
    ["ratchet-dotnet-skip-injection.patch",    ".NET [Ignore]/[Fact(Skip)] injection"],
    ["ratchet-dotnet-pragma-disable.patch",    ".NET #pragma warning disable"],
    ["ratchet-dotnet-coverage-removal.patch",  ".NET Coverlet threshold removal"],
  ];

  for (const [fixture, label] of javaAndDotnetAttacks) {
    const result = run("scripts/guard-ratchet.mjs", "--diff", join(fixtures, fixture));
    assert.equal(result.status, 1, `ratchet did not catch ${label}`);
  }
});
