// Cycle detection and topological sort for directed graphs.
// Used by AP-17 (state machine) and AP-24 (gate DAG).
// The adjacency map is { node: [neighbour, ...] }. Nodes with no outgoing
// edges may be omitted from the map; they are discovered from the node list
// passed to topoSort or from values in the adjacency map.

// isCyclic(adjacency) -> { cyclic: bool, cycle: [...] }
// Detects whether the graph contains a cycle. When a cycle is found, `cycle`
// holds the nodes involved in the order they were detected via DFS (the first
// repeated node closes the list). When no cycle exists, `cycle` is empty.
export function isCyclic(adjacency) {
  const visited = new Set();
  const stack = new Set();
  const cycle = [];

  function dfs(node) {
    visited.add(node);
    stack.add(node);
    for (const neighbour of (adjacency[node] || [])) {
      if (!visited.has(neighbour)) {
        const found = dfs(neighbour);
        if (found) return true;
      } else if (stack.has(neighbour)) {
        // Reconstruct the cycle segment from the stack.
        const stackArr = [...stack];
        const start = stackArr.indexOf(neighbour);
        cycle.push(...stackArr.slice(start), neighbour);
        return true;
      }
    }
    stack.delete(node);
    return false;
  }

  const allNodes = collectNodes(adjacency);
  for (const node of allNodes) {
    if (!visited.has(node)) {
      if (dfs(node)) return { cyclic: true, cycle };
    }
  }
  return { cyclic: false, cycle: [] };
}

// topoSort(adjacency, nodes) -> { order: [...], error?: string }
// Returns a topological ordering of `nodes` given the directed edges in
// `adjacency`. Nodes not present in `nodes` but reachable via edges are
// ignored in the output order. Returns an error string when a cycle is found.
export function topoSort(adjacency, nodes) {
  const { cyclic, cycle } = isCyclic(adjacency);
  if (cyclic) {
    return { order: [], error: `cycle detected: ${cycle.join(" -> ")}` };
  }

  const nodeSet = new Set(nodes);
  const visited = new Set();
  const order = [];

  function dfs(node) {
    visited.add(node);
    for (const neighbour of (adjacency[node] || [])) {
      if (!visited.has(neighbour)) dfs(neighbour);
    }
    if (nodeSet.has(node)) order.push(node);
  }

  for (const node of nodes) {
    if (!visited.has(node)) dfs(node);
  }

  order.reverse();
  return { order };
}

// Collect every node mentioned either as a key or as a neighbour value.
function collectNodes(adjacency) {
  const nodes = new Set(Object.keys(adjacency));
  for (const neighbours of Object.values(adjacency)) {
    for (const n of neighbours) nodes.add(n);
  }
  return nodes;
}
