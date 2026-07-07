import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// The control panel keeps two hand-maintained key lists that MUST stay in sync:
// the server-side writer whitelist (modonomeWriter.mjs) decides which keys a config
// patch may touch, and the client-side diff (configDiff.ts) decides which keys the UI
// includes in a patch. If they drift, Save either silently drops a field or is
// rejected. A source comment says they are "deliberately" duplicated; this test makes
// "deliberately" machine-checked, so adding a lever (the Governed Remediation hygiene
// keys land here in a later phase) cannot forget one side.

const writer = readFileSync(join(root, "apps/control-panel/server/modonomeWriter.mjs"), "utf8");
const diff = readFileSync(join(root, "apps/control-panel/src/state/configDiff.ts"), "utf8");

// Extract the string literals inside a named list/set declaration, regardless of
// whether it is `new Set([...])` or `[...] as const`.
function keysFromDeclaration(source, declName) {
  const start = source.indexOf(declName);
  assert.notEqual(start, -1, `could not find ${declName}`);
  const open = source.indexOf("[", start);
  const close = source.indexOf("]", open);
  assert.ok(open !== -1 && close !== -1, `could not parse the array for ${declName}`);
  const body = source.slice(open + 1, close);
  return new Set([...body.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]));
}

function assertSameSet(a, b, label) {
  const onlyA = [...a].filter((k) => !b.has(k));
  const onlyB = [...b].filter((k) => !a.has(k));
  assert.deepEqual(onlyA, [], `${label}: keys only in writer: ${onlyA.join(", ")}`);
  assert.deepEqual(onlyB, [], `${label}: keys only in configDiff: ${onlyB.join(", ")}`);
}

test("writer SCALAR_CONFIG_KEYS and configDiff SCALAR_KEYS are identical", () => {
  const w = keysFromDeclaration(writer, "SCALAR_CONFIG_KEYS");
  const d = keysFromDeclaration(diff, "SCALAR_KEYS");
  assert.ok(w.size > 0 && d.size > 0, "both scalar key lists must be non-empty");
  assertSameSet(w, d, "scalar keys");
});

test("writer ARRAY_CONFIG_KEYS and configDiff ARRAY_KEYS are identical", () => {
  const w = keysFromDeclaration(writer, "ARRAY_CONFIG_KEYS");
  const d = keysFromDeclaration(diff, "ARRAY_KEYS");
  assertSameSet(w, d, "array keys");
});

test("writer NESTED_CONFIG_KEYS and configDiff NESTED_KEYS are identical", () => {
  const w = keysFromDeclaration(writer, "NESTED_CONFIG_KEYS");
  const d = keysFromDeclaration(diff, "NESTED_KEYS");
  assert.ok(w.size > 0 && d.size > 0, "both nested key lists must be non-empty");
  assertSameSet(w, d, "nested keys");
});
