import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildPolicyManifest,
  manifestDigest,
  gatesFromVerify,
  extractSection,
  MANIFEST_VERSION,
  ATTESTATION_KIND,
} from "../scripts/lib/policy-manifest.mjs";
import { CAPABILITY_FLAGS } from "../scripts/lib/capability-flags.mjs";
import { validate } from "../scripts/lib/jsonschema.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(readFileSync(join(root, "schemas", "policy-attestation.schema.json"), "utf8"));
const inputs = () => ({
  root,
  config: { autonomy_enabled: false, dry_run: true, protected_paths_extra: ["bin/", "scripts/"] },
  pkgJson: JSON.parse(readFileSync(join(root, "package.json"), "utf8")),
});

test("builds a schema-valid manifest with the expected shape", () => {
  const m = buildPolicyManifest(inputs());
  assert.deepStrictEqual(validate(schema, m), []);
  assert.strictEqual(m.manifest_version, MANIFEST_VERSION);
  assert.strictEqual(m.kind, ATTESTATION_KIND);
  assert.strictEqual(m.disclosure.model, "architectural");
  assert.ok(m.disclosure.statement.length > 0);
  assert.strictEqual(m.disclosure.sources.length, 2);
  assert.match(m.content_digest, /^sha256:[0-9a-f]{64}$/);
});

test("carries a generator credit block sourced from package.json (ADR-037)", () => {
  const m = buildPolicyManifest(inputs());
  assert.strictEqual(m.generator.name, "modonome");
  assert.strictEqual(m.generator.homepage, "https://modonome.com");
  assert.strictEqual(m.generator.repository, "https://github.com/enumind/modonome");
});

test("the generator block is inside the digest: renaming the package moves it", () => {
  const base = inputs();
  const d0 = buildPolicyManifest(base).content_digest;
  const renamed = buildPolicyManifest({ ...base, pkgJson: { ...base.pkgJson, name: "not-modonome" } }).content_digest;
  assert.notStrictEqual(d0, renamed, "a generator claiming a different tool name must hash differently");
});

test("discloses every capability flag with a boolean default", () => {
  const m = buildPolicyManifest(inputs());
  assert.strictEqual(m.policy.capabilities.length, CAPABILITY_FLAGS.length);
  for (const c of m.policy.capabilities) {
    assert.ok(CAPABILITY_FLAGS.includes(c.name));
    assert.strictEqual(typeof c.default, "boolean");
  }
});

test("fingerprints all four attribution detector libraries", () => {
  const m = buildPolicyManifest(inputs());
  assert.strictEqual(m.policy.attribution_sources.length, 4);
  for (const s of m.policy.attribution_sources) {
    assert.match(s.sha256, /^sha256:[0-9a-f]{64}$/); // all four exist in the real repo
  }
});

test("is deterministic: same inputs yield the same digest", () => {
  assert.strictEqual(buildPolicyManifest(inputs()).content_digest, buildPolicyManifest(inputs()).content_digest);
});

test("posture and capability defaults are inside the digest", () => {
  const base = inputs();
  const d0 = buildPolicyManifest(base).content_digest;
  const armed = buildPolicyManifest({ ...base, config: { ...base.config, autonomy_enabled: true } }).content_digest;
  const cap = buildPolicyManifest({ ...base, config: { ...base.config, remediation_apply_enabled: true } }).content_digest;
  assert.notStrictEqual(d0, armed);
  assert.notStrictEqual(d0, cap);
});

test("manifestDigest is sensitive to any body field, including a fingerprint", () => {
  const body = { kind: "policy-attestation", policy: { attribution_sources: [{ file: "x", sha256: "sha256:aaa" }] } };
  const changed = { kind: "policy-attestation", policy: { attribution_sources: [{ file: "x", sha256: "sha256:bbb" }] } };
  assert.notStrictEqual(manifestDigest(body), manifestDigest(changed));
});

test("gatesFromVerify resolves npm-run aliases and the well-known gates", () => {
  const pkg = {
    scripts: {
      verify: "npm run check:drift && node scripts/check-foo.mjs && npm test && node scripts/snapshot.mjs . --check && node scripts/build-policy-attestation.mjs --check",
      "check:drift": "node scripts/check-drift.mjs",
      test: "node --test tests/*.test.mjs",
    },
  };
  const g = gatesFromVerify(pkg);
  assert.ok(g.includes("check-drift"), "resolves the alias to its script");
  assert.ok(g.includes("check-foo"));
  assert.ok(g.includes("tests"));
  assert.ok(g.includes("snapshot-freshness"));
  assert.ok(g.includes("policy-attestation-freshness"));
  assert.deepStrictEqual(g, [...g].sort(), "gates are sorted for a stable digest");
});

test("extractSection returns the section body up to the next same-level heading", () => {
  const md = "# Title\n\nintro\n\n## Alpha\n\naaa\n\n### Sub\n\nbbb\n\n## Beta\n\nccc\n";
  const alpha = extractSection(md, "Alpha");
  assert.match(alpha, /aaa/);
  assert.match(alpha, /Sub/, "includes deeper subsections");
  assert.ok(!/ccc/.test(alpha), "stops at the next ## heading");
  assert.match(extractSection(md, "alpha"), /aaa/, "case-insensitive");
  assert.strictEqual(extractSection(md, "Missing"), null);
});
