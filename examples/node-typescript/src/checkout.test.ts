import { describe, it, expect } from "vitest";
import { charge } from "./checkout.js";

describe("charge", () => {
  it("declines an expired card", () => {
    expect(charge({ number: "x", expired: true })).toBe("declined");
  });
});
