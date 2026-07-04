export const MESSAGES = {
  "gate.prompt-behavior.no-anchors": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "fixture declares no anchors",
  },
  "gate.prompt-behavior.anchor-missing": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "governing rule text missing from prompt: {missing}",
  },
  "gate.prompt-behavior.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "\nFAIL: {failed} of {total} scenario(s) lost their governing rule text.",
  },
  "gate.prompt-behavior.fail-hint-drift": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "A prompt edit removed or reshaped a rule that produces a golden decision.",
  },
  "gate.prompt-behavior.fail-hint-intentional": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "If the behavioral change is intentional, update the fixture and cite the ADR/PR.",
  },
};
