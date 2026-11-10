/**
 * `npm run dev` — starts the API server and the Vite dev server together.
 *
 * The site reads all of its content from the API, and Vite proxies /api to it.
 * Running Vite on its own therefore makes every /api call fail with a proxy
 * error, which looks like a broken site rather than a missing process — so both
 * are started from one command. Ctrl+C stops both.
 *
 * If something is already listening on the API port (an API you started in
 * another terminal), only Vite is started.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = (...segments) => path.join(root, "node_modules", ...segments);

/** The API port: an explicit env var wins, then PORT in .env, then the server's own default. */
function apiPort() {
  if (process.env.PORT) return Number(process.env.PORT);
  for (const file of [".env", "server/.env"]) {
    try {
      const match = fs.readFileSync(path.join(root, file), "utf8").match(/^\s*PORT\s*=\s*"?(\d+)"?\s*$/m);
      if (match) return Number(match[1]);
    } catch {
      /* no .env file here */
    }
  }
  return 4000;
}

const API_PORT = apiPort();
// Both children get the same port, so the proxy can never point at the wrong one.
const env = { ...process.env, PORT: String(API_PORT), API_PROXY_TARGET: process.env.API_PROXY_TARGET ?? `http://localhost:${API_PORT}` };

const inUse = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(700);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });

const children = [];
let stopping = false;

function stopAll(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code ?? 0;
  for (const child of children) if (child.exitCode === null) child.kill();
}

function start(label, args) {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit" });
  child.on("error", (err) => {
    console.error(`\n  [${label}] failed to start: ${err.message}\n`);
    stopAll(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) console.log(`\n  [${label}] stopped${code === null ? ` (${signal})` : ` with code ${code}`}. Shutting down.\n`);
    stopAll(code ?? 0);
  });
  children.push(child);
  return child;
}

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stopAll(0));

if (await inUse(API_PORT)) {
  console.log(`\n  Port ${API_PORT} is already serving the API — starting only the web server.\n`);
} else {
  start("api", [bin("tsx", "dist", "cli.mjs"), "watch", "server/index.ts"]);
}
start("web", [bin("vite", "bin", "vite.js")]);