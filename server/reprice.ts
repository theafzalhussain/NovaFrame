/**
 * Re-price the LIVE database into the ₹1,000–₹10,000 startup band.
 *
 * The DB is authoritative once seeded, so editing src/data/content.ts alone
 * does NOT change an already-populated site. This script copies the new
 * price-related fields from the shipped defaults onto the existing rows —
 * WITHOUT touching any other field (descriptions, features, timelines,
 * stacks, etc. are preserved exactly as they are in the DB).
 *
 * Fields it rewrites:
 *   • content/packages  → price, usd, suffix
 *   • content/services  → startingAt
 *   • settings/advanced → estimator (bases, extras, multipliers, rush) + budgetRanges
 *
 *   Inspect only (default):  npm run reprice
 *   Apply the changes:       npm run reprice -- --apply
 *
 * Targets whatever DB the server uses (Turso when TURSO_DATABASE_URL is set).
 */
import "./env.js";
import { all, get, run, initDb, usingTurso } from "./db.js";
import { defaultContent } from "../src/data/defaults.js";

const APPLY = process.argv.includes("--apply");

await initDb();
console.log(`Database: ${usingTurso ? "Turso (hosted, LIVE)" : "local SQLite"}`);
console.log(APPLY ? "Mode: APPLY\n" : "Mode: dry run (pass --apply to write)\n");

const def = defaultContent;
let writes = 0;

/* ---- packages: price / usd / suffix --------------------------------- */
const defPackages = new Map(def.collections.packages.map((p) => [p.id, p]));
for (const row of await all<{ id: string; data: string }>("SELECT id, data FROM content WHERE collection = 'packages'")) {
  const dp = defPackages.get(row.id);
  if (!dp) continue;
  const doc = JSON.parse(row.data) as Record<string, unknown>;
  const before = `${doc.price} / ${doc.usd}`;
  const after = `${dp.price} / ${dp.usd}`;
  if (before === after && doc.suffix === dp.suffix) {
    console.log(`= packages/${row.id}: already ${after}`);
    continue;
  }
  doc.price = dp.price;
  doc.usd = dp.usd;
  doc.suffix = dp.suffix;
  console.log(`~ packages/${row.id}: ${before}  ->  ${after}`);
  if (APPLY) {
    await run("UPDATE content SET data = ?, updated_at = datetime('now') WHERE collection = 'packages' AND id = ?", [
      JSON.stringify({ ...doc, id: row.id }),
      row.id,
    ]);
    writes++;
  }
}

/* ---- services: startingAt ------------------------------------------- */
const defServices = new Map(def.collections.services.map((s) => [s.id, s]));
for (const row of await all<{ id: string; data: string }>("SELECT id, data FROM content WHERE collection = 'services'")) {
  const ds = defServices.get(row.id);
  if (!ds) continue;
  const doc = JSON.parse(row.data) as Record<string, unknown>;
  if (doc.startingAt === ds.startingAt) {
    console.log(`= services/${row.id}: already ${ds.startingAt}`);
    continue;
  }
  console.log(`~ services/${row.id}: ${doc.startingAt}  ->  ${ds.startingAt}`);
  doc.startingAt = ds.startingAt;
  if (APPLY) {
    await run("UPDATE content SET data = ?, updated_at = datetime('now') WHERE collection = 'services' AND id = ?", [
      JSON.stringify({ ...doc, id: row.id }),
      row.id,
    ]);
    writes++;
  }
}

/* ---- advanced settings: estimator + budgetRanges -------------------- */
const advRow = await get<{ value: string }>("SELECT value FROM settings WHERE key = 'advanced'");
if (advRow) {
  const adv = JSON.parse(advRow.value) as Record<string, unknown>;
  adv.estimator = def.advanced.estimator; // bases, extras, multipliers, rush
  adv.budgetRanges = def.advanced.budgetRanges;
  adv.budgetUnsure = def.advanced.budgetUnsure;
  console.log(`~ settings/advanced: estimator bases + extras + budgetRanges reset to the new band`);
  if (APPLY) {
    await run(
      `INSERT INTO settings (key, value, updated_at) VALUES ('advanced', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      [JSON.stringify(adv)],
    );
    writes++;
  }
} else {
  console.log(`= settings/advanced: none stored — the site already uses the new code defaults`);
}

console.log(`\n${APPLY ? `Done — ${writes} record(s) updated.` : "Dry run complete. Re-run with --apply to write."}`);
process.exit(0);
