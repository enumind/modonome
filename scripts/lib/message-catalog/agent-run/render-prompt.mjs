export const MESSAGES = {
  "agent-run.render-prompt.invalid-role": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: 'render-prompt: invalid role "{role}".',
  },
  "agent-run.render-prompt.missing-var": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "render-prompt: {role}.txt references ${{name}} but it is not set.",
  },
  "agent-run.render-prompt.usage": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Usage: node scripts/agent/render-prompt.mjs <maker|checker>",
  },
};
