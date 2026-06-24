#!/usr/bin/env node
// Validate a knowledge packet against the schema and a deterministic redaction
// scan. Publishing is blocked when sensitive content is present. Cross-repo
// sharing is off by default; this gate exists so that enabling it stays safe.
// Usage: node scripts/validate-knowledge-packet.mjs <path/to/packet.json>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./lib/jsonschema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, "..", "schemas", "knowledge-packet.schema.json"), "utf8"));

const SECRET_PATTERNS = [
  { name: "private key", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "bearer or api token", re: /\b(secret|token|api[_-]?key|password)\b\s*[:=]\s*\S+/i },
  { name: "email address", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/ },
  { name: "private IPv4", re: /\b(10|192\.168|172\.(1[6-9]|2\d|3[01]))(\.\d{1,3}){1,3}\b/ },
  { name: "internal hostname", re: /\b[\w-]+\.(internal|corp|local|intra)\b/ },
  { name: "code fence", re: /```[\s\S]*```/ },
];

export function redactionErrors(packet) {
  const errs = [];
  const text = JSON.stringify(packet);
  for (const p of SECRET_PATTERNS) {
    if (p.re.test(text)) {
      errs.push(`packet may contain ${p.name}; remove it before publish.`);
    }
  }
  if (packet.classification === "restricted" || packet.classification === "confidential") {
    errs.push(`packet classification ${packet.classification} is not publishable.`);
  }
  if (packet.local_validation_required !== true) {
    errs.push("local_validation_required must be true.");
  }
  return errs;
}

export function validatePacket(packet) {
  return [...validate(schema, packet), ...redactionErrors(packet)];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate-knowledge-packet.mjs <packet.json>");
    process.exit(2);
  }
  const errors = validatePacket(JSON.parse(readFileSync(path, "utf8")));
  if (errors.length > 0) {
    console.error(`Packet not publishable: ${path}`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`Packet publishable: ${path}`);
}
