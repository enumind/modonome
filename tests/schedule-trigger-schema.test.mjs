// Schema-level coverage for the schedule and trigger role fields (WI-032 added them,
// WI-046 exposes them in the control panel). These check the role sub-schema accepts the
// valid shapes and rejects the invalid ones, so the panel and the loop agree on what a
// role may declare. The validator (scripts/lib/jsonschema.mjs) does not recurse into an
// additionalProperties schema, so these assert against the role sub-schema directly
// (schemas/config.schema.json -> properties.roles.additionalProperties) rather than a
// full top-level config.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "../scripts/lib/jsonschema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const schema = JSON.parse(readFileSync(join(root, "schemas", "config.schema.json"), "utf8"));
const roleSchema = schema.properties.roles.additionalProperties;

test("a role with schedule.cron validates", () => {
  const errors = validate(roleSchema, { schedule: { cron: "0 6 * * 1" } });
  assert.deepEqual(errors, []);
});

test("trigger as a bare string shorthand validates", () => {
  const errors = validate(roleSchema, { trigger: "manual" });
  assert.deepEqual(errors, []);
});

test("trigger as an after-role object validates", () => {
  const errors = validate(roleSchema, { trigger: { type: "after-role", after: ["researcher"] } });
  assert.deepEqual(errors, []);
});

test("a bad trigger.type enum is rejected", () => {
  const errors = validate(roleSchema, { trigger: { type: "whenever" } });
  assert.ok(errors.length > 0, "expected a validation error for an out-of-enum trigger.type");
});

test("an unknown sub-key under an object trigger is rejected", () => {
  const errors = validate(roleSchema, { trigger: { type: "manual", cadence: "weekly" } });
  assert.ok(errors.length > 0, "expected a validation error for an unknown trigger sub-key");
});
