import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [
        // Allow serving files from the project root
        process.cwd(),
        // Allow serving files from the vendor directory
        path.resolve(__dirname, "vendor/actual/packages/loot-core")
      ],
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "loot-core": path.resolve(__dirname, "vendor/actual/packages/loot-core/src"),
    },
  },
}));
