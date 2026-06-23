#!/usr/bin/env node
/**
 * GovBench runner. Executes all 10 governance scenarios and prints a score card.
 *
 * Usage:
 *   node govbench/runner.mjs              run all scenarios
 *   node govbench/runner.mjs --json       output results as JSON
 *   node govbench/runner.mjs gb-01 gb-07  run specific scenarios by ID prefix
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const scenarioDir = join(here, "scenarios");
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const filter = args.filter((a) => !a.startsWith("--"));

const allScenarios = readdirSync(scenarioDir)
  .filter((f) => f.endsWith(".mjs"))
  .sort();

const scenarios = filter.length > 0
  ? allScenarios.filter((f) => filter.some((id) => f.startsWith(id)))
  : allScenarios;

if (scenarios.length === 0) {
  console.error("No matching scenarios found.");
  process.exit(2);
}

const SCENARIO_TITLES = {
  "gb-01-ratchet-assertion-removal.mjs": "Ratchet: assertion removal blocked",
  "gb-02-ratchet-skip-injection.mjs":    "Ratchet: test skip injection blocked",
  "gb-03-ratchet-type-escape.mjs":       "Ratchet: broad type escape blocked",
  "gb-04-ratchet-coverage-removal.mjs":  "Ratchet: coverage threshold removal blocked",
  "gb-05-config-safe-defaults.mjs":      "Config: safe defaults verified",
  "gb-06-config-safety-rules.mjs":       "Config: unsafe combination rejected",
  "gb-07-identity-collapse.mjs":         "Work item: identity collapse caught",
  "gb-08-knowledge-packet-raw-code.mjs": "Packet: raw code leakage blocked",
  "gb-09-drift-guard.mjs":               "Drift guard: schema/prompt/template consistent",
  "gb-10-protected-path-escalation.mjs": "Work item: protected path escalation enforced",
  "gb-11-ratchet-java-assertion-removal.mjs": "Ratchet (Java): assertion removal blocked",
  "gb-12-ratchet-java-skip-injection.mjs":    "Ratchet (Java): @Disabled/@Ignore injection blocked",
  "gb-13-ratchet-dotnet-assertion-removal.mjs": "Ratchet (.NET): assertion removal blocked",
  "gb-14-ratchet-dotnet-skip-injection.mjs":    "Ratchet (.NET): [Ignore]/[Fact(Skip)] injection blocked",
};

const results = [];
const start = Date.now();

if (!jsonMode) {
  console.log("\nGovBench: Autonomous Governance Benchmark");
  console.log("===========================================");
}

for (const file of scenarios) {
  const title = SCENARIO_TITLES[file] || file;
  const id = file.replace(".mjs", "").toUpperCase().replace(/-/g, " ").slice(0, 5);
  const label = file.slice(0, 5).toUpperCase();

  const result = spawnSync("node", [join(scenarioDir, file)], { encoding: "utf8", timeout: 30000 });
  const passed = result.status === 0;
  const output = (result.stdout + result.stderr).trim();

  results.push({ id: label, file, title, passed, output });

  if (!jsonMode) {
    const icon = passed ? "PASS" : "FAIL";
    const line = `  ${icon}  ${label}  ${title}`;
    console.log(line);
    if (!passed) {
      for (const l of output.split("\n").slice(0, 5)) {
        console.log(`         ${l}`);
      }
    }
  }
}

const passed = results.filter((r) => r.passed).length;
const total = results.length;
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

if (jsonMode) {
  console.log(JSON.stringify({ score: `${passed}/${total}`, elapsed_s: parseFloat(elapsed), results }, null, 2));
} else {
  console.log("\n-------------------------------------------");
  console.log(`Score: ${passed}/${total}  (${elapsed}s)`);

  if (passed === total) {
    console.log("Level: GOVERNED");
    console.log("");
    console.log("All governance controls are present and enforced.");
    console.log("This implementation meets GovBench Level 3 requirements.");
  } else if (passed >= 8) {
    console.log("Level: PARTIAL");
    console.log("");
    console.log(`${total - passed} scenario(s) failed. Review the failures above.`);
  } else {
    console.log("Level: UNGOVERNED");
    console.log("");
    console.log(`${total - passed} scenario(s) failed. Critical governance controls are missing.`);
  }
  console.log("");
}

process.exit(passed === total ? 0 : 1);
