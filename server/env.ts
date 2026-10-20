/**
 * Loads `.env` (project root or server/) before anything else reads
 * process.env. Uses Node's built-in loader — no dependency needed.
 */
import fs from "node:fs";
import path from "node:path";

for (const file of [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "server", ".env")]) {
  if (!fs.existsSync(file)) continue;
  try {
    process.loadEnvFile(file);
  } catch (err) {
    console.warn(`[env] Could not load ${file}:`, (err as Error).message);
  }
}
