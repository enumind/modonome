// NotificationService: records notifications sent to users.
// Uses an in-memory log; no real transport is wired up in the demo.

export class NotificationService {
  constructor() {
    this.log = [];
  }

  async notify(userId, type, message) {
    const entry = { userId, type, message, sentAt: new Date().toISOString() };
    this.log.push(entry);
    return entry;
  }

  getSentNotifications(userId) {
    return this.log.filter((n) => n.userId === userId);
  }
}
