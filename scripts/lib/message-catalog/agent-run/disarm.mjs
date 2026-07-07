export const MESSAGES = {
  "agent-run.disarm.no-config": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "No config found at {path}. There is nothing to disarm.",
  },
  "agent-run.disarm.config-parse-error": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Config at {path} does not parse: {error}",
  },
};
