import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CheckoutService } from "../src/CheckoutService.js";

function makeCartService(cart) {
  return {
    async getCart(userId) {
      return cart;
    },
  };
}

function makeOrderService() {
  return {
    async createOrder(userId, items) {
      return { id: "order-1", userId, items, status: "pending" };
    },
  };
}

describe("CheckoutService", () => {
  it("throws when cart is null", async () => {
    const service = new CheckoutService(makeCartService(null), makeOrderService());
    await assert.rejects(
      () => service.checkout("user-1"),
      /Cart is empty/
    );
  });

  it("throws when cart is empty", async () => {
    const service = new CheckoutService(makeCartService({ items: [] }), makeOrderService());
    await assert.rejects(
      () => service.checkout("user-1"),
      /Cart is empty/
    );
  });

  it("creates an order from a non-empty cart", async () => {
    const cart = { items: [{ productId: "a", price: 5, quantity: 1 }] };
    const service = new CheckoutService(makeCartService(cart), makeOrderService());
    const order = await service.checkout("user-1");
    assert.equal(order.id, "order-1");
    assert.equal(order.status, "pending");
  });
});
