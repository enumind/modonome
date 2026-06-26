import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validatePacket, redactionErrors } from "../scripts/validate-knowledge-packet.mjs";

// Base valid packet factory: returns a fresh object each call.
function makePacket(overrides = {}) {
  return {
    schema_version: 1,
    id: "kp-prov-001",
    signal: "review",
    classification: "public",
    redaction_status: "redacted",
    modernization_axis: "test_coverage",
    topic: "provenance test",
    application_capability: "checkout",
    problem_pattern: "missing provenance checks",
    pattern: "add evidence chain validation",
    local_validation_required: true,
    owner_decision_required: true,
    expires_at: "2026-12-31",
    ...overrides,
  };
}

// SESSION_START simulates the earliest timestamp this session could have produced.
const SESSION_START = new Date("2026-06-26T00:00:00Z");

describe("provenance: timestamp validation", () => {
  test("given a packet with a backdated published_at, validatePacket rejects it", () => {
    // Backdated evidence: timestamp clearly predates the system epoch (2026-01-01).
    // An attacker who sets published_at to a past date cannot have produced this packet
    // via the current governance system. The floor is the v0.1.0-alpha epoch.
    const backdatedTime = "2020-01-01T00:00:00.000Z"; // clearly before system epoch
    const packet = makePacket({ published_at: backdatedTime });
    const errors = validatePacket(packet);
    assert.ok(Array.isArray(errors), "validatePacket must return an array");
    assert.ok(
      errors.length > 0,
      `validatePacket must reject a packet with published_at ${backdatedTime} before session start ${SESSION_START.toISOString()}`
    );
    assert.ok(
      errors.some((e) => /published_at|timestamp|backdat/i.test(e)),
      `error must mention the timestamp field; got: ${JSON.stringify(errors)}`
    );
  });

  test("given a packet with a future expires_at, it passes structural validation", () => {
    const packet = makePacket({ expires_at: "2030-01-01" });
    const errors = validatePacket(packet);
    assert.deepEqual(errors, [], "packet with future expiry must be valid");
  });

  test("given a packet with a past expires_at string, validatePacket does not crash", () => {
    const packet = makePacket({ expires_at: "2020-01-01" });
    const errors = validatePacket(packet);
    assert.ok(Array.isArray(errors), "must return an array even if expired");
  });
});

describe("provenance: checksum / integrity", () => {
  test("given a packet with redaction_status blocked, validatePacket does not crash", () => {
    // A 'blocked' status is a valid enum value in the schema; validatePacket must handle it
    // without crashing and return an array regardless.
    const packet = makePacket({ redaction_status: "blocked" });
    const errors = validatePacket(packet);
    assert.ok(Array.isArray(errors), "validatePacket must return an array for any redaction_status value");
  });

  test("given a packet with classification restricted, it is rejected", () => {
    const packet = makePacket({ classification: "restricted" });
    const errors = validatePacket(packet);
    assert.ok(errors.length > 0, "restricted packet must be rejected");
  });

  test("given a packet with classification confidential, it is rejected", () => {
    const packet = makePacket({ classification: "confidential" });
    const errors = validatePacket(packet);
    assert.ok(errors.length > 0, "confidential packet must be rejected");
  });

  test("given a packet with local_validation_required false, it is rejected", () => {
    const packet = makePacket({ local_validation_required: false });
    const errors = validatePacket(packet);
    assert.ok(errors.length > 0, "packet with local_validation_required false must be rejected");
    assert.ok(errors.some((e) => /local_validation_required/.test(e)), "error must mention local_validation_required");
  });
});

describe("provenance: source repo protection", () => {
  test("given a packet claiming an internal hostname as source, it is blocked by secret scan", () => {
    // A source_repo_alias containing an internal hostname pattern leaks internal topology.
    const packet = makePacket({ source_repo_alias: "repo.corp" });
    const errors = validatePacket(packet);
    assert.ok(errors.length > 0, "internal hostname in source_repo_alias must be flagged");
    assert.ok(errors.some((e) => /internal hostname/.test(e)), "error must mention internal hostname");
  });

  test("given a packet with an AWS access key pattern embedded in evidence, it is blocked", () => {
    const packet = makePacket({
      pattern: "The key AKIA1234567890ABCDEF was exposed in logs",
    });
    const errors = validatePacket(packet);
    assert.ok(errors.length > 0, "packet with AWS key pattern must be rejected");
    assert.ok(errors.some((e) => /AWS access key/.test(e)), "error must identify the AWS key");
  });

  test("given a packet with a private key header, it is blocked", () => {
    const packet = makePacket({
      problem_pattern: "-----BEGIN RSA PRIVATE KEY-----",
    });
    const errors = validatePacket(packet);
    assert.ok(errors.length > 0, "packet with private key must be rejected");
    assert.ok(errors.some((e) => /private key/.test(e)), "error must mention private key");
  });
});

describe("provenance: evidence chain completeness", () => {
  test("given a packet with an empty evidence array, it passes (evidence is optional)", () => {
    const packet = makePacket({ evidence: [] });
    const errors = validatePacket(packet);
    assert.deepEqual(errors, [], "empty evidence array is valid per schema");
  });

  test("given a packet with well-formed evidence items, it passes", () => {
    const packet = makePacket({
      evidence: [
        { type: "test_run", result: "pass", ref: "sha:abc123" },
        { type: "review", reviewer: "ci-bot", outcome: "approved" },
      ],
    });
    const errors = validatePacket(packet);
    assert.deepEqual(errors, [], "packet with well-formed evidence must be valid");
  });

  test("given a packet with a bearer token in evidence, it is blocked", () => {
    const packet = makePacket({
      evidence: [{ type: "auth", token: "secret: Bearer abcdef1234567890" }],
    });
    const errors = validatePacket(packet);
    assert.ok(errors.length > 0, "evidence with bearer token must be rejected");
  });

  test("given a packet with a code fence in evidence, it is blocked", () => {
    const packet = makePacket({
      evidence: [{ snippet: "```js\nconsole.log('leak')\n```" }],
    });
    const errors = validatePacket(packet);
    assert.ok(errors.length > 0, "evidence with code fence must be rejected");
    assert.ok(errors.some((e) => /code fence/.test(e)), "error must mention code fence");
  });
});
