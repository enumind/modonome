export const MESSAGES = {
  "advisory.preflight-embedding.usage": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Usage: node scripts/preflight-embedding.mjs --target-dir <path> [--json]",
  },
  "advisory.preflight-embedding.target-dir-missing": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Target directory does not exist: {targetDir}",
  },
};
