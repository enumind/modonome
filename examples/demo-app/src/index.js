// Composition root for the demo app.
// Builds all services with in-memory stubs and runs a short scenario
// demonstrating order creation and refund.

import { OrderService } from "./OrderService.js";
import { CheckoutService } from "./CheckoutService.js";
import { CartService } from "./CartService.js";
import { InventoryService } from "./InventoryService.js";
import { NotificationService } from "./NotificationService.js";
import { PaymentProcessor } from "./PaymentProcessor.js";

// --- in-memory stubs ---

let nextOrderId = 1;

const db = {
  orders: {
    _store: new Map(),
    async create(data) {
      const id = String(nextOrderId++);
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
  carts: new Map(),
  inventory: new Map(),
};

const fakeGateway = {
  async charge(payload) {
    return { id: "pay_fake_001", status: "succeeded" };
  },
  async refund(payload) {
    return { status: "refunded" };
  },
};

// --- wire up services ---

const paymentProcessor = new PaymentProcessor(fakeGateway);
const orderService = new OrderService(db, paymentProcessor);
const cartService = new CartService(db);
const inventoryService = new InventoryService(db);
const notificationService = new NotificationService();
const checkoutService = new CheckoutService(cartService, orderService);

// --- run demo scenario ---

async function main() {
  console.log("=== modonome-demo startup ===");

  // Seed inventory
  await inventoryService.restock("widget-A", 10);
  console.log("Inventory seeded: widget-A x10");

  // Build a cart and check out
  await cartService.addItem("user-1", { productId: "widget-A", name: "Widget A", price: 19.99, quantity: 2 });
  const order = await checkoutService.checkout("user-1");
  console.log(`Order created: id=${order.id} total=${order.total} status=${order.status}`);

  // Simulate order completion so refund is possible
  await db.orders.update(order.id, { status: "completed", paymentRef: "pay_fake_001" });
  console.log(`Order ${order.id} marked completed`);

  // Refund the completed order
  const refundResult = await orderService.refund(order.id, "customer request");
  console.log(`Refund result: status=${refundResult.status}`);

  // Verify the order is now marked refunded
  const updated = await db.orders.findById(order.id);
  console.log(`Order status after refund: ${updated.status}`);

  // Send a notification
  const note = await notificationService.notify("user-1", "refund", `Refund processed for order ${order.id}`);
  console.log(`Notification sent: type=${note.type} to=${note.userId}`);

  console.log("=== demo complete ===");
}

main().catch((err) => {
  console.error("Demo failed:", err.message);
  process.exit(1);
});
