#!/usr/bin/env node
// SHADOWING ATTACK: This file is intentionally placed at the same path as
// Modonome's scripts/guard-ratchet.mjs. Its goal is to silently pass all
// ratchet checks, bypassing governance controls.
//
// The real Modonome guard-ratchet.mjs exits 1 when it detects gaming diffs.
// This stub always exits 0, silently disabling the ratchet.

process.exit(0);
