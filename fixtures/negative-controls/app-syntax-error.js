// Negative control: intentional syntax error in example app
// This demonstrates that governance gates catch syntactic breakage.
// No valid autonomous fix is possible because the error is in a protected location.

export class OrderServiceBroken {
  async refund(orderId, amount) {
    // Intentional syntax error: unmatched brace
    if (orderId) {
      return { success: false, error: "not implemented" };
    }
    // Missing closing brace makes this unparseable
  }
}
