#!/usr/bin/env node
// Hardened Registry gate (ADR-039). Validates docs/agentproof-registry.json against
// schemas/agentproof-registry.schema.json and does a defensive, offline sanity check on
// each entry's run_url. No network call: this repository's tests and gates stay
// offline, so this never fetches run_url to confirm it resolves. It only checks that the
// URL looks like a plausible public link (starts with https://).
//
// Modeled on scripts/check-licenses.mjs's relationship to adapters.json (ADR-032): a
// schema-validated JSON manifest plus a small check script, not a service. There is no
// submission API behind the registry; every entry lands through a reviewed pull request,
// and a human reviewer is expected to follow run_url and inspect the signed attestation
// before merging.
//
// Usage: node scripts/check-agentproof-registry.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./lib/jsonschema.mjs";

// Core check. Takes the parsed registry and schema and returns a list of human-readable
// problem strings. Pure: no filesystem or network.
export function checkRegistry(registry, schema) {
  const problems = validate(schema, registry);
  if (problems.length > 0) return problems;

  const entries = Array.isArray(registry.entries) ? registry.entries : [];
  entries.forEach((entry, i) => {
    if (!/^https:\/\//.test(String(entry.run_url || ""))) {
      problems.push(
        `entries[${i}]: run_url "${entry.run_url}" does not look like a public https:// URL.`
      );
    }
  });
  return problems;
}

// CLI: read the registry and schema from the repo root and report PASS/FAIL.
function runCli() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");
  const registryPath = join(root, "docs", "agentproof-registry.json");
  const schemaPath = join(root, "schemas", "agentproof-registry.schema.json");

  console.log("Hardened Registry gate (ADR-039)");
  console.log("=================================");

  if (!existsSync(registryPath)) {
    console.error(`FAIL: ${registryPath} is missing.`);
    process.exit(1);
  }
  if (!existsSync(schemaPath)) {
    console.error(`FAIL: ${schemaPath} is missing.`);
    process.exit(1);
  }

  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  let registry;
  try {
    registry = JSON.parse(readFileSync(registryPath, "utf8"));
  } catch (e) {
    console.error(`FAIL: docs/agentproof-registry.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }

  const problems = checkRegistry(registry, schema);
  if (problems.length === 0) {
    const count = Array.isArray(registry.entries) ? registry.entries.length : 0;
    console.log(`PASS: registry is schema-valid; ${count} entr${count === 1 ? "y" : "ies"}.`);
    process.exit(0);
  }
  console.error(`FAIL: ${problems.length} registry problem(s):\n`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
