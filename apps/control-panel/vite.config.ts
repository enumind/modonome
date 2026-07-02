import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { modonomeApiPlugin } from "./server/api.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// The control panel consumes the design system from source so a build here never
// depends on a separately published artifact. The alias points at the generated
// barrel (run design-system/gen-barrel.mjs if it is stale). modonomeApiPlugin adds the
// /api/modonome/* routes that read (and, when MODONOME_PANEL_WRITE=1, write) the real
// .modonome directory; it only runs in the dev and preview servers, never in the
// static build, so a production bundle stays a plain client-only SPA.
export default defineConfig({
  plugins: [react(), modonomeApiPlugin()],
  resolve: {
    alias: {
      "@modonome/design-system/styles.css": resolve(here, "../../design-system/src/styles.css"),
      "@modonome/design-system": resolve(here, "../../design-system/src/index.ts"),
    },
  },
  // Fonts are served from design-system/fonts, outside this package's own root, so
  // Vite's dev-server file allowlist needs the repo root too (otherwise the self-hosted
  // woff2 files 403 in dev and every screen silently falls back to system fonts).
  server: { port: 5180, fs: { allow: [resolve(here, "../..")] } },
  preview: { port: 5180 },
});
