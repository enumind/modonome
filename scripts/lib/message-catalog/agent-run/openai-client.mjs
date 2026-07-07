export const MESSAGES = {
  "agent-run.openai-client.missing-base-url": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "openai-client: baseUrl is required.",
  },
  "agent-run.openai-client.malformed-response": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "openai-client: malformed response (missing choices[0].message.content).",
  },
  "agent-run.openai-client.request-timed-out": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "openai-client: request timed out after {timeoutMs}ms.",
  },
  "agent-run.openai-client.request-failed": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "openai-client: request failed with status {status}{statusText}.",
  },
  "agent-run.openai-client.retryable-status": {
    category: "agent-run",
    severity: "attention",
    non_suppressible: false,
    template: "openai-client: retryable status {status} on attempt {attempt}.",
  },
  "agent-run.openai-client.exhausted-retries": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "openai-client: exhausted retries.",
  },
};
