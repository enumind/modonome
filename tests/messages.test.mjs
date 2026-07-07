import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  MESSAGES,
  SEVERITY_RANK,
  formatMessage,
  listMessages,
  checkOverridesIntegrity,
} from "../scripts/lib/messages.mjs";
import { parseFlatYaml } from "../scripts/lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const schema = JSON.parse(readFileSync(join(root, "schemas", "messages.schema.json"), "utf8"));

test("every catalog entry has the required shape", () => {
  for (const [id, entry] of Object.entries(MESSAGES)) {
    assert.ok(entry.category, `${id}: missing category`);
    assert.ok(entry.template, `${id}: missing template`);
    assert.ok(entry.severity in SEVERITY_RANK, `${id}: invalid severity "${entry.severity}"`);
  }
});

test("formatMessage interpolates params and defaults to the catalog severity", () => {
  const [id, entry] = Object.entries(MESSAGES).find(([, e]) => /\{[a-zA-Z_]\w*\}/.test(e.template)) || [];
  if (!id) return; // no interpolated entries yet; nothing to assert
  const paramName = entry.template.match(/\{([a-zA-Z_]\w*)\}/)[1];
  const resolved = formatMessage(id, { [paramName]: "TEST_VALUE" });
  assert.ok(resolved.message.includes("TEST_VALUE"));
  assert.equal(resolved.severity, entry.severity);
});

test("formatMessage throws for an unknown id", () => {
  assert.throws(() => formatMessage("does-not-exist"));
});

test("non_suppressible entries clamp an override that requests a lower severity", () => {
  const [id, entry] = Object.entries(MESSAGES).find(([, e]) => e.non_suppressible) || [];
  if (!id) return;
  const resolved = formatMessage(id, {}, { [id]: { severity: "ok", suppressed: true, text: "custom wording" } });
  assert.equal(resolved.severity, entry.severity);
  assert.equal(resolved.suppressed, false);
  assert.equal(resolved.message, "custom wording"); // wording stays operator-editable
});

test("suppressible entries honor an override severity and suppression", () => {
  const [id] = Object.entries(MESSAGES).find(([, e]) => !e.non_suppressible) || [];
  if (!id) return;
  const resolved = formatMessage(id, {}, { [id]: { severity: "attention", suppressed: true } });
  assert.equal(resolved.severity, "attention");
  assert.equal(resolved.suppressed, true);
});

test("listMessages resolves overrides for every catalog entry", () => {
  const rows = listMessages({});
  assert.equal(rows.length, Object.keys(MESSAGES).length);
  assert.deepEqual(
    [...rows].sort((a, b) => a.id.localeCompare(b.id)).map((r) => r.id),
    rows.map((r) => r.id)
  );
});

test("checkOverridesIntegrity rejects an unknown message id", () => {
  const problems = checkOverridesIntegrity({ schema_version: 1, overrides: { "not-a-real-id": { suppressed: true } } }, schema);
  assert.ok(problems.some((p) => p.includes("unknown message id")));
});

test("checkOverridesIntegrity rejects lowering a non_suppressible entry's severity or suppressing it", () => {
  const [id, entry] = Object.entries(MESSAGES).find(([, e]) => e.non_suppressible) || [];
  if (!id) return;
  const lowered = SEVERITY_RANK[entry.severity] > 0 ? "ok" : "info";
  const problems = checkOverridesIntegrity(
    { schema_version: 1, overrides: { [id]: { severity: lowered, suppressed: true } } },
    schema
  );
  assert.ok(problems.some((p) => p.includes(id) && p.includes("severity")));
  assert.ok(problems.some((p) => p.includes(id) && p.includes("suppressed")));
});

test("checkOverridesIntegrity passes an empty overrides document", () => {
  assert.deepEqual(checkOverridesIntegrity({ schema_version: 1, overrides: {} }, schema), []);
});

test("the shipped template messages.yaml validates against the schema and passes integrity", () => {
  const doc = parseFlatYaml(readFileSync(join(root, "templates", ".modonome", "messages.yaml"), "utf8"));
  assert.deepEqual(checkOverridesIntegrity(doc, schema), []);
});
