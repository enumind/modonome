export const MESSAGES = {
  "agent-run.release.usage": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Usage: npm run release -- patch|minor|major",
  },
  "agent-run.release.dirty-tree": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "Working tree is not clean. Commit or stash changes first.",
  },
  "agent-run.release.wrong-branch": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: 'Must be on main branch (currently on "{branch}").',
  },
  "agent-run.release.already-published": {
    category: "agent-run",
    severity: "blocked",
    non_suppressible: true,
    template: "{version} is already published on npm. Bump again or unpublish first.",
  },
};
