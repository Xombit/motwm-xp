import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2019",
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: "src/main.ts",
      output: {
        entryFileNames: "main.js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) return "styles.css";
          return "assets/[name]-[hash][extname]";
        }
      }
    }
  }
});
