import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  // Inline the art so the build is one self-contained page
  build: { assetsInlineLimit: 500_000 },
  resolve: {
    alias: {
      "@gojai/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
    },
  },
});
