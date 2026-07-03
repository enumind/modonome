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
      `package.json declares runtime dependencies (${depNames.join(", ")}). ` +
        "The published package must stay at zero runtime dependencies; move these behind an adapter boundary."
    );
  }

  if (manifest !== undefined && manifest !== null) {
    const adapters = Array.isArray(manifest) ? manifest : manifest.adapters;
    if (!Array.isArray(adapters)) {
      problems.push('adapters.json must have an "adapters" array (or be a top-level array).');
      return problems;
    }
    adapters.forEach((a, i) => {
      const label = a && a.name ? a.name : `adapters[${i}]`;
      const lic = normalizeLicense(a && a.license);

      if (!a || !a.license) {
        problems.push(`${label}: missing license.`);
      } else if (REFUSED_PREFIXES.some((p) => lic === p || lic.startsWith(p + "-") || lic.startsWith(p + " "))) {
        problems.push(`${label}: license "${a.license}" is copyleft or source-available and is refused.`);
      } else if (ALLOWED.has(lic)) {
        // permissive, accepted
      } else if (ALLOWED_WITH_ADR.has(lic)) {
        if (!a.adr) {
          problems.push(`${label}: Apache-2.0 is allowed only with a truthy "adr" owner note. Add an adr reference.`);
        }
      } else {
        problems.push(`${label}: license "${a.license}" is not on the permissive allowlist (MIT, ISC, BSD-2/3-Clause; Apache-2.0 with an adr note).`);
      }

      if (!a || !a.boundary) {
        problems.push(`${label}: missing boundary.`);
      } else if (!BOUNDARIES.has(a.boundary)) {
        problems.push(`${label}: boundary "${a.boundary}" is not permitted (use process, sidecar, or ci-native).`);
      }
    });
  }

  return problems;
}

// CLI: read package.json and adapters.json from the repo root and report PASS/FAIL.
function runCli() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");
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
  console.error(`FAIL: ${problems.length} license/adapter problem(s):\n`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
