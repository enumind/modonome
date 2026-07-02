import { test } from "node:test";
import assert from "node:assert/strict";
import { gateGraphErrors } from "../scripts/check-gate-dag.mjs";

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
