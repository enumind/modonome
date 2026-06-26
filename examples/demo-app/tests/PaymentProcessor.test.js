import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PaymentProcessor } from "../src/PaymentProcessor.js";

function makeGateway() {
  return {
    async charge(payload) {
      return { id: "pay_test_001", status: "succeeded" };
    },
    async refund(payload) {
      return { status: "refunded" };
    },
  };
}

describe("PaymentProcessor", () => {
  it("charge returns a ref and succeeded status", async () => {
    const processor = new PaymentProcessor(makeGateway());
    const result = await processor.charge(19.99, "USD", { type: "card", token: "tok_test" });
    assert.equal(result.ref, "pay_test_001");
    assert.equal(result.status, "succeeded");
  });

  it("charge defaults to USD when currency is undefined", async () => {
    let captured;
    const gateway = {
      async charge(payload) {
        captured = payload;
        return { id: "pay_test_002", status: "succeeded" };
      },
      async refund() { return { status: "refunded" }; },
    };
    const processor = new PaymentProcessor(gateway);
    await processor.charge(10, undefined, {});
    assert.equal(captured.currency, "USD");
  });

  it("charge converts amount to cents", async () => {
    let captured;
    const gateway = {
      async charge(payload) {
        captured = payload;
        return { id: "pay_test_003", status: "succeeded" };
      },
      async refund() { return { status: "refunded" }; },
    };
    const processor = new PaymentProcessor(gateway);
    await processor.charge(9.99, "USD", {});
    assert.equal(captured.amount, 999);
  });

  it("refund returns refunded status", async () => {
    const processor = new PaymentProcessor(makeGateway());
    const result = await processor.refund(19.99, "pay_test_001");
    assert.equal(result.status, "refunded");
  });
});
