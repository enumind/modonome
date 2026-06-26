// OrderService: creates and manages orders.
// createOrder does not validate its input; passing null or undefined items
// will throw a raw TypeError (input validation is missing).
// refund has four conditional branches; test coverage is incomplete -
// only the "order not found" branch is currently covered by tests.

export class OrderService {
  constructor(db, paymentClient) {
    this.db = db;
    this.paymentClient = paymentClient;
  }

  async createOrder(userId, items) {
    // No input validation here. Null/undefined items will throw a TypeError.
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await this.db.orders.create({ userId, items, total, status: "pending" });
    return order;
  }

  // Four conditional branches: order not found, already refunded,
  // wrong status, and success path.
  // Refund branch coverage is incomplete - see tests/OrderService.test.js.
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
