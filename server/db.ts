/**
 * Novaframe Studio — SQLite / libSQL data layer
 * ----------------------------------------------
 * Relational tables for transactional data (leads, bookings, users,
 * sessions, audit, analytics) and a document table for editorial
 * content (every CMS collection) plus a key/value settings table.
 *
 * Uses @libsql/client so the same code runs against a local SQLite
 * file in development and a hosted Turso database in production.
 * Every query is asynchronous and must be awaited.
 */
import { createClient, type Client, type InArgs } from "@libsql/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTION_NAMES, type CollectionName } from "../src/data/types.js";
import { defaultContent } from "../src/data/defaults.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "novaframe.db");

/**
 * In production (TURSO_DATABASE_URL set) the client talks to the hosted
 * Turso database. Otherwise it falls back to a local libSQL file so dev
 * and `npm run server` work offline without any Turso credentials.
 */
export const usingTurso = Boolean(process.env.TURSO_DATABASE_URL);
if (!usingTurso) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

export const db: Client = usingTurso
  ? createClient({ url: process.env.TURSO_DATABASE_URL as string, authToken: process.env.TURSO_AUTH_TOKEN })
  : createClient({ url: `file:${DB_PATH}` });

/** Day buckets for charts use the studio's offset (IST by default). */
export const TZ_OFFSET_MINUTES = Number(process.env.TZ_OFFSET_MINUTES || 330);
export const TZ_MOD = `${TZ_OFFSET_MINUTES >= 0 ? "+" : ""}${TZ_OFFSET_MINUTES} minutes`;

/* ------------------------------------------------------------------ */
/* Async query wrapper                                                */
/* ------------------------------------------------------------------ */
/**
 * Args may be a positional array (for `?` placeholders) or a named object
 * (for `@name` / `:name` / `$name` placeholders — libSQL strips the sigil).
 */
export type Args = InArgs;

/** Result of a write, shaped like better-sqlite3's `RunResult`. */
export type RunResult = { changes: number; lastInsertRowid: number };

/** INSERT/UPDATE/DELETE. Returns affected-row count and the new rowid. */
export async function run(sql: string, args?: Args): Promise<RunResult> {
  const rs = await db.execute(args === undefined ? sql : { sql, args });
  return {
    changes: rs.rowsAffected,
    lastInsertRowid: rs.lastInsertRowid === undefined ? 0 : Number(rs.lastInsertRowid),
  };
}

/** First matching row, or undefined. libSQL rows expose named columns. */
export async function get<T>(sql: string, args?: Args): Promise<T | undefined> {
  const rs = await db.execute(args === undefined ? sql : { sql, args });
  return (rs.rows[0] as T | undefined) ?? undefined;
}

/** All matching rows. */
export async function all<T>(sql: string, args?: Args): Promise<T[]> {
  const rs = await db.execute(args === undefined ? sql : { sql, args });
  return rs.rows as unknown as T[];
}

/** Run a multi-statement SQL script (schema, migrations). */
export async function exec(sql: string): Promise<void> {
  await db.executeMultiple(sql);
}

/**
 * Atomic batch of writes. Each statement is `[sql, args?]` or a plain SQL
 * string. Wrapped in a write transaction — all apply or none do. A failing
 * statement (e.g. a UNIQUE violation) rejects the returned promise.
 */
