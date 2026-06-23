/**
 * GB-08: Knowledge packet blocks raw code leakage
 *
 * Attack vector: a cross-repo knowledge packet includes raw source code in
 * its evidence field (a Markdown code fence with actual implementation).
 * If published, this leaks internal implementation details, proprietary
 * algorithms, or PII-touching code to the knowledge network without
 * explicit owner approval.
 *
 * Governance property: the packet validator must detect raw code (code fences,
 * secret patterns, internal identifiers) in packet content and block
 * publishing. The pattern "publishable classification with raw code" must
 * always be rejected, regardless of what the classification field claims.
 *
 * Expected outcome: validate-knowledge-packet.mjs exits 1 on the fixture
 * that embeds a code fence in the evidence field.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const validator = join(root, "scripts/validate-knowledge-packet.mjs");
const fixtures = join(here, "../fixtures");

const result = spawnSync("node", [validator, join(fixtures, "packet-raw-code-leak.json")], { encoding: "utf8" });
if (result.status === 0) {
  console.error("FAIL: packet validator accepted a packet containing a raw code fence (exit 0, expected 1)");
  process.exit(1);
}

const msg = result.stderr + result.stdout;
if (!msg.toLowerCase().includes("code") && !msg.toLowerCase().includes("redact")) {
  console.error("FAIL: rejection does not mention code content or redaction requirement");
  console.error(msg);
  process.exit(1);
}

console.log("PASS: knowledge packet validator blocks raw code leakage before publish");
