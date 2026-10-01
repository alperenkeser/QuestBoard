import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the QuestBoard renderer process.
// base: "./" ensures asset paths resolve correctly when loaded via file:// in production Electron builds.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
