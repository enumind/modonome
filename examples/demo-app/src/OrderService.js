// OrderService : 14 commits in 90 days, 0 tests on the refund path.
// Modonome dry-run flagged this as the highest-risk untested boundary.

export class OrderService {
  constructor(db, paymentClient) {
    this.db = db;
    this.paymentClient = paymentClient;
  }

  async createOrder(userId, items) {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await this.db.orders.create({ userId, items, total, status: "pending" });
    return order;
  }

  // Three conditional branches, zero assertions in any test file.
  // Modonome proposed adding 4 assertions covering each branch.
  async refund(orderId, reason) {
    const order = await this.db.orders.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    if (order.status === "refunded") {
      return { alreadyRefunded: true };
    }
    if (order.status !== "completed") {
      throw new Error(`Cannot refund order in status: ${order.status}`);
    }
    const result = await this.paymentClient.refund(order.total, order.paymentRef);
    await this.db.orders.update(orderId, { status: "refunded", refundReason: reason });
    return result;
  }
}
