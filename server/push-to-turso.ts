/**
 * One-time data copy: local SQLite file  ->  hosted Turso database.
 *
 *   npm run turso:push                 (uses server/novaframe.db)
 *   npm run turso:push -- --from=path/to/other.db
 *
 * Requires TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) in .env or the shell.
 * Safe to re-run: rows are written with INSERT OR REPLACE, so the Turso
 * copy ends up matching the local file. Nothing is deleted from Turso and
 * the local file is only read, never modified.
 */
import "./env.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type InValue } from "@libsql/client";
import { db, initDb, usingTurso } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name: string) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

if (!usingTurso) {
  console.error(
    "\n  TURSO_DATABASE_URL is not set, so there is no remote database to push to.\n" +
      "  Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to your .env first.\n",
  );
  process.exit(1);
}

const sourcePath = path.resolve(arg("from") ?? path.join(__dirname, "novaframe.db"));
if (!fs.existsSync(sourcePath)) {
  console.error(`\n  Source database not found: ${sourcePath}\n`);
  process.exit(1);
}

/** Tables copied, parents before children. `sessions` is deliberately skipped. */
const TABLES = [
  "settings",
  "content",
  "admin_users",
  "enquiries",
  "enquiry_notes",
  "bookings",
  "subscribers",
  "payments",
  "events",
  "audit_logs",
] as const;

const local = createClient({ url: `file:${sourcePath}` });

/**
 * Column names of a table. Uses an empty SELECT rather than
 * `PRAGMA table_info`, because the hosted libSQL protocol restricts pragmas.
 */
async function columnsOf(client: typeof local, table: string): Promise<string[]> {
  const rs = await client.execute(`SELECT * FROM ${table} LIMIT 0`);
  return [...rs.columns];
}

async function tableExists(client: typeof local, table: string): Promise<boolean> {
  const rs = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [table],
  });
  return rs.rows.length > 0;
}

console.log(`\n  Source: ${sourcePath}`);
console.log(`  Target: ${process.env.TURSO_DATABASE_URL}\n`);

// Make sure the remote schema exists (and is migrated) before copying.
await initDb();

let totalRows = 0;
for (const table of TABLES) {
  if (!(await tableExists(local, table))) {
    console.log(`  - ${table.padEnd(14)} skipped (not in source)`);
    continue;
  }

  const localCols = await columnsOf(local, table);
  const remoteCols = new Set(await columnsOf(db, table));
  const cols = localCols.filter((c) => remoteCols.has(c));
  if (cols.length === 0) {
    console.log(`  - ${table.padEnd(14)} skipped (no matching columns)`);
    continue;
  }

  const rs = await local.execute(`SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM ${table}`);
  if (rs.rows.length === 0) {
    console.log(`  - ${table.padEnd(14)} 0 rows`);
    continue;
  }

  const sql = `INSERT OR REPLACE INTO ${table} (${cols.map((c) => `"${c}"`).join(", ")})
               VALUES (${cols.map(() => "?").join(", ")})`;
  const statements = rs.rows.map((row) => {
    const record = row as unknown as Record<string, InValue>;
    return { sql, args: cols.map((c) => record[c] ?? null) };
  });

  // Chunked batches keep each request small on slow connections.
  const CHUNK = 100;
  for (let i = 0; i < statements.length; i += CHUNK) {
    await db.batch(statements.slice(i, i + CHUNK), "write");
  }
  totalRows += rs.rows.length;
  console.log(`  + ${table.padEnd(14)} ${rs.rows.length} rows copied`);
}

const { rows } = await db.execute("SELECT count(*) AS c FROM content");
console.log(`\n  Done. ${totalRows} rows pushed. Turso now holds ${(rows[0] as unknown as { c: number }).c} content items.`);
console.log("  Your local file was not modified.\n");
process.exit(0);
