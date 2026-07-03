// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

import { validate, loadSchema } from "../scripts/lib/jsonschema.mjs";
import { validateConfig, loadConfig, safetyErrors } from "../scripts/validate-config.mjs";
import { migrate, SAFE_DEFAULTS, CURRENT_SCHEMA_VERSION } from "../scripts/migrate-config.mjs";
import { parseFlatYaml } from "../scripts/lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fx = join(root, "fixtures");
const readJson = (p) => loadSchema(readFileSync(p, "utf8"));
const files = (dir) => readdirSync(dir).map((f) => join(dir, f));

function tmp() {
  return mkdtempSync(join(tmpdir(), "modonome-config-test-"));
}

function run(script, ...args) {
  return spawnSync("node", [join(root, script), ...args], { encoding: "utf8", timeout: 10000 });
}

test("valid configs pass, invalid configs fail", () => {
  for (const f of files(join(fx, "config", "valid"))) {
    assert.deepEqual(validateConfig(readJson(f)), [], `expected valid: ${f}`);
  }
  for (const f of files(join(fx, "config", "invalid"))) {
    assert.ok(validateConfig(readJson(f)).length > 0, `expected invalid: ${f}`);
  }
});

test("the shipped template config is valid and safe", () => {
  const cfg = loadConfig(join(root, "templates", ".modonome", "config.yaml"));
  assert.deepEqual(validateConfig(cfg), []);
  assert.equal(cfg.autonomy_enabled, false);
  assert.equal(cfg.dry_run, true);
  assert.equal(cfg.auto_merge, false);
  assert.equal(cfg.max_merges_per_day, 0);
});

test("work items validate against the schema", () => {
  const schema = readJson(join(root, "schemas", "work-item.schema.json"));
  for (const f of files(join(fx, "work-item", "valid"))) {
    assert.deepEqual(validate(schema, readJson(f)), [], `expected valid: ${f}`);
  }
  for (const f of files(join(fx, "work-item", "invalid"))) {
    assert.ok(validate(schema, readJson(f)).length > 0, `expected invalid: ${f}`);
  }
});

test("yaml-lite parser handles edge cases correctly", () => {
  // boolean values
  assert.equal(parseFlatYaml("autonomy_enabled: false").autonomy_enabled, false);
  assert.equal(parseFlatYaml("autonomy_enabled: true").autonomy_enabled, true);
  // quoted string that looks like a boolean must remain a string
  assert.equal(parseFlatYaml('label: "false"').label, "false");
  assert.equal(parseFlatYaml("label: 'true'").label, "true");
  // integers and floats
  assert.equal(parseFlatYaml("max_merges_per_day: 3").max_merges_per_day, 3);
  assert.equal(parseFlatYaml("threshold: 0.8").threshold, 0.8);
  // values containing colons (e.g. URLs) must not be truncated
  assert.equal(parseFlatYaml("homepage: https://example.com").homepage, "https://example.com");
  // inline comments must be stripped
  assert.equal(parseFlatYaml("dry_run: true # default").dry_run, true);
  // empty value
  assert.equal(parseFlatYaml("notes:").notes, "");
  // inline arrays
  assert.deepEqual(parseFlatYaml("trusted_author_allowlist: [bot, ci]").trusted_author_allowlist, ["bot", "ci"]);
  assert.deepEqual(parseFlatYaml("trusted_author_allowlist: []").trusted_author_allowlist, []);
  // comment lines must be ignored
  const parsed = parseFlatYaml("# this is a comment\nkey: value");
  assert.equal(parsed.key, "value");
  assert.equal(parsed["# this is a comment"], undefined);
  // an inline array containing only whitespace between brackets is empty
  assert.deepEqual(parseFlatYaml("trusted_author_allowlist: [ ]").trusted_author_allowlist, []);
  // a line with no colon at all must be skipped rather than throw or corrupt output
  const noColon = parseFlatYaml("this line has no colon\nkey: value");
  assert.equal(noColon.key, "value");
  assert.equal(Object.keys(noColon).length, 1);
});

test("migration adds missing levers with safe defaults and never arms", () => {
  const { config, added } = migrate({ schema_version: 0, dry_run: true });
  assert.equal(config.schema_version, 1);
  assert.ok(added.includes("autonomy_enabled"));
  assert.equal(config.autonomy_enabled, false);
  assert.equal(config.auto_merge, false);
  assert.equal(config.max_merges_per_day, 0);
});

