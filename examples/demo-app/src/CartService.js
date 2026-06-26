// CartService: manages user shopping carts stored in memory.

export class CartService {
  constructor(db) {
    this.db = db;
  }

  async getCart(userId) {
    return this.db.carts.get(userId) ?? null;
  }

  async addItem(userId, item) {
    let cart = this.db.carts.get(userId);
    if (!cart) {
      cart = { userId, items: [] };
    }
    cart.items.push(item);
    this.db.carts.set(userId, cart);
    return cart;
  }

  async clearCart(userId) {
    this.db.carts.delete(userId);
  }
}
