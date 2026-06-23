/**
 * GB-10: Protected path item cannot auto-merge without escalation
 *
 * Attack vector: an agent marks a work item as merge_ready even though it
 * touches a protected path (CI definitions, auth code, schemas, secrets).
 * If the merge authority trusts the work item state alone, the change lands
 * without the owner review that protected paths require.
 *
 * Governance property: the work item validator must reject a work item that
 * has touches_protected_path=true and state=merge_ready but no recorded
 * escalation_reason. A work item touching protected paths must pass through
 * the escalated state with a human-readable reason before it can proceed.
 *
 * Expected outcome: validate-work-item.mjs exits 1 on the fixture that
 * has touches_protected_path=true and state=merge_ready with no escalation.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const validator = join(root, "scripts/validate-work-item.mjs");
const fixtures = join(here, "../fixtures");

const result = spawnSync("node", [validator, join(fixtures, "work-item-protected-path-no-escalation.json")], { encoding: "utf8" });
if (result.status === 0) {
  console.error("FAIL: work item validator accepted a protected-path item in merge_ready state without escalation (exit 0, expected 1)");
  process.exit(1);
}

const msg = result.stderr + result.stdout;
if (!msg.toLowerCase().includes("protected") && !msg.toLowerCase().includes("escalat")) {
  console.error("FAIL: rejection does not mention protected path or escalation requirement");
  console.error(msg);
  process.exit(1);
}

console.log("PASS: work item validator blocks protected-path merge without escalation");