test("jsonschema validator covers const, multi-type, null type, pattern, numeric bounds, minItems, and bare object schemas", () => {
  // const: mismatch pushes an error, match produces none.
  assert.deepEqual(validate({ const: "foo" }, "bar"), ["$: expected const \"foo\""]);
  assert.deepEqual(validate({ const: "foo" }, "foo"), []);

  // type mismatch against a null actual value exercises typeOf's null branch.
  const nullMismatch = validate({ type: "string" }, null);
  assert.equal(nullMismatch.length, 1);
  assert.match(nullMismatch[0], /got null/);

  // type mismatch against an array actual value exercises typeOf's array branch.
  const arrayMismatch = validate({ type: "string" }, [1, 2]);
  assert.equal(arrayMismatch.length, 1);
  assert.match(arrayMismatch[0], /got array/);

  // schema.type as an array of allowed types, both a match (null) and a
  // mismatch (integer) against the same multi-type schema.
  const multiType = { type: ["string", "null"] };
  assert.deepEqual(validate(multiType, null), []);
  const multiTypeMismatch = validate(multiType, 5);
  assert.equal(multiTypeMismatch.length, 1);
  assert.match(multiTypeMismatch[0], /expected type string or null, got integer/);

  // pattern: mismatch and match.
  const patternSchema = { type: "string", pattern: "^[a-z]+$" };
  assert.deepEqual(validate(patternSchema, "ABC"), ["$: string does not match pattern ^[a-z]+$"]);
  assert.deepEqual(validate(patternSchema, "abc"), []);

  // minLength failure on a string shorter than required.
  assert.deepEqual(
    validate({ type: "string", minLength: 5 }, "ab"),
    ["$: string shorter than minLength 5"]
  );

  // numeric maximum bound.
  assert.deepEqual(
    validate({ type: "number", maximum: 10 }, 11),
    ["$: number above maximum 10"]
  );
  assert.deepEqual(validate({ type: "number", maximum: 10 }, 10), []);

  // array minItems bound.
  assert.deepEqual(
    validate({ type: "array", minItems: 2, items: { type: "string" } }, ["a"]),
    ["$: array shorter than minItems 2"]
  );

  // an object schema with neither "required" nor "properties" must fall back
  // to empty defaults for both rather than throwing.
  assert.deepEqual(validate({ type: "object" }, { anything: 1 }), []);
});

test("validate-config safety rules catch autonomy without allowlist and repo network raw code sharing", () => {
  const emptyAllowlist = safetyErrors({
    autonomy_enabled: true,
    trusted_author_allowlist: [],
  });
  assert.ok(emptyAllowlist.some((e) => e.includes("no autonomous action")));

  const rawCodeSharing = safetyErrors({
    repo_network_enabled: true,
    share_raw_code_across_repos: true,
  });
  assert.ok(rawCodeSharing.some((e) => e.includes("unsafe by default")));

  // Neither unsafe condition present: no errors from these two rules.
  assert.deepEqual(safetyErrors({ autonomy_enabled: false, repo_network_enabled: false }), []);
});

test("loadConfig branches on file extension: JSON parses as JSON, everything else as flat YAML", () => {
  const dir = tmp();
  try {
    const jsonPath = join(dir, "config.json");
    writeFileSync(jsonPath, JSON.stringify({ schema_version: 1, state_dir: ".modonome" }));
    assert.deepEqual(loadConfig(jsonPath), { schema_version: 1, state_dir: ".modonome" });

    const yamlPath = join(dir, "config.yaml");
    writeFileSync(yamlPath, "schema_version: 1\nstate_dir: .modonome\n");
    assert.deepEqual(loadConfig(yamlPath), { schema_version: 1, state_dir: ".modonome" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate-config CLI exits 2 with a usage message when no path is given", () => {
  const r = run("scripts/validate-config.mjs");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage: node scripts\/validate-config.mjs/);
});

test("migrate-config CLI exits 2 with a usage message when no path is given", () => {
  const r = run("scripts/migrate-config.mjs");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage: node scripts\/migrate-config.mjs/);
});

test("migrate-config CLI reports no added levers when only schema_version changes", () => {
  const dir = tmp();
  try {
    const path = join(dir, "config.json");
    // Every lever already present, but schema_version is stale: added stays
    // empty while schema_version still differs from CURRENT_SCHEMA_VERSION,
    // so migrate must print "none" rather than a lever list.
    writeFileSync(path, JSON.stringify({ ...SAFE_DEFAULTS, schema_version: 0 }));
    const r = run("scripts/migrate-config.mjs", path);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Migrated to schema_version 1\. Added levers \(safe defaults\): none/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migrate-config CLI reports already up to date when nothing is missing", () => {
  const dir = tmp();
  try {
    const path = join(dir, "config.json");
    writeFileSync(path, JSON.stringify({ ...SAFE_DEFAULTS, schema_version: CURRENT_SCHEMA_VERSION }));
    const r = run("scripts/migrate-config.mjs", path);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /already at schema_version/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migrate-config CLI reports added levers for a partial config without --write", () => {
  const dir = tmp();
  try {
    const path = join(dir, "config.json");
    writeFileSync(path, JSON.stringify({ schema_version: 0, dry_run: true }));
    const r = run("scripts/migrate-config.mjs", path);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Migrated to schema_version 1\. Added levers/);
    assert.match(r.stdout, /autonomy_enabled/);
    // Without --write, the source file must be left untouched.
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), { schema_version: 0, dry_run: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migrate-config CLI --write rewrites a JSON config in place", () => {
  const dir = tmp();
  try {
    const path = join(dir, "config.json");
    writeFileSync(path, JSON.stringify({ schema_version: 0, dry_run: true }));
    const r = run("scripts/migrate-config.mjs", path, "--write");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Wrote/);
    const written = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(written.schema_version, CURRENT_SCHEMA_VERSION);
    assert.equal(written.autonomy_enabled, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migrate-config CLI --write refuses to rewrite YAML in place", () => {
  const dir = tmp();
  try {
    const path = join(dir, "config.yaml");
    writeFileSync(path, "schema_version: 0\ndry_run: true\n");
    const original = readFileSync(path, "utf8");
    const r = run("scripts/migrate-config.mjs", path, "--write");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Refusing to rewrite YAML in place/);
    // The YAML file must be untouched since rewriting it would drop comments.
    assert.equal(readFileSync(path, "utf8"), original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
