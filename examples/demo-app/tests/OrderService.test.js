// Tests for OrderService.
// Refund branch coverage is incomplete: only the "order not found" branch
// is tested here. The "already refunded", "wrong status", and "success path"
// branches remain uncovered and can be added in a follow-up.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OrderService } from "../src/OrderService.js";

function makeDb(orders = new Map()) {
  return {
    orders: {
      _store: orders,
      async create(data) {
        const id = String(this._store.size + 1);
        const order = { id, ...data };
        this._store.set(id, order);
        return order;
      },
      async findById(id) {
        return this._store.get(id) ?? null;
      },
      async update(id, patch) {
        const order = this._store.get(id);
        if (!order) return null;
        Object.assign(order, patch);
        return order;
      },
    },
  };
}

const fakePaymentClient = {
  async refund(amount, ref) {
    return { status: "refunded" };
  },
};

describe("OrderService.refund", () => {
  it("throws when order is not found", async () => {
    const service = new OrderService(makeDb(), fakePaymentClient);
    await assert.rejects(
      () => service.refund("nonexistent-id", "test reason"),
      (err) => {
        assert(err instanceof Error);
        assert.match(err.message, /not found/);
        return true;
      }
    );
  });
});

// Debt: createOrder does not validate its input.
// Passing null items throws a raw TypeError instead of a descriptive error.
// This test documents the current (unguarded) behavior.
describe("OrderService.createOrder", () => {
  it("throws a TypeError when items is null (missing input validation)", async () => {
    const service = new OrderService(makeDb(), fakePaymentClient);
    await assert.rejects(
      () => service.createOrder("user-1", null),
      TypeError
    );
  });
});
