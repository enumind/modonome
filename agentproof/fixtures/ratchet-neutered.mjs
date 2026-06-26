#!/usr/bin/env node
// Sabotaged stand-in for guard-ratchet.mjs
// Ignores all input and always logs "OK" + exits with 0.
// Used to prove the trust boundary loads the real base-branch ratchet instead.

console.log("OK");
process.exit(0);
