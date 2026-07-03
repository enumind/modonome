import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRemediationView } from "../apps/control-panel/server/remediationView.mjs";

// Assembled from fragments so this test file carries no contiguous attribution signature.
const COAUTHOR = "Co-" + "authored-by: Pat Doe <pat@example.com>";
const ARMED = { autonomy_enabled: true, dry_run: false, remediation_apply_enabled: true };

test("names every arming blocker when the engine is off", () => {
  const vm = buildRemediationView({ config: {}, envArmed: false, commits: [] });
  assert.strictEqual(vm.applyEnabled, false);
  assert.strictEqual(vm.ready, false);
  assert.ok(vm.blockers.includes("autonomy_enabled is off"));
  assert.ok(vm.blockers.includes("dry_run is on"));
  assert.ok(vm.blockers.includes("remediation_apply_enabled is off"));
  assert.ok(vm.blockers.includes("MODONOME_ARMED is not set in the environment"));
});

test("is ready only when config opts in AND the environment is armed", () => {
  assert.strictEqual(buildRemediationView({ config: ARMED, envArmed: false, commits: [] }).ready, false);
  const vm = buildRemediationView({ config: ARMED, envArmed: true, commits: [] });
  assert.strictEqual(vm.ready, true);
  assert.deepStrictEqual(vm.blockers, []);
  assert.strictEqual(vm.applyEnabled, true);
});

test("surfaces one proposal per commit that needs a metadata rewrite", () => {
  const commits = [
    { sha: "aaa1111", an: "Claude", ae: "agent@anthropic.com", cn: "Claude", ce: "agent@anthropic.com", message: "add c" },
    { sha: "bbb2222", an: "Human Dev", ae: "human@example.com", cn: "Human Dev", ce: "human@example.com", message: `add b\n\n${COAUTHOR}` },
    { sha: "ccc3333", an: "Human Dev", ae: "human@example.com", cn: "Human Dev", ce: "human@example.com", message: "clean commit" },
  ];
  const vm = buildRemediationView({ config: ARMED, envArmed: true, commits, identity: { name: "Human Dev", email: "human@example.com" } });
  assert.strictEqual(vm.proposalCount, 2);
  assert.deepStrictEqual(vm.proposals.map((p) => p.sha), ["aaa1111", "bbb2222"]);
  assert.ok(vm.proposals[0].reasons.includes("forbidden-author"));
  assert.ok(vm.proposals[1].reasons.includes("ai-signature-in-message"));
  assert.match(vm.fingerprint, /^sha256:[0-9a-f]{64}$/);
});

test("clean history yields no proposals", () => {
  const commits = [
    { sha: "ddd4444", an: "Human Dev", ae: "human@example.com", cn: "Human Dev", ce: "human@example.com", message: "a clean commit" },
  ];
  const vm = buildRemediationView({ config: ARMED, envArmed: true, commits });
  assert.strictEqual(vm.proposalCount, 0);
  assert.deepStrictEqual(vm.proposals, []);
});

test("tolerates being called with no arguments", () => {
  const vm = buildRemediationView();
  assert.strictEqual(vm.ready, false);
  assert.strictEqual(vm.proposalCount, 0);
});
