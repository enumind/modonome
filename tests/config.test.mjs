import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { validate } from "../scripts/lib/jsonschema.mjs";
import { validateConfig, loadConfig } from "../scripts/validate-config.mjs";
import { migrate } from "../scripts/migrate-config.mjs";
import { parseFlatYaml } from "../scripts/lib/yaml-lite.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fx = join(root, "fixtures");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const files = (dir) => readdirSync(dir).map((f) => join(dir, f));

test("the shipped host-mode example config validates cleanly through the real CLI loader", () => {
  // Regression guard: this file uses block-style "- item" sequences for its arrays,
  // which parseFlatYaml silently misread as empty strings before sequence support was
  // added, so `npx modonome validate` failed on modonome's own shipped example. Loaded
  // through loadConfig (the same function the CLI and run-cycle.mjs use), not js-yaml.
  const hostConfigPath = join(root, "examples", "demo-app", ".modonome", "config.yaml");
  const cfg = loadConfig(hostConfigPath);
  assert.deepEqual(validateConfig(cfg), []);
  assert.deepEqual(cfg.trusted_author_allowlist, ["modonome-maker[bot]"]);
  assert.ok(cfg.protected_paths_extra.length >= 3, "protected_paths_extra must parse as a real array, not a string");
});

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
});

test("yaml-lite parser reads block-style sequences, not just inline arrays", () => {
  // The shape examples/demo-app/.modonome/config.yaml actually ships:
  const doc = [
    "trusted_author_allowlist:",
    "  - modonome-maker[bot]",
    "protected_paths_extra:",
    "  - .modonome/config.yaml",
    "  - .github/workflows",
    "  - CODEOWNERS",
    "state_dir: .modonome",
  ].join("\n");
  const parsed = parseFlatYaml(doc);
  assert.deepEqual(parsed.trusted_author_allowlist, ["modonome-maker[bot]"]);
  assert.deepEqual(parsed.protected_paths_extra, [".modonome/config.yaml", ".github/workflows", "CODEOWNERS"]);
  assert.equal(parsed.state_dir, ".modonome", "a flat key after a sequence must still parse");

  // A key with no children at all still parses to "", not a sequence — must not
  // regress just because sequence support was added.
  assert.equal(parseFlatYaml("notes:").notes, "");
  // An empty item and a quoted item both parse as their scalars would inline.
  assert.deepEqual(parseFlatYaml('items:\n  - "quoted"\n  -').items, ["quoted", ""]);
  // A sequence nested one level deep under a mapping key still parses.
  const nested = parseFlatYaml(["runners:", "  local:", "    labels:", "      - self-hosted", "      - mac-mini"].join("\n"));
  assert.deepEqual(nested.runners.local.labels, ["self-hosted", "mac-mini"]);
});

test("migration adds missing levers with safe defaults and never arms", () => {
  const { config, added } = migrate({ schema_version: 0, dry_run: true });
  assert.equal(config.schema_version, 1);
  assert.ok(added.includes("autonomy_enabled"));
  assert.equal(config.autonomy_enabled, false);
  assert.equal(config.auto_merge, false);
  assert.equal(config.max_merges_per_day, 0);
});
