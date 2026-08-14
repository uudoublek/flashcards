import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // relative paths for GitHub Pages
  server: {
    port: 5177,
  },
  preview: {
    port: 4177,
  },
  build: {
    outDir: "dist",
  },
});
