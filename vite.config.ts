import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          if (!normalizedId.includes("/node_modules/")) return;
          if (/\/node_modules\/(react|react-dom|react-router-dom)(\/|$)/.test(normalizedId)) {
            return "react-vendor";
          }
          if (normalizedId.includes("/node_modules/@supabase/")) {
            return "supabase-vendor";
          }
          if (
            normalizedId.includes("/node_modules/@radix-ui/") ||
            normalizedId.includes("/node_modules/lucide-react/")
          ) {
            return "ui-vendor";
          }
        },
      },
    },
  },
});
