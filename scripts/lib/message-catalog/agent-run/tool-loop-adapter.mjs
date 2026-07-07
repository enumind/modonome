export const MESSAGES = {
  "agent-run.tool-loop-adapter.no-command": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "tool-loop-adapter: adapter entry has no usable command/name.",
  },
  "agent-run.tool-loop-adapter.target-escapes-root": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: 'tool-loop-adapter: target "{target}" escapes the repo root; refused (ADR-009).',
  },
  "agent-run.tool-loop-adapter.refused": {
    category: "agent-run",
    severity: "attention",
    non_suppressible: false,
    template: "[tool-loop refused] {reason}\n",
  },
  "agent-run.tool-loop-adapter.spawn-failed-transcript": {
    category: "agent-run",
    severity: "attention",
    non_suppressible: false,
    template: "[tool-loop spawn failed] {message}\n",
  },
  "agent-run.tool-loop-adapter.spawn-failed-reason": {
    category: "agent-run",
    severity: "attention",
    non_suppressible: false,
    template: "spawn failed: {message}",
  },
  "agent-run.tool-loop-adapter.timed-out": {
    category: "agent-run",
    severity: "attention",
    non_suppressible: false,
    template: "adapter timed out after {timeoutMs}ms and was killed.",
  },
  "agent-run.tool-loop-adapter.process-error": {
    category: "agent-run",
    severity: "attention",
    non_suppressible: false,
    template: "adapter process error: {message}",
  },
  "agent-run.tool-loop-adapter.exited-nonzero": {
    category: "agent-run",
    severity: "attention",
    non_suppressible: false,
    template: "adapter exited with status {status}{signalSuffix}.",
  },
};
