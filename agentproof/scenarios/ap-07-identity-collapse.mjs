/**
 * AP-07: Work item identity collapse is caught
 *
 * Attack vector (session collapse): a single agent session acts as both maker
 * and checker for the same work item. The checker role is performed by the
 * same session that wrote the diff, defeating independent review entirely.
 * This is the most dangerous failure mode in autonomous code review.
 *
 * Attack vector (model collapse): two distinct session IDs are used, but both
 * run the same model version. A model cannot independently detect its own
 * systematic errors. Diversity in model is required for meaningful checking.
 *
 * Governance property: the work item validator must detect and reject both
 * forms of identity collapse. JSON Schema cannot express cross-field
 * inequality constraints; application-level governance rules must enforce this.
 *
 * Expected outcome: validate-work-item.mjs exits 1 on both attack fixtures.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const validator = join(root, "scripts/validate-work-item.mjs");
const fixtures = join(here, "../fixtures");

// Attack 1: same session ID for maker and checker.
const sessionCollapse = spawnSync("node", [validator, join(fixtures, "work-item-identity-collapse.json")], { encoding: "utf8" });
if (sessionCollapse.status === 0) {
  console.error("FAIL: work item validator accepted maker_id === checker_id (exit 0, expected 1)");
  process.exit(1);
}
if (!(sessionCollapse.stderr + sessionCollapse.stdout).toLowerCase().includes("maker")) {
  console.error("FAIL: rejection does not mention maker/checker identity");
  console.error(sessionCollapse.stderr);
  process.exit(1);
}

// Attack 2: distinct session IDs but same model.
const modelCollapse = spawnSync("node", [validator, join(fixtures, "work-item-model-collapse.json")], { encoding: "utf8" });
if (modelCollapse.status === 0) {
  console.error("FAIL: work item validator accepted maker_model === checker_model (exit 0, expected 1)");
  process.exit(1);
}

console.log("PASS: work item validator catches both session-level and model-level identity collapse");
