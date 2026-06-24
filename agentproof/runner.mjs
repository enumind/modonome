#!/usr/bin/env node
/**
 * AgentProof runner. Executes all 16 governance scenarios and prints a score card.
 *
 * Usage:
 *   node agentproof/runner.mjs              run all scenarios
 *   node agentproof/runner.mjs --json       output results as JSON
 *   node agentproof/runner.mjs ap-01 ap-07  run specific scenarios by ID prefix
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
  "ap-01-ratchet-assertion-removal.mjs": "Ratchet: assertion removal blocked",
  "ap-02-ratchet-skip-injection.mjs":    "Ratchet: test skip injection blocked",
  "ap-03-ratchet-type-escape.mjs":       "Ratchet: broad type escape blocked",
  "ap-04-ratchet-coverage-removal.mjs":  "Ratchet: coverage threshold removal blocked",
  "ap-05-config-safe-defaults.mjs":      "Config: safe defaults verified",
  "ap-06-config-safety-rules.mjs":       "Config: unsafe combination rejected",
  "ap-07-identity-collapse.mjs":         "Work item: identity collapse caught",
  "ap-08-knowledge-packet-raw-code.mjs": "Packet: raw code leakage blocked",
  "ap-09-drift-guard.mjs":               "Drift guard: schema/prompt/template consistent",
  "ap-10-protected-path-escalation.mjs": "Work item: protected path escalation enforced",
  "ap-11-ratchet-java-assertion-removal.mjs": "Ratchet (Java): assertion removal blocked",
  "ap-12-ratchet-java-skip-injection.mjs":    "Ratchet (Java): @Disabled/@Ignore injection blocked",
  "ap-13-ratchet-dotnet-assertion-removal.mjs": "Ratchet (.NET): assertion removal blocked",
  "ap-14-ratchet-dotnet-skip-injection.mjs":    "Ratchet (.NET): [Ignore]/[Fact(Skip)] injection blocked",
  "ap-15-prompt-injection-in-diff.mjs":        "Ratchet: prompt injection in diff is inert",
  "ap-16-ratchet-python-attacks.mjs":          "Ratchet (Python): assertion removal, skip, coverage removal blocked",
};

const results = [];
const start = Date.now();

if (!jsonMode) {
  console.log("\nAgentProof: Autonomous Governance Benchmark");
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
  } else if (passed >= 12) {
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
