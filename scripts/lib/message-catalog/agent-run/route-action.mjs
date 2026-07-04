export const MESSAGES = {
  "agent-run.route-action.no-reachable-target": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template:
      'route-action: role "{model}" needs endpoint {where} ({kind}), but no configured runner target declares it can reach it. Add reachable_providers or reachable_endpoints to a runner in .modonome/config.yaml.',
  },
};
