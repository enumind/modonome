// PaymentProcessor : strict mode was off. Running tsc --strict revealed
// 7 implicit-any errors here. Modonome fixed all 7 with explicit annotations.

export class PaymentProcessor {
  constructor(gateway) {
    this.gateway = gateway;
  }

  // Before Modonome: amount was implicit any; currency defaulted to any.
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
