import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const scenariosDir = join(root, "fixtures", "scenarios");

const VALID_STACKS = ["demo-app", "node-typescript", "python-service"];

test("load all scenario specs from fixtures/scenarios/*/spec.json", () => {
  const scenarioIds = readdirSync(scenariosDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  assert.ok(scenarioIds.length > 0, "at least one scenario directory exists");

  scenarioIds.forEach((scenarioId) => {
    const specPath = join(scenariosDir, scenarioId, "spec.json");
    let spec;

    try {
      const content = readFileSync(specPath, "utf8");
      spec = JSON.parse(content);
    } catch (err) {
      throw new Error(
        `Failed to load or parse ${specPath}: ${err.message}`
      );
    }

    // Assert required fields are present and non-empty
    assert.ok(spec.id, `${scenarioId}: id field is required and non-empty`);
    assert.equal(
      spec.id,
      scenarioId,
      `${scenarioId}: id must match directory name`
    );

    assert.ok(
      spec.stack,
      `${scenarioId}: stack field is required and non-empty`
    );
    assert.ok(
      VALID_STACKS.includes(spec.stack),
      `${scenarioId}: stack must be one of ${VALID_STACKS.join(
        ", "
      )}, got '${spec.stack}'`
    );

    assert.ok(
      spec.title,
      `${scenarioId}: title field is required and non-empty`
    );
    assert.ok(typeof spec.title === "string", `${scenarioId}: title must be string`);

    assert.ok(
      spec.detect_pattern,
      `${scenarioId}: detect_pattern field is required and non-empty`
    );
    assert.ok(
      typeof spec.detect_pattern === "string",
      `${scenarioId}: detect_pattern must be string`
    );

    assert.ok(
      spec.agent_task,
      `${scenarioId}: agent_task field is required and non-empty`
    );
    assert.ok(
      typeof spec.agent_task === "string",
      `${scenarioId}: agent_task must be string`
    );

    assert.ok(
      Array.isArray(spec.gates),
      `${scenarioId}: gates must be an array`
    );
    assert.ok(
      spec.gates.length > 0,
      `${scenarioId}: gates array must be non-empty`
    );
    spec.gates.forEach((gate, idx) => {
      assert.ok(
        typeof gate === "string",
        `${scenarioId}: gates[${idx}] must be string, got ${typeof gate}`
      );
      assert.ok(
        gate.length > 0,
        `${scenarioId}: gates[${idx}] must be non-empty string`
      );
    });

    assert.ok(
      spec.expected_outcome,
      `${scenarioId}: expected_outcome field is required and non-empty`
    );
    assert.ok(
      typeof spec.expected_outcome === "string",
      `${scenarioId}: expected_outcome must be string`
    );
  });
});
