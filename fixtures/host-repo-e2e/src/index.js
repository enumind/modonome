// Minimal payments entry point — used only as a realistic target file for E2E tests.
export function charge(amount, currency) {
  if (typeof amount !== "number" || amount <= 0) throw new Error("invalid amount");
  if (!currency) throw new Error("currency required");
  return { status: "pending", amount, currency };
}
