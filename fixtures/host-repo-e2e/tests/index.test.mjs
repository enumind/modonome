import { test } from "node:test";
import assert from "node:assert/strict";
import { charge } from "../src/index.js";

test("charge returns pending status", () => {
  const r = charge(100, "USD");
  assert.equal(r.status, "pending");
  assert.equal(r.amount, 100);
  assert.equal(r.currency, "USD");
});

test("charge rejects zero amount", () => {
  assert.throws(() => charge(0, "USD"), /invalid amount/);
});

test("charge rejects missing currency", () => {
  assert.throws(() => charge(50, ""), /currency required/);
});
