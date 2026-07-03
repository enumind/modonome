#!/usr/bin/env node
// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
// Expire stale in-flight work items whose lease_expires_at has passed.
// Requeues the item if attempts remain; escalates if max_attempts is reached.
// Usage: node scripts/tick.mjs [stateDir]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const stateDir = process.argv[2] || ".modonome";
const itemsDir = join(stateDir, "work-items");

const IN_FLIGHT = new Set(["claimed", "making", "checking", "rework"]);
const now = new Date();
let expired = 0;
let escalated = 0;

let files;
try {
  files = readdirSync(itemsDir).filter((f) => f.endsWith(".json")).sort();
} catch {
  console.log("tick: no work-items directory found, nothing to do.");
  process.exit(0);
}

for (const file of files) {
  const path = join(itemsDir, file);
  let item;
  try {
    item = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    continue;
  }

  if (!IN_FLIGHT.has(item.state)) continue;
  if (!item.lease_expires_at) continue;
  if (new Date(item.lease_expires_at) > now) continue;

  const attempts = (item.attempts || 0) + 1;
  const maxAttempts = item.max_attempts || 3;

  if (attempts >= maxAttempts) {
    item.state = "escalated";
    item.escalation_reason = `lease expired after ${attempts} attempt(s), max_attempts reached`;
    escalated++;
  } else {
    item.state = "queued";
    item.attempts = attempts;
    delete item.lease_expires_at;
    delete item.maker_id;
    delete item.checker_id;
    delete item.branch;
    expired++;
  }

  writeFileSync(path, JSON.stringify(item, null, 2));
  console.log(`tick: ${item.id} => ${item.state} (attempt ${attempts}/${maxAttempts})`);
}

if (expired === 0 && escalated === 0) {
  console.log("tick: no expired leases.");
}