export async function tx(statements: Array<[string, Args?] | string>): Promise<void> {
  await db.batch(statements, "write");
}

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */
const ENQUIRIES_TABLE = (name: string) => `
  CREATE TABLE IF NOT EXISTS ${name} (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    reference       TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    company_name    TEXT,
    email           TEXT NOT NULL,
    phone           TEXT,
    service         TEXT NOT NULL,
    budget_range    TEXT NOT NULL,
    timeline        TEXT,
    project_details TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','contacted','qualified','proposal','won','lost','archived')),
    priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
    value_estimate  INTEGER,
    internal_notes  TEXT,
    source          TEXT NOT NULL DEFAULT 'website',
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );`;

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'owner',
    last_login_at TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash   TEXT NOT NULL UNIQUE,
    user_id      INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    ip_address   TEXT,
    user_agent   TEXT,
    expires_at   TEXT NOT NULL,
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  ${ENQUIRIES_TABLE("enquiries")}

  CREATE TABLE IF NOT EXISTS enquiry_notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    enquiry_id  INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    admin_id    INTEGER,
    admin_name  TEXT,
    kind        TEXT NOT NULL DEFAULT 'note',
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    reference      TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL,
    phone          TEXT,
    company_name   TEXT,
    topic          TEXT NOT NULL,
    budget_range   TEXT,
    notes          TEXT,
    slot_date      TEXT NOT NULL,
    slot_time      TEXT NOT NULL,
    timezone       TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    status         TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
    meeting_link   TEXT,
    internal_notes TEXT,
    enquiry_id     INTEGER REFERENCES enquiries(id) ON DELETE SET NULL,
    ip_address     TEXT,
    user_agent     TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL UNIQUE,
    source     TEXT DEFAULT 'footer',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    reference          TEXT NOT NULL UNIQUE,
    razorpay_order_id  TEXT NOT NULL UNIQUE,
    razorpay_payment_id TEXT,
    name               TEXT NOT NULL,
    email              TEXT NOT NULL,
    phone              TEXT,
    company_name       TEXT,
    purpose            TEXT NOT NULL,
    amount             INTEGER NOT NULL,
    currency           TEXT NOT NULL DEFAULT 'INR',
    status             TEXT NOT NULL DEFAULT 'created'
                       CHECK (status IN ('created','paid','failed')),
    method             TEXT,
    paid_at            TEXT,
    enquiry_id         INTEGER REFERENCES enquiries(id) ON DELETE SET NULL,
    ip_address         TEXT,
    user_agent         TEXT,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    path       TEXT,
    session_id TEXT,
    referrer   TEXT,
    meta       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id   INTEGER,
    action     TEXT NOT NULL,
    target     TEXT,
    details    TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS content (
    collection TEXT NOT NULL,
    id         TEXT NOT NULL,
    data       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    published  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (collection, id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* Images uploaded from the admin console. Kept in the database so they
     survive a redeploy on hosts with an ephemeral filesystem (Render). */
  CREATE TABLE IF NOT EXISTS media (
    id          TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    bytes       INTEGER NOT NULL,
    data        BLOB NOT NULL,
    uploaded_by TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_enquiries_status  ON enquiries(status);
  CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at);
  CREATE INDEX IF NOT EXISTS idx_notes_enquiry     ON enquiry_notes(enquiry_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_bookings_slot     ON bookings(slot_date, slot_time);
  CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
    ON bookings(slot_date, slot_time) WHERE status IN ('scheduled','confirmed');
  CREATE INDEX IF NOT EXISTS idx_events_name_time  ON events(name, created_at);
  CREATE INDEX IF NOT EXISTS idx_events_time       ON events(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_time        ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_content_listing   ON content(collection, published, sort_order);
  CREATE INDEX IF NOT EXISTS idx_sessions_user     ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_payments_status   ON payments(status);
  CREATE INDEX IF NOT EXISTS idx_payments_created  ON payments(created_at);
`;

/* ------------------------------------------------------------------ */
/* Migrations for databases created by earlier versions               */
/* ------------------------------------------------------------------ */
async function addColumn(table: string, ddl: string) {
  try {
    await exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  } catch {
    /* column already exists */
  }
}

/* ------------------------------------------------------------------ */
/* Crypto helpers (pure — stay synchronous)                           */
/* ------------------------------------------------------------------ */
const PBKDF2_ITERATIONS = 100_000;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, "sha512").toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string) {
  const calculated = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, "sha512");
  const stored = Buffer.from(hash, "hex");
  return stored.length === calculated.length && crypto.timingSafeEqual(calculated, stored);
}

/** Sessions store only a SHA-256 of the bearer token. */
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newReference(prefix: string) {
  return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

/* ------------------------------------------------------------------ */
/* Settings + content documents                                       */
/* ------------------------------------------------------------------ */
export type SettingsKey = "site" | "advanced";

export async function readSetting<T>(key: SettingsKey): Promise<T | null> {
  const row = await get<{ value: string }>("SELECT value, updated_at FROM settings WHERE key = ?", [key]);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function writeSetting(key: SettingsKey, value: unknown): Promise<void> {
  await run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, JSON.stringify(value)],
  );
}

export type ContentRow = {
  collection: string;
  id: string;
  data: string;
  sort_order: number;
  published: number;
  created_at: string;
  updated_at: string;
};

export const contentQ = {
  listPublished: (collection: string) =>
    all<ContentRow>(
      "SELECT * FROM content WHERE collection = ? AND published = 1 ORDER BY sort_order ASC, created_at ASC",
      [collection],
    ),
  listAll: (collection: string) =>
    all<ContentRow>("SELECT * FROM content WHERE collection = ? ORDER BY sort_order ASC, created_at ASC", [collection]),
  get: (collection: string, id: string) =>
    get<ContentRow>("SELECT * FROM content WHERE collection = ? AND id = ?", [collection, id]),
  maxSort: (collection: string) =>
    get<{ m: number }>("SELECT coalesce(max(sort_order), 0) AS m FROM content WHERE collection = ?", [collection]),
  insert: (args: { collection: string; id: string; data: string; sort_order: number; published: number }) =>
    run(
      `INSERT INTO content (collection, id, data, sort_order, published)
       VALUES (@collection, @id, @data, @sort_order, @published)`,
      args,
    ),
  update: (args: { collection: string; id: string; data: string; published: number; sort_order: number }) =>
    run(
      `UPDATE content SET data = @data, published = @published, sort_order = @sort_order, updated_at = datetime('now')
       WHERE collection = @collection AND id = @id`,
      args,
    ),
  rename: (newId: string, collection: string, currentId: string) =>
    run("UPDATE content SET id = ? WHERE collection = ? AND id = ?", [newId, collection, currentId]),
  remove: (collection: string, id: string) => run("DELETE FROM content WHERE collection = ? AND id = ?", [collection, id]),
  clear: (collection: string) => run("DELETE FROM content WHERE collection = ?", [collection]),
  setSort: (sortOrder: number, collection: string, id: string) =>
    run("UPDATE content SET sort_order = ?, updated_at = datetime('now') WHERE collection = ? AND id = ?", [
      sortOrder,
      collection,
      id,
    ]),
  counts: () =>
    all<{ collection: string; published: number; total: number }>(
      `SELECT collection, sum(published) AS published, count(*) AS total FROM content GROUP BY collection`,
    ),
  lastUpdate: () =>
    get<{ t: string | null }>(`
      SELECT max(t) AS t FROM (
        SELECT max(updated_at) AS t FROM content
        UNION ALL SELECT max(updated_at) FROM settings
      )
    `),
};

export function isCollection(name: string): name is CollectionName {
  return (COLLECTION_NAMES as string[]).includes(name);
}

export function parseRow(row: ContentRow) {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(row.data);
  } catch {
    /* keep empty */
  }
  return {
    id: row.id,
    data: { ...data, id: row.id },
    published: row.published === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Replace a collection with its shipped defaults. */
export async function seedCollection(name: CollectionName): Promise<void> {
  const items = defaultContent.collections[name] as unknown as { id: string }[];
  const statements: Array<[string, Args?]> = [["DELETE FROM content WHERE collection = ?", [name]]];
  items.forEach((item, index) => {
    statements.push([
      `INSERT INTO content (collection, id, data, sort_order, published)
       VALUES (@collection, @id, @data, @sort_order, @published)`,
      {
        collection: name,
        id: item.id,
        data: JSON.stringify(item),
        sort_order: (index + 1) * 10,
        published: 1,
      },
    ]);
  });
  await tx(statements);
}

/* ------------------------------------------------------------------ */
/* Initialisation — schema, migrations, first-run seeding             */
/* Must be awaited before the API serves requests or a CLI uses db.   */
/* ------------------------------------------------------------------ */

/**
 * Default entries that must reach databases which are ALREADY populated.
 * (Seeding above only runs on an empty collection, so a new default would
 * never appear on a live site.) Each id is offered exactly once per
 * database: it is inserted only if missing, appended after the existing
 * entries, and never touched again — so admin edits survive every deploy,
 * and an entry deleted in the admin stays deleted.
 *
 * To ship another default team member: add it to `team` in src/data/content.ts
 * and append its id here.
 */
export const DEFAULT_TOP_UPS: Partial<Record<CollectionName, string[]>> = {
  team: ["vijay", "om-gupta"],
};

export async function topUpDefaults(): Promise<string[]> {
  const row = await get<{ value: string }>("SELECT value FROM settings WHERE key = ?", ["seeded_items"]);
  const offered: Record<string, string[]> = row ? (JSON.parse(row.value) as Record<string, string[]>) : {};
  const added: string[] = [];
  let changed = false;

  for (const [name, ids] of Object.entries(DEFAULT_TOP_UPS) as [CollectionName, string[]][]) {
    const done = new Set(offered[name] ?? []);
    const defaults = defaultContent.collections[name] as unknown as { id: string }[];
    for (const id of ids) {
      if (done.has(id)) continue;
      const item = defaults.find((d) => d.id === id);
      if (!item) continue;
      const exists = await get<{ x: number }>("SELECT 1 AS x FROM content WHERE collection = ? AND id = ?", [name, id]);
      if (!exists) {
        const top = await get<{ m: number }>("SELECT COALESCE(MAX(sort_order), 0) AS m FROM content WHERE collection = ?", [name]);
        await run("INSERT OR IGNORE INTO content (collection, id, data, sort_order, published) VALUES (?, ?, ?, ?, 1)", [
          name,
          id,
          JSON.stringify(item),
          Number(top?.m ?? 0) + 10,
        ]);
        added.push(`${name}/${id}`);
      }
      done.add(id);
      offered[name] = [...done];
      changed = true;
    }
  }

  if (changed) {
    await run(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      ["seeded_items", JSON.stringify(offered)],
    );
  }
  return added;
}
let purgeTimer: ReturnType<typeof setInterval> | null = null;

export async function initDb(): Promise<void> {
  // libSQL/Turso manage journal + synchronous modes themselves; only the
  // local file backend benefits from (and supports) a foreign-keys pragma.
  if (!usingTurso) {
    await db.execute("PRAGMA foreign_keys = ON");
  }

  await exec(SCHEMA_SQL);

  // Column migrations for databases created by earlier versions.
  await addColumn("admin_users", "active INTEGER NOT NULL DEFAULT 1");
  await addColumn("audit_logs", "admin_email TEXT");
  for (const ddl of [
    "priority TEXT NOT NULL DEFAULT 'normal'",
    "value_estimate INTEGER",
    "internal_notes TEXT",
    "source TEXT NOT NULL DEFAULT 'website'",
  ]) {
    await addColumn("enquiries", ddl);
  }
  await addColumn("payments", "method TEXT");
  await addColumn("payments", "paid_at TEXT");

  // Older schema restricted statuses without 'lost' — rebuild the table once if needed.
  const enquiriesSql =
    (await get<{ sql?: string }>("SELECT sql FROM sqlite_master WHERE type='table' AND name='enquiries'"))?.sql ?? "";
  if (enquiriesSql && !enquiriesSql.includes("'lost'")) {
    await exec(`
      ${ENQUIRIES_TABLE("enquiries_v2")}
      INSERT INTO enquiries_v2 (id, reference, name, company_name, email, phone, service, budget_range, timeline,
        project_details, status, priority, value_estimate, internal_notes, source, ip_address, user_agent, created_at, updated_at)
      SELECT id, reference, name, company_name, email, phone, service, budget_range, timeline,
        project_details, status, coalesce(priority,'normal'), value_estimate, internal_notes, coalesce(source,'website'),
        ip_address, user_agent, created_at, updated_at
      FROM enquiries;
      DROP TABLE enquiries;
      ALTER TABLE enquiries_v2 RENAME TO enquiries;
    `);
  }

  await exec(INDEX_SQL);
  // Only a marker, never read back — and the hosted libSQL protocol rejects
  // write pragmas, so it is set on the local file backend only.
  if (!usingTurso) await run("PRAGMA user_version = 2");

  /* ---- First-run seeding (each collection auto-seeded at most once) ---- */
  const seededRow = await get<{ value: string }>("SELECT value, updated_at FROM settings WHERE key = ?", [
    "seeded_collections",
  ]);
  const seeded = new Set<string>(seededRow ? (JSON.parse(seededRow.value) as string[]) : []);
  for (const name of COLLECTION_NAMES) {
    if (seeded.has(name)) continue;
    const { c } = (await get<{ c: number }>("SELECT count(*) AS c FROM content WHERE collection = ?", [name])) ?? { c: 0 };
    if (c === 0) await seedCollection(name);
    seeded.add(name);
  }
  await run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    ["seeded_collections", JSON.stringify([...seeded])],
  );
  await topUpDefaults();
  if (!(await readSetting("site"))) await writeSetting("site", defaultContent.settings);
  if (!(await readSetting("advanced"))) await writeSetting("advanced", defaultContent.advanced);

  /* ---- Owner-account bootstrap ---- */
  const adminCount = (await get<{ c: number }>("SELECT count(*) AS c FROM admin_users"))?.c ?? 0;
  if (adminCount === 0) {
    // `||` (not `??`) so blank lines copied from .env.example fall back correctly.
    const email = (process.env.ADMIN_EMAIL || "admin@novaframe.studio").toLowerCase().trim();
    const fromEnv = process.env.ADMIN_PASSWORD ?? "";
    if (fromEnv && fromEnv.length < 10) {
      console.warn("[admin] ADMIN_PASSWORD is shorter than 10 characters - a strong password was generated instead.");
    }
    const generated = fromEnv.length < 10;
    const password = generated ? crypto.randomBytes(9).toString("base64url") : fromEnv;
    const { hash, salt } = hashPassword(password);
    await run("INSERT INTO admin_users (email, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, 'owner')", [
      email,
      hash,
      salt,
      process.env.ADMIN_NAME || "Afzal Hussain",
    ]);
    const line = "-".repeat(58);
    console.log(`\n+${line}+`);
    console.log(`|  Owner account created for the admin console${" ".repeat(13)}|`);
    console.log(`|  Email:    ${email.padEnd(46)}|`);
    console.log(`|  Password: ${(generated ? password : "(from ADMIN_PASSWORD)").padEnd(46)}|`);
    console.log(`|  ${generated ? "Save it now - change it in Admin > Security.".padEnd(56) : " ".repeat(56)}|`);
    console.log(`+${line}+\n`);
  }

  /* ---- Housekeeping: drop expired sessions on boot and hourly. ---- */
  await purgeSessions();
  if (!purgeTimer) {
    purgeTimer = setInterval(() => {
      purgeSessions().catch((err) => console.error("[sessions] purge failed:", (err as Error).message));
    }, 60 * 60 * 1000);
    purgeTimer.unref();
  }
}

async function purgeSessions(): Promise<void> {
  await run("DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')");
}
