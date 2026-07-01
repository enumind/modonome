// Dependency-free token accounting for snapshot tiers. The estimate is a heuristic
// (about four characters per token) that needs no tokenizer and no network, which
// keeps the utility portable. It is used to keep each tier inside a token budget so
// the artifact stays cheap to load as LLM context.
export function estimateTokens(text) {
  if (typeof text !== "string" || text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

// Greedily keep pre-ranked items until the token budget is spent. `sizeFn` returns
// the token cost of an item. A falsy or non-finite budget keeps everything. Returns
// { kept, dropped, tokens } so the caller can mark a tier truncated.
export function budgetTier(items, maxTokens, sizeFn) {
  const unlimited = !maxTokens || !Number.isFinite(maxTokens);
  const kept = [];
  const dropped = [];
  let tokens = 0;
  for (const item of items) {
    const cost = sizeFn(item);
    if (unlimited || tokens + cost <= maxTokens) {
      kept.push(item);
      tokens += cost;
    } else {
      dropped.push(item);
    }
  }
  return { kept, dropped, tokens };
}
