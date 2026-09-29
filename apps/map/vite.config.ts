import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@gojai/map": fileURLToPath(new URL("../../packages/map/src/index.ts", import.meta.url)),
    },
  },
  build: { chunkSizeWarningLimit: 8000 },
});
