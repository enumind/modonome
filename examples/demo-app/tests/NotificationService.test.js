import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NotificationService } from "../src/NotificationService.js";

describe("NotificationService", () => {
  it("records a notification", async () => {
    const service = new NotificationService();
    const entry = await service.notify("user-1", "order_created", "Your order was placed");
    assert.equal(entry.userId, "user-1");
    assert.equal(entry.type, "order_created");
    assert.equal(entry.message, "Your order was placed");
    assert.ok(entry.sentAt);
  });

  it("returns notifications for a specific user", async () => {
    const service = new NotificationService();
    await service.notify("user-1", "order_created", "msg1");
    await service.notify("user-2", "refund", "msg2");
    await service.notify("user-1", "refund", "msg3");
    const notifications = service.getSentNotifications("user-1");
    assert.equal(notifications.length, 2);
    assert.ok(notifications.every((n) => n.userId === "user-1"));
  });

  it("returns empty array when user has no notifications", () => {
    const service = new NotificationService();
    const notifications = service.getSentNotifications("user-nobody");
    assert.deepEqual(notifications, []);
  });
});
