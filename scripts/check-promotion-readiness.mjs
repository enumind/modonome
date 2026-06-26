#!/usr/bin/env node
// Capability promotion gate (ADR-024). High-risk capabilities ship off by default
// and may only become default-on with an owner promotion ADR that carries evidence.
// This gate fails if any capability flag defaults to on without such an ADR. Runs in
// CI with no external call.
//
// Usage: node scripts/check-promotion-readiness.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseFlatYaml } from "./lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const problems = [];

// Capability flags that expand the engine's authority and trust boundary.
const CAPABILITY_FLAGS = ["repo_network_enabled", "market_scan_enabled", "envisioner_enabled"];

// A promotion ADR must demonstrate evidence-based readiness, not faith.
const REQUIRED_ADR_SECTIONS = ["observation window", "evidence", "rollback"];

function configDefaults(rel) {
  const path = join(root, rel);
  return existsSync(path) ? parseFlatYaml(readFileSync(path, "utf8")) : {};
}

function findPromotionAdr(flag) {
  const adrDir = join(root, "docs", "adr");
  if (!existsSync(adrDir)) return null;
  for (const f of readdirSync(adrDir).filter((f) => f.endsWith(".md"))) {
    const text = readFileSync(join(adrDir, f), "utf8");
    const lower = text.toLowerCase();
    if (text.includes(flag) && lower.includes("promotion") && REQUIRED_ADR_SECTIONS.every((s) => lower.includes(s))) {
      return f;
    }
  }
  return null;
}

const sources = {
  "templates/.modonome/config.yaml": configDefaults("templates/.modonome/config.yaml"),
  ".modonome/config.yaml": configDefaults(".modonome/config.yaml"),
};

for (const [name, cfg] of Object.entries(sources)) {
  for (const flag of CAPABILITY_FLAGS) {
    if (cfg[flag] === true) {
      const adr = findPromotionAdr(flag);
      if (!adr) {
        problems.push(`${name}: ${flag} is default-on but no promotion ADR (with observation window, evidence, rollback) was found.`);
      }
    }
  }
}

console.log("Capability promotion readiness (ADR-024)");
console.log("========================================");
if (problems.length === 0) {
  console.log("PASS: no capability ships default-on without an evidence-backed promotion ADR.");
  process.exit(0);
}
console.error(`FAIL: ${problems.length} promotion problem(s):\n`);
for (const p of problems) console.error("  - " + p);
process.exit(1);
