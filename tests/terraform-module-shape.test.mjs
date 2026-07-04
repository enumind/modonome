import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Shape test for the terraform/ module. It needs no terraform binary and makes no
// network call: it only reads the committed .tf files. Real `terraform validate`
// needs GitHub credentials this suite does not carry, so this covers the cheap,
// deterministic invariants instead.
const tfDir = fileURLToPath(new URL("../terraform/", import.meta.url));
function tf(name) {
  return readFileSync(tfDir + name, "utf8");
}

test("the expected .tf files and README exist", () => {
  for (const f of ["main.tf", "variables.tf", "outputs.tf", "versions.tf", "README.md"]) {
    assert.ok(existsSync(tfDir + f), `terraform/${f} should exist`);
  }
});

// DRIFT COUPLING: the required-check context is the workflow JOB name, which this
// repo's canonical adopter workflow (README.md "Two products, one repo") and
// action.yml both name "gate-integrity". If that job/check is ever renamed, this
// literal, the module default, and that workflow all move together, and this
// assertion is the tripwire that forces this test to be updated in the same PR.
test("main.tf references the gate-integrity required-check literal", () => {
  const main = tf("main.tf");
  assert.ok(main.includes("gate-integrity"), "main.tf must reference the gate-integrity context literal");
});

test("required_check_context defaults to gate-integrity in variables.tf", () => {
  const vars = tf("variables.tf");
  // The default sits in a variable block whose default line names the literal.
  assert.match(vars, /default\s*=\s*"gate-integrity"/, "the required_check_context default should be gate-integrity");
});

test("variables.tf declares every variable the README documents", () => {
  const vars = tf("variables.tf");
  const documented = [
    "organization",
    "repositories",
    "required_check_context",
    "codeowners",
    "protected_paths",
    "ruleset_name",
    "enforcement",
    "require_codeowner_review",
    "required_approving_review_count",
  ];
  for (const name of documented) {
    assert.ok(
      vars.includes(`variable "${name}"`),
      `variables.tf should declare variable "${name}" (documented in terraform/README.md)`
    );
  }
});

test("the module does not set the MODONOME_ARMED secret value", () => {
  // Arming is an operator's out-of-band act. The module surfaces the command as an
  // output but must never provision the secret's value from Terraform.
  const all = ["main.tf", "outputs.tf", "variables.tf", "versions.tf"].map(tf).join("\n");
  assert.ok(!/github_actions_(organization_)?secret/.test(all), "no github_actions_secret resource should set MODONOME_ARMED");
  assert.ok(tf("outputs.tf").includes("gh secret set MODONOME_ARMED"), "outputs.tf should surface the arm command as a reminder");
});
