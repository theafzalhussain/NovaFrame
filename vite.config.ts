import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Code-split output (dist/index.html + hashed files in dist/assets/). The home page loads only
    // what it needs; other pages, the admin console and the three.js hero load on demand.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Long-lived vendor files stay cached across deploys of the site's own code.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return "three";
        },
      },
    },
    // three.js is one ~600 kB (≈150 kB gzipped) file, loaded lazily after the page is interactive.
    chunkSizeWarningLimit: 700,
  },
  server: {
    // `npm run dev` + `npm run server` work together: /api is proxied to the Express API.
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
