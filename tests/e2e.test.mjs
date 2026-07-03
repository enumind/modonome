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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

// ---------------------------------------------------------------------------
// 11. MCP server: modonome_ratchet via diff_path
// ---------------------------------------------------------------------------

test("MCP modonome_ratchet tool accepts diff_path for a clean diff", () => {
  const fixture = join(root, "agentproof/fixtures/ratchet-clean.patch");
  const responses = mcpCall("tools/call", { name: "modonome_ratchet", arguments: { diff_path: fixture } });
  const response = responses.find((r) => r.result);
  assert.ok(response, "MCP server returned no response");

  const content = JSON.parse(response.result.content[0].text);
  assert.equal(content.passed, true, "ratchet tool should accept a clean diff via diff_path");
  assert.deepEqual(content.violations, []);
});

test("MCP modonome_ratchet tool rejects a diff_path that does not exist", () => {
  const responses = mcpCall("tools/call", { name: "modonome_ratchet", arguments: { diff_path: "/nonexistent/path.patch" } });
  const response = responses.find((r) => r.result);
  const content = JSON.parse(response.result.content[0].text);
  assert.equal(content.passed, false);
  assert.ok(content.violations[0].includes("does not exist"));
});

test("MCP modonome_ratchet tool rejects a diff_path that is a directory", () => {
  const responses = mcpCall("tools/call", { name: "modonome_ratchet", arguments: { diff_path: root } });
  const response = responses.find((r) => r.result);
  const content = JSON.parse(response.result.content[0].text);
  assert.equal(content.passed, false);
  assert.ok(content.violations[0].includes("regular file"));
});

