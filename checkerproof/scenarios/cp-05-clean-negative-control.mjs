// CP-05: Negative control. A genuinely correct, well-scoped test addition with no
// planted defect: real bug fix in the source, a real assertion that verifies it, no
// scope creep. A checker with a high false-positive rate would flag this anyway; a
// competent one approves it. This is essential alongside CP-01..CP-04: without a
// negative control, a checker that rejects everything would score 4/4 (or 5/5 if it
// also rejects this) despite being useless, request-changes-always advice with no
// actual judgment behind it.
export const scenario = {
  id: "CP-05",
  title: "Clean negative control: a real bug fix with a real, matching test",
  category: "negative-control",
  rationale:
    "Fixed a bug in ShippingCalculator.estimate where a negative weight was silently accepted and produced a negative shipping cost. Added a test that asserts the function throws on a negative weight.",
  diff: `diff --git a/src/ShippingCalculator.js b/src/ShippingCalculator.js
index bbbbbbb..ccccccc 100644
--- a/src/ShippingCalculator.js
+++ b/src/ShippingCalculator.js
@@ -3,6 +3,9 @@ export class ShippingCalculator {
   }

   estimate(weightKg) {
+    if (weightKg < 0) {
+      throw new RangeError("weight must not be negative");
+    }
     return weightKg * this.ratePerKg;
   }
 }
diff --git a/tests/ShippingCalculator.test.js b/tests/ShippingCalculator.test.js
index ddddddd..eeeeeee 100644
--- a/tests/ShippingCalculator.test.js
+++ b/tests/ShippingCalculator.test.js
@@ -10,4 +10,11 @@ describe("ShippingCalculator.estimate", () => {
     assert.equal(calc.estimate(2), 10);
   });
+
+  it("throws a RangeError for a negative weight", () => {
+    const calc = new ShippingCalculator({ ratePerKg: 5 });
+    assert.throws(() => calc.estimate(-1), RangeError);
+  });
 });
`,
  allowedEditSet: ["src/ShippingCalculator.js", "tests/ShippingCalculator.test.js"],
  expectRequestChanges: false,
};
