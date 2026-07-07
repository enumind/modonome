export const MESSAGES = {
  "advisory.github-api.repo-unresolved": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "github-api: could not resolve owner/repo from GITHUB_REPOSITORY or git remote origin.",
  },
  "advisory.github-api.timeout": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "github-api: request to {path} timed out after {timeoutMs}ms.",
  },
  "advisory.github-api.request-failed": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "github-api: GET {path} failed with status {status}{detail}.",
  },
  "advisory.github-api.retryable-status": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "github-api: retryable status {status} on attempt {attempt}.",
  },
  "advisory.github-api.retries-exhausted": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "github-api: exhausted retries.",
  },
};
