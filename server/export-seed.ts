/**
 * Writes the shipped default content to server/php/seed.json so the
 * PHP + MySQL edition seeds exactly the same data as the Node API.
 *
 *   npm run seed:php
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultContent } from "../src/data/defaults.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "php", "seed.json");
fs.writeFileSync(target, JSON.stringify(defaultContent, null, 2) + "\n", "utf8");
console.log(`Wrote ${path.relative(process.cwd(), target)}`);
