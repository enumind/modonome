export const MESSAGES = {
  "gate.checker-engagement.ghosting": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template:
      'Checker "{checkerId}" approved {threshold} consecutive runs with no engagement. Request changes or raise a question on the next run, or escalate to a different checker.',
  },
  "gate.checker-engagement.fail-summary": {
    category: "gate",
    severity: "blocked",
    non_suppressible: true,
    template: "FAIL: {count} ghosting pattern(s):\n",
  },
};
