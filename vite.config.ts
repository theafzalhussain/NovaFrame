import path from "path";
import { fileURLToPath } from "url";
import type { ServerResponse } from "node:http";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type ProxyOptions } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

/**
 * /api is proxied to the Express server. When nothing is listening there, the
 * proxy's default behaviour is to drop the socket, which the browser reports as a
 * bare 500 on every request — easy to mistake for a broken site. Answering with a
 * plain-text 503 instead names the actual problem, and because the reply is not
 * JSON the API client still treats it as "API unavailable" and falls back to its
 * in-browser adapter for public pages.
 */
const apiProxy: ProxyOptions = {
  target: API_TARGET,
  changeOrigin: true,
  configure(proxy) {
    proxy.on("error", (err, req, res) => {
      const target = `${req.method ?? "GET"} ${req.url ?? ""}`;
      console.warn(`\n  [api proxy] ${API_TARGET} unreachable (${err.message}) for ${target}` + `\n  Start the API with \`npm run server\`, or use \`npm run dev\` which starts both.\n`);
      // Websocket upgrades hand over a raw socket, which cannot carry a status code.
      if (!res || !("writeHead" in res)) {
        (res as { destroy?: () => void } | undefined)?.destroy?.();
        return;
      }
      const response = res as ServerResponse;
      if (response.headersSent || response.writableEnded) return;
      response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      response.end("The API server is not running. Start it with `npm run server`, or use `npm run dev` which starts both.");
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Modern baseline: every browser that supports ES modules and `import()` (which this app
    // requires anyway) also supports ES2022, so shipping down-levelled syntax only adds bytes.
    target: "es2022",
    // Code-split output (dist/index.html + hashed files in dist/assets/). The home page loads only
    // what it needs; other pages, the admin console and the three.js hero load on demand.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Long-lived vendor files stay cached across deploys of the site's own code.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) {
            // RoomEnvironment is only used by the "full" quality hero, and heroScene.ts imports
            // it dynamically inside that branch — so phones never request this file.
            if (/RoomEnvironment/.test(id)) return "three-env";
            return "three";
          }
        },
      },
    },
    // three.js is loaded lazily, after the page is interactive, and only on devices that
    // will actually render the scene — so its size is not on the critical path.
    chunkSizeWarningLimit: 700,
    // Skipping the gzip-size pass makes builds noticeably faster; sizes are checked in CI/manually.
    reportCompressedSize: true,
  },
  server: {
    // `npm run dev` starts the API alongside this server and /api is proxied to it.
    proxy: { "/api": apiProxy },
  },
  preview: {
    proxy: { "/api": apiProxy },
  },
});
