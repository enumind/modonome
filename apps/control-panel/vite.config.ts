import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// The control panel consumes the design system from source so a build here never
// depends on a separately published artifact. The alias points at the generated
// barrel (run design-system/gen-barrel.mjs if it is stale).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@modonome/design-system/styles.css": resolve(here, "../../design-system/src/styles.css"),
      "@modonome/design-system": resolve(here, "../../design-system/src/index.ts"),
    },
  },
  server: { port: 5180 },
});
