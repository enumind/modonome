# Modonome landing page (modonome.com)

The marketing landing page for Modonome. It is served by GitHub Pages at
https://modonome.com. It lives in this repo on purpose: a PR that changes a feature
can update the page in the same commit, so the page never drifts from the product.

## Layout

| Path | Purpose |
|------|---------|
| `index.html` | The page. Adapted from the Claude Design export (`Modonome Landing.dc.html`). Loads React 18 from CDN, then `support.js`, then renders the design component. |
| `support.js` | Claude Design React runtime (compiled from TypeScript). Renders the `<x-dc>` component in `index.html` against the data in `repo-data.js`. |
| `helix-data.js` | Pre-computed SVG path data for the animated helix background. |
| `repo-data.js` | **Single content source of truth.** All copy: features, loop steps, AgentProof proofs, simulator data, roadmap milestones. Also fetches live from GitHub raw on each page load to keep the score and version current. |
| `assets/modonome-logo.webp` | Logo image referenced from `index.html` and `repo-data.js`. |
| `content/features.json` | Structured mirror of the features in `repo-data.js`. Updated by hand in sync with `repo-data.js`. |
| `articles/` | Static, hand-maintained content pages (no build step, no React/DC runtime): a hub page plus one page per article. |
| `CNAME` | Custom-domain marker for GitHub Pages. Contains `www.modonome.com`; the canonical URL is the apex `modonome.com`, which must redirect to or serve the same content (configured at the DNS level, verify there). |
| `.nojekyll` | Tells GitHub Pages to serve files as-is, no Jekyll processing. |

## Runtime dependencies

The page requires:
- **React 18** and **ReactDOM 18** (self-hosted UMD builds under `vendor/`, referenced from `index.html`)
- **Google Fonts** (Space Grotesk, IBM Plex Sans, IBM Plex Mono, loaded from `fonts.googleapis.com`)

React is served from the repo, so the page has no third-party script origin. The
`noscript` block carries a static text fallback for crawlers and no-JS visitors, and the
`/agentproof/`, `/quickstart/`, and `/articles/` pages render without any JavaScript. An
enforced `meta` Content-Security-Policy was tried and reverted (see the comment at the top
of `index.html`): it broke the DC runtime in production. The policy actually served to
visitors comes from a Cloudflare Transform Rule, not from this repo; `site/_headers`
is the source-of-truth reference those rule values must match (see that file's comment).

## Deploy

Automatic after merge. `.github/workflows/pages.yml` deploys to GitHub Pages:
- A pull request touching `site/**` runs a build check only (no deploy).
- A push to `main` touching `site/**` builds and publishes.

The workflow uses the built-in `GITHUB_TOKEN`. There is no long-lived deploy credential.

## Automated sync

Two layers keep the page in sync with the product:

1. **Runtime (live):** `repo-data.js` fetches from `raw.githubusercontent.com/enumind/modonome/main`
   on each page load and updates the AgentProof score, version, and scenario list in memory.
   The static values below serve as fallback when the repo is unreachable.

2. **Build-time (automated):** `.github/workflows/sync-site-data.yml` runs on every push to
   `main` that changes `README.md`, `ROADMAP.md`, `agentproof/README.md`, or `package.json`.
   It runs `scripts/sync-site-data.mjs`, which updates `meta.version`, `meta.agentproofScore`,
   and `meta.agentproofLevel` in `site/repo-data.js` (from `package.json` and
   `agentproof/README.md`) and the `engineBase` line in `site/index.html` (from
   `RELEASE-EVIDENCE.md` and the work-item queue), regenerates the repo snapshot, then commits
   and pushes. The `pages.yml` deploy auto-triggers on the commit to `site/**`.

Feature copy changes (feature titles, body text, loop steps, roadmap milestones) are updated
by editing `site/repo-data.js` and `site/content/features.json` in the same PR as the product
change. The sync script handles structured fields only (version, score, level). Prose claims in
`index.html` (the JSON-LD block, the `noscript` fallback, the AgentProof section, and the
`/agentproof/` and `/quickstart/` content pages) are hand-maintained: update them in the same PR
when scenario counts or scores change.

## Keeping it in sync with features

When a feature changes:
1. Update `README.md` (canonical product description).
2. Update `site/repo-data.js` (the copy the page renders from).
3. Update `site/content/features.json` (the structured mirror).

Do all three in one PR so the history stays readable.

If the change is significant enough to warrant its own article under `site/articles/`,
add the new page in the same PR, link it from `site/articles/index.html` (the hub), and
add it to `site/sitemap.xml`. An article that never gets linked from the hub or the
sitemap is effectively unpublished.

## House style

`scripts/check-style.mjs` lints `.html` and `.js` files here. Avoid em dashes (the
linter bans them) and banned phrases. See the linter for the full rule list. CI fails
the PR on violations.

## Updating the Claude Design export

To replace `index.html` with a new Claude Design export of `Modonome Landing.dc.html`:
1. Export the updated design (download the ZIP or use "Send to Claude Code Web").
2. Patch the new file:
   - Add React CDN + meta tags to `<head>` (copy the block from the current `index.html`).
   - Fix any em dashes (`scripts/check-style.mjs site/` catches them).
   - Fix any banned phrases.
3. Copy updated `support.js`, `helix-data.js`, and `repo-data.js` if they changed
   (same patches: replace em dashes in comments).
4. Open a PR touching `site/**`. Merge to publish.

## Run it locally

```bash
# Requires a local server (React CDN fetch needs http://, not file://)
npx serve site
# Then open http://localhost:3000

# Lint check (same as CI)
node scripts/check-style.mjs site/

# Test the sync script
node scripts/sync-site-data.mjs
```
