export const MESSAGES = {
  "advisory.build-prompt.bundle-drift": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template:
      "Bundle drift: prompts/modonome.bundle.md does not equal core plus modules.\nRun: node scripts/build-prompt.mjs --write",
  },
};
