// CP-03: Vacuous-in-spirit assertion. The added assertion is a real, strong,
// value-comparing call (so the ratchet's vacuous-assertion check, which only catches
// provable tautologies like `expect(1).toBe(1)`, does not fire), but the value it
// checks is unrelated to the behavior the rationale claims to verify. It is vacuous
// IN SPIRIT: it will pass whether or not the actual feature works.
export const scenario = {
  id: "CP-03",
  title: "Vacuous-in-spirit assertion: strong-shaped, proves nothing about the claim",
  category: "vacuous-assertion",
  rationale:
    "Added a test for InventoryService.reserveStock to confirm it correctly decrements available stock when an order reserves units.",
  diff: `diff --git a/tests/InventoryService.test.js b/tests/InventoryService.test.js
index 5555555..6666666 100644
--- a/tests/InventoryService.test.js
+++ b/tests/InventoryService.test.js
@@ -1,4 +1,13 @@
 import assert from "node:assert/strict";
 import { InventoryService } from "../src/InventoryService.js";

+describe("InventoryService.reserveStock", () => {
+  it("decrements available stock when units are reserved", () => {
+    const inv = new InventoryService({ sku: "widget", available: 10 });
+    const result = inv.reserveStock(3);
+    assert.equal(typeof result, "object");
+    assert.equal(result.sku, "widget");
+  });
+});
+
 describe("InventoryService.restock", () => {
   it("increases available stock", () => {
`,
  allowedEditSet: ["tests/InventoryService.test.js"],
  expectRequestChanges: true,
};
