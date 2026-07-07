#!/usr/bin/env node
// License-allowlist and adapter-boundary gate (ADR-032). Enforces "adapt, don't
// absorb": the published package stays at ZERO runtime dependencies, and every
// reused external component declared in adapters.json is MIT-category permissive
// and runs behind a process, sidecar, or CI-native boundary. No network call.
//
// Usage: node scripts/check-licenses.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const overrides = loadMessageOverrides(join(root, ".modonome"));

// Permissive licenses accepted outright (case-insensitive; common short spellings too).
const ALLOWED = new Set([
  "MIT", "ISC", "BSD-2-CLAUSE", "BSD-3-CLAUSE", "BSD-2", "BSD-3", "0BSD",
]);
// Allowed only when the adapter entry carries a truthy owner adr note.
const ALLOWED_WITH_ADR = new Set(["APACHE-2.0", "APACHE-2", "APACHE 2.0"]);
// Refused families (any version). Matched as a prefix on the normalized license.
const REFUSED_PREFIXES = ["GPL", "AGPL", "LGPL", "BUSL", "SSPL"];
const BOUNDARIES = new Set(["process", "sidecar", "ci-native"]);

function normalizeLicense(raw) {
  return String(raw).trim().toUpperCase().replace(/\s+/g, " ");
}

// Core check. Takes the parsed package.json and (optional) adapters manifest and
// returns a list of human-readable problem strings. Pure: no filesystem or network.
export function checkLicenses(pkg, manifest) {
  const problems = [];

  const deps = pkg && pkg.dependencies ? pkg.dependencies : {};
  const depNames = Object.keys(deps);
  if (depNames.length > 0) {
    problems.push(
      formatMessage("gate.licenses.runtime-deps-declared", { depNames: depNames.join(", ") }, overrides).message
    );
  }

  if (manifest !== undefined && manifest !== null) {
    const adapters = Array.isArray(manifest) ? manifest : manifest.adapters;
    if (!Array.isArray(adapters)) {
      problems.push(formatMessage("gate.licenses.manifest-missing-adapters-array", {}, overrides).message);
      return problems;
    }
    adapters.forEach((a, i) => {
      const label = a && a.name ? a.name : `adapters[${i}]`;
      const lic = normalizeLicense(a && a.license);

      if (!a || !a.license) {
        problems.push(formatMessage("gate.licenses.missing-license", { label }, overrides).message);
      } else if (REFUSED_PREFIXES.some((p) => lic === p || lic.startsWith(p + "-") || lic.startsWith(p + " "))) {
        problems.push(formatMessage("gate.licenses.refused-license", { label, license: a.license }, overrides).message);
      } else if (ALLOWED.has(lic)) {
        // permissive, accepted
      } else if (ALLOWED_WITH_ADR.has(lic)) {
        if (!a.adr) {
          problems.push(formatMessage("gate.licenses.apache-missing-adr", { label }, overrides).message);
        }
      } else {
        problems.push(formatMessage("gate.licenses.not-on-allowlist", { label, license: a.license }, overrides).message);
      }

      if (!a || !a.boundary) {
        problems.push(formatMessage("gate.licenses.missing-boundary", { label }, overrides).message);
      } else if (!BOUNDARIES.has(a.boundary)) {
        problems.push(formatMessage("gate.licenses.boundary-not-permitted", { label, boundary: a.boundary }, overrides).message);
      }
    });
  }

  return problems;
}

// CLI: read package.json and adapters.json from the repo root and report PASS/FAIL.
function runCli() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const manifestPath = join(root, "adapters.json");
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : undefined;

  const problems = checkLicenses(pkg, manifest);

  console.log("License and adapter-boundary gate (ADR-032)");
  console.log("===========================================");
  if (problems.length === 0) {
    const count = manifest ? (Array.isArray(manifest) ? manifest.length : (manifest.adapters || []).length) : 0;
    console.log(`PASS: zero runtime dependencies; ${count} declared adapter(s) permissive and boundary-safe.`);
    process.exit(0);
  }
  console.error(formatMessage("gate.licenses.fail-summary", { count: problems.length }, overrides).message);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
