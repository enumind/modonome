import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CartService } from "../src/CartService.js";

function makeDb() {
  return { carts: new Map() };
}

describe("CartService", () => {
  it("returns null for a user with no cart", async () => {
    const service = new CartService(makeDb());
    const cart = await service.getCart("user-x");
    assert.equal(cart, null);
  });

  it("adds an item to a new cart", async () => {
    const service = new CartService(makeDb());
    const cart = await service.addItem("user-1", { productId: "a", price: 5, quantity: 1 });
    assert.equal(cart.items.length, 1);
    assert.equal(cart.userId, "user-1");
  });

  it("accumulates multiple items in the same cart", async () => {
    const service = new CartService(makeDb());
    await service.addItem("user-2", { productId: "a", price: 5, quantity: 1 });
    const cart = await service.addItem("user-2", { productId: "b", price: 10, quantity: 2 });
    assert.equal(cart.items.length, 2);
  });

  it("clears a cart", async () => {
    const db = makeDb();
    const service = new CartService(db);
    await service.addItem("user-3", { productId: "c", price: 1, quantity: 1 });
    await service.clearCart("user-3");
    const cart = await service.getCart("user-3");
    assert.equal(cart, null);
  });
});
