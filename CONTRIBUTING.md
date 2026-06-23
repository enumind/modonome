# Contributing to Modonome

Thank you for helping. A few rules keep the project safe and consistent.

## Ground rules

- Keep the defaults safe. Nothing in a default path may enable autonomy, auto-merge, remote
  spend, or cross-repo sharing.
- The prompt, schemas, scripts, and templates are owner-reviewed. They carry the engine's
  guarantees.
- One source of truth. Config levers live in the schema. The prompt and templates follow it.
  The drift guard enforces this.

## Local checks

```bash
npm run verify
```

This runs the drift guard, the style check, and the tests. It needs no network or secrets.

## House style

- Plain, positive, confident voice. Short sentences. Concrete nouns.
- No em dashes. No AI authorship signatures in any file.
- The style check runs in CI and will flag these.

## Pull requests

- Keep changes small and test-fenced.
- A change that touches a schema, a script, or the prompt needs owner review.
- Update the changelog when you change a default lever.
