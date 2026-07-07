export const MESSAGES = {
  "advisory.sync-site-data.repo-data-missing": {
    category: "advisory",
    severity: "attention",
    non_suppressible: false,
    template: "site/repo-data.js not found; skipping update.",
  },
  "advisory.sync-site-data.index-missing": {
    category: "advisory",
    severity: "attention",
    non_suppressible: false,
    template: "site/index.html not found; skipping update.",
  },
  "advisory.sync-site-data.verify-index-missing": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "site/index.html not found.",
  },
  "advisory.sync-site-data.engine-base-unparseable": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "Could not parse engineBase in site/index.html.",
  },
  "advisory.sync-site-data.stale": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template:
      "Site data is stale or incorrect:\n  Lessons: expected {expectedLessons}, found {foundLessons}\n  Gates: expected {expectedGates}, found {foundGates}",
  },
  "advisory.sync-site-data.failed": {
    category: "advisory",
    severity: "blocked",
    non_suppressible: false,
    template: "sync-site-data failed: {error}",
  },
};
