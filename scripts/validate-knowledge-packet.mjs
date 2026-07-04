#!/usr/bin/env node
// Validate a knowledge packet against the schema and a deterministic redaction
// scan. Publishing is blocked when sensitive content is present. Cross-repo
// sharing is off by default; this gate exists so that enabling it stays safe.
// Usage: node scripts/validate-knowledge-packet.mjs <path/to/packet.json>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./lib/jsonschema.mjs";
import { scanForSecrets } from "./lib/secret-patterns.mjs";
import { formatMessage, loadMessageOverrides } from "./lib/messages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, "..", "schemas", "knowledge-packet.schema.json"), "utf8"));
const overrides = loadMessageOverrides(join(here, "..", ".modonome"));

// Earliest plausible published_at: the v0.1.0-alpha release date.
// Packets claiming a timestamp before this cannot have been produced by this system.
const EARLIEST_VALID_TIMESTAMP = new Date("2026-01-01T00:00:00Z");

export function redactionErrors(packet) {
  const errs = [];
  const text = JSON.stringify(packet);
  for (const { name } of scanForSecrets(text)) {
    errs.push(formatMessage("advisory.knowledge-packet.secret-detected", { name }, overrides).message);
  }
  if (packet.classification === "restricted" || packet.classification === "confidential") {
    errs.push(
      formatMessage("advisory.knowledge-packet.classification-not-publishable", { classification: packet.classification }, overrides)
        .message
    );
  }
  if (packet.local_validation_required !== true) {
    errs.push(formatMessage("advisory.knowledge-packet.local-validation-required", {}, overrides).message);
  }
  if (packet.published_at !== undefined) {
    const ts = new Date(packet.published_at);
    if (isNaN(ts.getTime())) {
      errs.push(
        formatMessage("advisory.knowledge-packet.invalid-timestamp", { publishedAt: packet.published_at }, overrides).message
      );
    } else if (ts < EARLIEST_VALID_TIMESTAMP) {
      errs.push(
        formatMessage(
          "advisory.knowledge-packet.backdated-timestamp",
          { publishedAt: packet.published_at, earliest: EARLIEST_VALID_TIMESTAMP.toISOString() },
          overrides
        ).message
      );
    }
  }
  return errs;
}

export function validatePacket(packet) {
  return [...validate(schema, packet), ...redactionErrors(packet)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  if (!path) {
    console.error(formatMessage("advisory.knowledge-packet.usage", {}, overrides).message);
    process.exit(2);
  }
  const errors = validatePacket(JSON.parse(readFileSync(path, "utf8")));
  if (errors.length > 0) {
    console.error(formatMessage("advisory.knowledge-packet.not-publishable", { path }, overrides).message);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`Packet publishable: ${path}`);
}
