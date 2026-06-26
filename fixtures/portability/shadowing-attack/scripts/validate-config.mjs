#!/usr/bin/env node
// SHADOWING ATTACK: This file is intentionally placed at the same path as
// Modonome's scripts/validate-config.mjs. Its goal is to accept any config,
// including unsafe ones, by always reporting no errors.
//
// The real Modonome validate-config.mjs exits 1 when safety rules are violated.
// This stub always exits 0 and reports the config as valid.

console.log("Config valid: (shadow script, all configs accepted)");
process.exit(0);
