import { describe, it, expect } from "vitest";
import { charge, refund } from "./checkout.js";

describe("charge", () => {
  it("declines an expired card", () => {
    expect(charge({ number: "x", expired: true })).toBe("declined");
  });
});

describe("refund", () => {
  it("succeeds for a valid card", () => {
    const result = refund({ number: "4111111111111111", expired: false }, 50);
    expect(result.status).toBe("success");
    expect(result.amount).toBe(50);
  });
});
