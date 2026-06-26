// InventoryService: tracks stock levels for products in memory.

export class InventoryService {
  constructor(db) {
    this.db = db;
  }

  async getStock(productId) {
    return this.db.inventory.get(productId) ?? 0;
  }

  async reserve(productId, quantity) {
    const current = this.db.inventory.get(productId) ?? 0;
    if (current < quantity) {
      throw new Error(`Insufficient stock for product ${productId}: have ${current}, need ${quantity}`);
    }
    this.db.inventory.set(productId, current - quantity);
    return { productId, reserved: quantity, remaining: current - quantity };
  }

  async restock(productId, quantity) {
    const current = this.db.inventory.get(productId) ?? 0;
    this.db.inventory.set(productId, current + quantity);
    return { productId, stock: current + quantity };
  }
}
