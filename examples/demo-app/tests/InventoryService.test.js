import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InventoryService } from "../src/InventoryService.js";

function makeDb() {
  return { inventory: new Map() };
}

describe("InventoryService", () => {
  it("returns 0 for unknown product", async () => {
    const service = new InventoryService(makeDb());
    const stock = await service.getStock("unknown");
    assert.equal(stock, 0);
  });

  it("restocks a product", async () => {
    const service = new InventoryService(makeDb());
    const result = await service.restock("widget-A", 5);
    assert.equal(result.stock, 5);
  });

  it("reserves available stock", async () => {
    const service = new InventoryService(makeDb());
    await service.restock("widget-A", 10);
    const result = await service.reserve("widget-A", 3);
    assert.equal(result.reserved, 3);
    assert.equal(result.remaining, 7);
  });

  it("throws when insufficient stock", async () => {
    const service = new InventoryService(makeDb());
    await service.restock("widget-B", 2);
    await assert.rejects(
      () => service.reserve("widget-B", 5),
      (err) => {
        assert(err instanceof Error);
        assert.match(err.message, /Insufficient stock/);
        return true;
      }
    );
  });
});
