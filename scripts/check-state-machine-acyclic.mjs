#!/usr/bin/env node
// State machine acyclic guard. Proves a state machine fixture is well-formed:
// no unguarded cycle, every non-terminal state can reach a terminal state, and
// no non-terminal sink. A cap_guard edge models the bounded-retry escape (the
// attempts < max_attempts hop), so it is excluded when looking for the illegal
// cycles that would otherwise let an item loop forever.
// Usage: node scripts/check-state-machine-acyclic.mjs <path/to/fixture.json>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isCyclic, topoSort } from "./lib/graph.mjs";

// Build the adjacency map { state: [to, ...] } from the transition list.
// When includeCapGuard is false, cap_guard edges are dropped: those are the
// sanctioned bounded-retry escapes and must not count as illegal cycles.
function buildAdjacency(machine, { includeCapGuard }) {
  const adjacency = {};
  for (const state of machine.states) adjacency[state] = [];
  for (const t of machine.transitions) {
    if (t.cap_guard && !includeCapGuard) continue;
    (adjacency[t.from] ||= []).push(t.to);
  }
  return adjacency;
}

// reaches(adjacency, start, targets) -> bool
// Whether any node in `targets` is reachable from `start` along the edges.
function reaches(adjacency, start, targets) {
  const seen = new Set();
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift();
    if (targets.has(node)) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of (adjacency[node] || [])) queue.push(next);
  }
  return false;
}

export function stateMachineErrors(machine) {
  const errs = [];
  const states = new Set(machine.states);
  const terminal = new Set(machine.terminal || []);

  // The full graph (cap_guard edges included) governs reachability and sinks:
  // the bounded-retry escape is a real edge an item can traverse. The guarded
  // graph (cap_guard edges removed) governs cycle legality.
  const full = buildAdjacency(machine, { includeCapGuard: true });
  const guarded = buildAdjacency(machine, { includeCapGuard: false });

  // (1) No unguarded cycle. cap_guard edges are excluded so the bounded-retry
  // loop is not flagged; any remaining cycle has no escape and is illegal.
  const { cyclic, cycle } = isCyclic(guarded);
  if (cyclic) {
    errs.push(`unguarded cycle: ${cycle.join(" -> ")}`);
  }

  for (const state of states) {
    if (terminal.has(state)) continue;

    // (3) No non-terminal sink: a non-terminal state with no outgoing edge
    // strands any item that lands there.
    if ((full[state] || []).length === 0) {
      errs.push(`non-terminal sink: ${state} has no outgoing transitions`);
      continue;
    }

    // (2) Every non-terminal state must reach a terminal state.
    if (!reaches(full, state, terminal)) {
      errs.push(`unreachable terminal: ${state} cannot reach any terminal state`);
    }
  }

  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/check-state-machine-acyclic.mjs <fixture.json>");
    process.exit(2);
  }
  const machine = JSON.parse(readFileSync(path, "utf8"));
  const errors = stateMachineErrors(machine);
  if (errors.length > 0) {
    console.error(`State machine invalid: ${path}`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`State machine valid: ${path}`);
}
