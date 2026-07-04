import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gateGraphErrors, determinismBoundaryErrors } from "../scripts/check-gate-dag.mjs";

// Unit coverage for the gate-graph validator. Until now this script was exercised
// only by AgentProof AP-24 as a spawned subprocess; these tests cover the exported
// gateGraphErrors directly so a regression is caught in the fast test loop.

test("a valid DAG returns no errors and a dependencies-first order", () => {
  const { errors, order } = gateGraphErrors({ ratchet: [], "work-item": ["ratchet"] });
  assert.deepEqual(errors, []);
  // ratchet is a dependency of work-item, so it must appear first.
  assert.ok(order.indexOf("ratchet") < order.indexOf("work-item"));
});

test("an empty graph is a valid (trivial) DAG", () => {
  const { errors, order } = gateGraphErrors({});
  assert.deepEqual(errors, []);
  assert.deepEqual(order, []);
});

test("a cycle is reported and names the loop", () => {
  const { errors, order } = gateGraphErrors({ a: ["b"], b: ["c"], c: ["a"] });
  assert.equal(order.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /cycle detected/);
});

test("a dangling edge is reported and names the missing gate", () => {
  const { errors, order } = gateGraphErrors({ a: ["missing-gate"] });
  assert.equal(order.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /dangling edge/);
  assert.match(errors[0], /missing-gate/);
});

test("a self-loop is detected as a cycle", () => {
  const { errors } = gateGraphErrors({ a: ["a"] });
  assert.ok(errors.some((e) => /cycle detected/.test(e)));
});

// ---------------------------------------------------------------------------
// Determinism boundary: deterministic detectors must not import the widener.
// ---------------------------------------------------------------------------

// Build a temp repo whose detect-attribution.mjs imports whatever `daImports` says.
function makeBoundaryFixture(daImports) {
  const tmp = mkdtempSync(join(tmpdir(), "modonome-boundary-"));
  mkdirSync(join(tmp, "scripts", "lib"), { recursive: true });
  writeFileSync(join(tmp, "scripts", "guard-ratchet.mjs"), "export const g = 1;\n");
  writeFileSync(join(tmp, "scripts", "check-repo-hygiene.mjs"), "export const h = 1;\n");
  writeFileSync(join(tmp, "scripts", "lib", "branch-name.mjs"), "export const b = 1;\n");
  writeFileSync(join(tmp, "scripts", "lib", "commit-identity.mjs"), "export const c = 1;\n");
  writeFileSync(join(tmp, "scripts", "lib", "detect-attribution.mjs"), daImports + "export const d = 1;\n");
  writeFileSync(join(tmp, "scripts", "lib", "helper.mjs"), 'import "./near-miss.mjs";\nexport const x = 1;\n');
  writeFileSync(join(tmp, "scripts", "lib", "near-miss.mjs"), 'import "./detect-attribution.mjs";\nexport const w = 1;\n');
  return tmp;
}

test("the real repo satisfies the determinism boundary", () => {
  assert.deepEqual(determinismBoundaryErrors(), []);
});

test("a detector importing the widener directly is caught", () => {
  const tmp = makeBoundaryFixture('import "./near-miss.mjs";\n');
  try {
    const errors = determinismBoundaryErrors(tmp);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /detect-attribution\.mjs can reach scripts\/lib\/near-miss\.mjs/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a detector importing the widener transitively (one hop) is caught", () => {
  const tmp = makeBoundaryFixture('import "./helper.mjs";\n');
  try {
    const errors = determinismBoundaryErrors(tmp);
    assert.equal(errors.length, 1, "indirection through helper.mjs must not evade the check");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a detector importing the remediation applier is caught", () => {
  const tmp = makeBoundaryFixture('import "./remediate.mjs";\n');
  try {
    const errors = determinismBoundaryErrors(tmp);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /detect-attribution\.mjs can reach scripts\/lib\/remediate\.mjs/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("the allowed reverse edge (widener imports a detector) does not trip the check", () => {
  // detect-attribution.mjs imports nothing forbidden; near-miss.mjs imports it. That
  // reverse direction is required and safe, so the boundary must stay clean.
  const tmp = makeBoundaryFixture("");
  try {
    assert.deepEqual(determinismBoundaryErrors(tmp), []);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
