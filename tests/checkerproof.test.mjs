// Coverage for CheckerProof (checkerproof/runner.mjs). The live model call is
// always injected here (deps.reviewImpl), so these tests run with no network,
// no API key, and no cost, the same convention run-cycle-openai.test.mjs and
// tool-loop-adapter.test.mjs use. The one live, real, no-mock exercise of this
// tool is the committed evidence file under checkerproof/evidence/, produced by
// an actual run against the actual configured checker model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScenarios, runScenario } from "../checkerproof/runner.mjs";

test("loadScenarios finds all five real scenarios with the expected shape", async () => {
  const scenarios = await loadScenarios();
  assert.equal(scenarios.length, 5);
  const ids = scenarios.map((s) => s.id);
  assert.deepEqual(ids, ["CP-01", "CP-02", "CP-03", "CP-04", "CP-05"]);
  for (const s of scenarios) {
    assert.ok(s.title && s.category && s.diff && s.rationale, `${s.id} is missing a required field`);
    assert.equal(typeof s.expectRequestChanges, "boolean");
  }
});

test("the negative control (CP-05) is the only scenario expecting approval", async () => {
  const scenarios = await loadScenarios();
  const expectingChanges = scenarios.filter((s) => s.expectRequestChanges);
  const expectingApproval = scenarios.filter((s) => !s.expectRequestChanges);
  assert.equal(expectingChanges.length, 4);
  assert.equal(expectingApproval.length, 1);
  assert.equal(expectingApproval[0].id, "CP-05");
});

test("runScenario scores a correct catch as caught: true", async () => {
  const scenarios = await loadScenarios();
  const cp01 = scenarios.find((s) => s.id === "CP-01");
  const checker = { model: "fake-model", transport: "anthropic-cli", cliPath: "claude" };
  const result = await runScenario(cp01, checker, {
    reviewImpl: async () => "The expected value was changed to match a bug.\nREQUEST_CHANGES: yes\n- found the drift",
  });
  assert.equal(result.status, "scored");
  assert.equal(result.caught, true);
});

test("runScenario scores a missed catch as caught: false, not skipped", async () => {
  const scenarios = await loadScenarios();
  const cp01 = scenarios.find((s) => s.id === "CP-01");
  const checker = { model: "fake-model", transport: "anthropic-cli", cliPath: "claude" };
  const result = await runScenario(cp01, checker, {
    reviewImpl: async () => "Looks good to me.\nREQUEST_CHANGES: no",
  });
  assert.equal(result.status, "scored");
  assert.equal(result.caught, false, "a miss must be scored as a real miss, not silently dropped");
});

test("runScenario scores the negative control correctly when the checker approves it", async () => {
  const scenarios = await loadScenarios();
  const cp05 = scenarios.find((s) => s.id === "CP-05");
  const checker = { model: "fake-model", transport: "anthropic-cli", cliPath: "claude" };
  const result = await runScenario(cp05, checker, {
    reviewImpl: async () => "This is a clean, well-scoped fix with a matching test.\nREQUEST_CHANGES: no",
  });
  assert.equal(result.status, "scored");
  assert.equal(result.caught, true);
});

test("runScenario scores the negative control as a miss (false-positive) when the checker over-triggers", async () => {
  const scenarios = await loadScenarios();
  const cp05 = scenarios.find((s) => s.id === "CP-05");
  const checker = { model: "fake-model", transport: "anthropic-cli", cliPath: "claude" };
  const result = await runScenario(cp05, checker, {
    reviewImpl: async () => "This looks suspicious.\nREQUEST_CHANGES: yes",
  });
  assert.equal(result.status, "scored");
  assert.equal(result.caught, false);
});

test("runScenario skips cleanly (never a fabricated score) when the checker CLI is absent", async () => {
  const scenarios = await loadScenarios();
  const cp01 = scenarios.find((s) => s.id === "CP-01");
  const checker = { model: "fake-model", transport: "anthropic-cli", cliPath: "definitely-not-a-real-binary-xyz" };
  const result = await runScenario(cp01, checker, {});
  assert.equal(result.status, "skipped");
  assert.equal(result.caught, undefined, "a skip must never carry a caught value");
  assert.match(result.detail, /not found on PATH/);
});

test("runScenario skips cleanly when the openai-http checker has no base_url", async () => {
  const scenarios = await loadScenarios();
  const cp01 = scenarios.find((s) => s.id === "CP-01");
  const checker = { model: "fake-model", transport: "openai-http", modelBaseUrl: undefined };
  const result = await runScenario(cp01, checker, {});
  assert.equal(result.status, "skipped");
  assert.match(result.detail, /no base_url/);
});

test("runScenario skips cleanly for an unsupported transport rather than throwing", async () => {
  const scenarios = await loadScenarios();
  const cp01 = scenarios.find((s) => s.id === "CP-01");
  const checker = { model: "fake-model", transport: "carrier-pigeon" };
  const result = await runScenario(cp01, checker, {});
  assert.equal(result.status, "skipped");
  assert.match(result.detail, /unsupported checker transport/);
});