test("MCP modonome_ratchet tool rejects a diff_path with a disallowed extension", () => {
  const dir = tmp();
  try {
    const badPath = join(dir, "diff.exe");
    writeFileSync(badPath, "not a diff", "utf8");
    const responses = mcpCall("tools/call", { name: "modonome_ratchet", arguments: { diff_path: badPath } });
    const response = responses.find((r) => r.result);
    const content = JSON.parse(response.result.content[0].text);
    assert.equal(content.passed, false);
    assert.ok(content.violations[0].includes("extension not allowed"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MCP modonome_ratchet tool requires diff or diff_path", () => {
  const responses = mcpCall("tools/call", { name: "modonome_ratchet", arguments: {} });
  const response = responses.find((r) => r.result);
  const content = JSON.parse(response.result.content[0].text);
  assert.equal(content.passed, false);
  assert.ok(content.violations[0].includes("Either diff or diff_path is required"));
});

// ---------------------------------------------------------------------------
// 12. MCP server: modonome_validate_config
// ---------------------------------------------------------------------------

test("MCP modonome_validate_config tool validates a safe config", () => {
  const configContent = readFileSync(join(root, "templates/.modonome/config.yaml"), "utf8");
  const responses = mcpCall("tools/call", { name: "modonome_validate_config", arguments: { content: configContent } });
  const response = responses.find((r) => r.result);
  const content = JSON.parse(response.result.content[0].text);
  assert.equal(content.valid, true, `expected valid config: ${JSON.stringify(content.errors)}`);
  assert.deepEqual(content.errors, []);
});

test("MCP modonome_validate_config tool rejects an invalid JSON config", () => {
  const responses = mcpCall("tools/call", {
    name: "modonome_validate_config",
    arguments: { content: JSON.stringify({ schema_version: 1 }), format: "json" },
  });
  const response = responses.find((r) => r.result);
  const content = JSON.parse(response.result.content[0].text);
  assert.equal(content.valid, false);
  assert.ok(content.errors.length > 0);
});

test("MCP modonome_validate_config tool reports a tool error when content is missing", () => {
  const responses = mcpCall("tools/call", { name: "modonome_validate_config", arguments: {} });
  const response = responses.find((r) => r.error);
  assert.ok(response, "expected a JSON-RPC error response");
  assert.equal(response.error.code, -32603);
});

// ---------------------------------------------------------------------------
// 13. MCP server: modonome_validate_work_item (valid case)
// ---------------------------------------------------------------------------

test("MCP modonome_validate_work_item tool validates a valid work item", () => {
  const responses = mcpCall("tools/call", {
    name: "modonome_validate_work_item",
    arguments: {
      item: {
        schema_version: 1, id: "mcp-e2e-valid", state: "queued", attempts: 0, max_attempts: 3,
        touches_protected_path: false, allowed_edit_set: ["src/a.ts"], gates: ["npm test"],
      },
    },
  });
  const response = responses.find((r) => r.result);
  const content = JSON.parse(response.result.content[0].text);
  assert.equal(content.valid, true, `expected valid work item: ${JSON.stringify(content.errors)}`);
});

// ---------------------------------------------------------------------------
// 14. MCP server: modonome_status
// ---------------------------------------------------------------------------

test("MCP modonome_status tool reports scaffolded=false for an empty repo", () => {
  const dir = tmp();
  try {
    const responses = mcpCall("tools/call", { name: "modonome_status", arguments: { repo_path: dir } });
    const response = responses.find((r) => r.result);
    const content = JSON.parse(response.result.content[0].text);
    assert.equal(content.scaffolded, false);
    assert.ok(content.message.includes("scaffold"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MCP modonome_status tool reports full posture for a scaffolded repo", () => {
  const dir = tmp();
  try {
    const scaffold = run("scripts/scaffold.mjs", dir, "--write");
    assert.equal(scaffold.status, 0, `scaffold failed: ${scaffold.stderr}`);

    const req = JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "tools/call",
      params: { name: "modonome_status", arguments: { repo_path: dir } },
    }) + "\n";
    const result = spawnSync("node", [join(root, "scripts/mcp-server.mjs")], {
      input: req, encoding: "utf8", timeout: 90000,
    });
    const lines = result.stdout.split("\n").filter((l) => l.trim());
    const response = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((r) => r?.result);
    assert.ok(response, `MCP server returned no response: ${result.stderr}`);

    const content = JSON.parse(response.result.content[0].text);
    assert.equal(content.scaffolded, true);
    assert.equal(content.config_valid, true);
    assert.equal(content.posture.autonomy_enabled, false);
    assert.ok(content.agentproof, "expected agentproof results");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MCP modonome_status tool caches the agentproof result across two calls", () => {
  const dir = tmp();
  try {
    const scaffold = run("scripts/scaffold.mjs", dir, "--write");
    assert.equal(scaffold.status, 0, `scaffold failed: ${scaffold.stderr}`);

    const callReq = (id) => JSON.stringify({
      jsonrpc: "2.0", id, method: "tools/call",
      params: { name: "modonome_status", arguments: { repo_path: dir } },
    }) + "\n";
    const input = callReq(1) + callReq(2);

    const result = spawnSync("node", [join(root, "scripts/mcp-server.mjs")], {
      input, encoding: "utf8", timeout: 90000,
    });
    const lines = result.stdout.split("\n").filter((l) => l.trim());
    const responses = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r?.result);
    assert.equal(responses.length, 2, `expected two responses: ${result.stderr}`);

    for (const response of responses) {
      const content = JSON.parse(response.result.content[0].text);
      assert.ok(content.agentproof, "expected agentproof results on every call");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 15. MCP server: JSON-RPC protocol edges
// ---------------------------------------------------------------------------

test("MCP server responds to initialize", () => {
  const responses = mcpCall("initialize");
  const response = responses.find((r) => r.result?.protocolVersion);
  assert.ok(response, "expected an initialize response");
  assert.equal(response.result.serverInfo.name, "modonome");
});

test("MCP server responds to ping", () => {
  const responses = mcpCall("ping");
  const response = responses.find((r) => r.id === 1);
  assert.ok(response, "expected a ping response");
  assert.deepEqual(response.result, {});
});

test("MCP server returns an error for an unknown tool", () => {
  const responses = mcpCall("tools/call", { name: "modonome_nonexistent", arguments: {} });
  const response = responses.find((r) => r.error);
  assert.ok(response, "expected an error response");
  assert.equal(response.error.code, -32601);
});

test("MCP server returns an error for an unknown method", () => {
  const responses = mcpCall("totally/unknown/method");
  const response = responses.find((r) => r.error);
  assert.ok(response, "expected an error response");
  assert.equal(response.error.code, -32601);
  assert.ok(response.error.message.includes("Method not found"));
});

test("MCP server returns a parse error for malformed JSON input", () => {
  const result = spawnSync("node", [join(root, "scripts/mcp-server.mjs")], {
    input: "not valid json\n", encoding: "utf8", timeout: 30000,
  });
  const lines = result.stdout.split("\n").filter((l) => l.trim());
  const response = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((r) => r?.error);
  assert.ok(response, "expected a parse error response");
  assert.equal(response.error.code, -32700);
  assert.equal(response.id, null);
});

test("MCP server ignores blank lines on stdin", () => {
  const req = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }) + "\n";
  const result = spawnSync("node", [join(root, "scripts/mcp-server.mjs")], {
    input: "\n" + req, encoding: "utf8", timeout: 30000,
  });
  const lines = result.stdout.split("\n").filter((l) => l.trim());
  const responses = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  assert.equal(responses.length, 1, "blank line should not produce a response");
  assert.deepEqual(responses[0].result, {});
});

// ---------------------------------------------------------------------------
// 16. Governance validators: cross-field rules the schema itself cannot express
// ---------------------------------------------------------------------------

test("work item validator requires an escalation_reason on escalated items", async () => {
  const { validateWorkItem } = await import(join(root, "scripts/validate-work-item.mjs"));

  const noReason = {
    schema_version: 1, id: "e2e-escalated-no-reason", state: "escalated",
  };
  const errors = validateWorkItem(noReason);
  assert.ok(errors.some((e) => e.includes("no escalation_reason")), "escalated item without a reason must be caught");

  const withReason = { ...noReason, id: "e2e-escalated-with-reason", escalation_reason: "flagged by owner review" };
  assert.deepEqual(validateWorkItem(withReason), [], "escalated item with a reason should pass");
});

test("work item validator rejects attempts that exceed max_attempts", async () => {
  const { validateWorkItem } = await import(join(root, "scripts/validate-work-item.mjs"));

  const overCap = {
    schema_version: 1, id: "e2e-over-cap", state: "queued",
    attempts: 4, max_attempts: 3,
  };
  const errors = validateWorkItem(overCap);
  assert.ok(errors.some((e) => e.includes("exceeds max_attempts")), "attempts over the cap must be caught");

  const atCap = { ...overCap, id: "e2e-at-cap", attempts: 3 };
  assert.deepEqual(validateWorkItem(atCap), [], "attempts equal to the cap should pass");
});

// ---------------------------------------------------------------------------
// 17. CLI usage errors: each validator's main guard exits 2 without a path
// ---------------------------------------------------------------------------

test("validate-config CLI requires a path argument", () => {
  const r = run("scripts/validate-config.mjs");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage: node scripts\/validate-config.mjs/);
});

test("validate-work-item CLI requires a path argument", () => {
  const r = run("scripts/validate-work-item.mjs");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage: node scripts\/validate-work-item.mjs/);
});

test("validate-work-item CLI accepts a valid item file and reports it valid", () => {
  const dir = tmp();
  try {
    const path = join(dir, "item.json");
    writeFileSync(path, JSON.stringify({ schema_version: 1, id: "cli-valid", state: "queued" }));
    const r = run("scripts/validate-work-item.mjs", path);
    assert.equal(r.status, 0, `expected valid item to pass: ${r.stderr}`);
    assert.match(r.stdout, /Work item valid/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate-work-item CLI rejects an invalid item file with details on stderr", () => {
  const dir = tmp();
  try {
    const path = join(dir, "item.json");
    writeFileSync(path, JSON.stringify({ schema_version: 1, id: "cli-invalid", state: "escalated" }));
    const r = run("scripts/validate-work-item.mjs", path);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Work item invalid/);
    assert.match(r.stderr, /escalation_reason/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate-knowledge-packet CLI requires a path argument", () => {
  const r = run("scripts/validate-knowledge-packet.mjs");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage: node scripts\/validate-knowledge-packet.mjs/);
});
