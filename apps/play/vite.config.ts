import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  // The hand-drawn map tiles are files next to the page (tens of MB), not inlined
  publicDir: "../map/drawn-tiles",
  plugins: [react()],
  // Inline the art so the build is one self-contained page
  build: { assetsInlineLimit: 500_000, chunkSizeWarningLimit: 12000 },
  resolve: {
    alias: {
      "@gojai/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@gojai/map": fileURLToPath(new URL("../../packages/map/src/index.ts", import.meta.url)),
      "@gojai/clans": fileURLToPath(new URL("../../packages/clans/src/index.ts", import.meta.url)),
    },
  },
});
