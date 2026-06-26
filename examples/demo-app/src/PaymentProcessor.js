// PaymentProcessor: wraps a payment gateway with amount conversion.
// Parameters are plain JS (no static types); callers are responsible
// for passing numeric amounts.

export class PaymentProcessor {
  constructor(gateway) {
    this.gateway = gateway;
  }

  async charge(amount, currency, paymentMethod) {
    const response = await this.gateway.charge({
      amount: Math.round(amount * 100),
      currency: currency ?? "USD",
      method: paymentMethod,
    });
    return { ref: response.id, status: response.status };
  }

  async refund(amount, ref) {
    const response = await this.gateway.refund({ amount: Math.round(amount * 100), ref });
    return { status: response.status };
  }
}
