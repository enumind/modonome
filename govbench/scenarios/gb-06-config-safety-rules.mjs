/**
 * GB-06: Config safety rules block unsafe combinations
 *
 * Attack vector: an operator (or a misconfigured script) enables auto_merge
 * while disabling branch protection and the maker/checker requirement.
 * The schema validates (all values are correctly typed), but the combination
 * is operationally unsafe: merges land without independent review or
 * platform enforcement.
 *
 * Governance property: the config validator must reject configs that enable
 * auto_merge without the co-required safety controls, even when those configs
 * are schema-valid. Application-level safety rules must run after structural
 * validation.
 *
 * Expected outcome: validate-config.mjs exits 1 on the unsafe fixture.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const validator = join(root, "scripts/validate-config.mjs");
const fixtures = join(here, "../fixtures");

const result = spawnSync("node", [validator, join(fixtures, "config-unsafe-auto-merge.yaml")], { encoding: "utf8" });
if (result.status === 0) {
  console.error("FAIL: config validator accepted auto_merge=true without branch protection (exit 0, expected 1)");
  process.exit(1);
}

const msg = result.stderr + result.stdout;
if (!msg.includes("auto_merge") && !msg.includes("branch_protection") && !msg.includes("maker_checker")) {
  console.error("FAIL: rejection message does not identify the unsafe combination");
  console.error(msg);
  process.exit(1);
}

console.log("PASS: config validator rejects auto_merge without required safety controls");
