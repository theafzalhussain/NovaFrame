/**
 * Novaframe Studio — SQLite data layer
 * ------------------------------------
 * Relational tables for transactional data (leads, bookings, users,
 * sessions, audit, analytics) and a document table for editorial
 * content (every CMS collection) plus a key/value settings table.
 */
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTION_NAMES, type CollectionName } from "../src/data/types.js";
import { defaultContent } from "../src/data/defaults.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "novaframe.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

/** Day buckets for charts use the studio's offset (IST by default). */
export const TZ_OFFSET_MINUTES = Number(process.env.TZ_OFFSET_MINUTES || 330);
export const TZ_MOD = `${TZ_OFFSET_MINUTES >= 0 ? "+" : ""}${TZ_OFFSET_MINUTES} minutes`;

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

db.exec(`
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
`);

/* ------------------------------------------------------------------ */
/* Migrations for databases created by earlier versions               */
/* ------------------------------------------------------------------ */
function addColumn(table: string, ddl: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  } catch {
    /* column already exists */
  }
}
addColumn("admin_users", "active INTEGER NOT NULL DEFAULT 1");
addColumn("audit_logs", "admin_email TEXT");
for (const ddl of [
  "priority TEXT NOT NULL DEFAULT 'normal'",
  "value_estimate INTEGER",
  "internal_notes TEXT",
  "source TEXT NOT NULL DEFAULT 'website'",
]) {
  addColumn("enquiries", ddl);
}
addColumn("payments", "method TEXT");
addColumn("payments", "paid_at TEXT");

// Older schema restricted statuses without 'lost' — rebuild the table once if needed.
const enquiriesSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='enquiries'").get() as { sql?: string } | undefined)?.sql ?? "";
if (enquiriesSql && !enquiriesSql.includes("'lost'")) {
  db.transaction(() => {
    db.exec(ENQUIRIES_TABLE("enquiries_v2"));
    db.exec(`
      INSERT INTO enquiries_v2 (id, reference, name, company_name, email, phone, service, budget_range, timeline,
        project_details, status, priority, value_estimate, internal_notes, source, ip_address, user_agent, created_at, updated_at)
      SELECT id, reference, name, company_name, email, phone, service, budget_range, timeline,
        project_details, status, coalesce(priority,'normal'), value_estimate, internal_notes, coalesce(source,'website'),
        ip_address, user_agent, created_at, updated_at
      FROM enquiries;
      DROP TABLE enquiries;
      ALTER TABLE enquiries_v2 RENAME TO enquiries;
    `);
  })();
}

db.exec(`
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
`);
db.pragma("user_version = 2");

/* ------------------------------------------------------------------ */
/* Crypto helpers                                                     */
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

const getSettingStmt = db.prepare("SELECT value, updated_at FROM settings WHERE key = ?");
const putSettingStmt = db.prepare(`
  INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
`);

export function readSetting<T>(key: SettingsKey): T | null {
  const row = getSettingStmt.get(key) as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function writeSetting(key: SettingsKey, value: unknown) {
  putSettingStmt.run(key, JSON.stringify(value));
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
  listPublished: db.prepare("SELECT * FROM content WHERE collection = ? AND published = 1 ORDER BY sort_order ASC, created_at ASC"),
  listAll: db.prepare("SELECT * FROM content WHERE collection = ? ORDER BY sort_order ASC, created_at ASC"),
  get: db.prepare("SELECT * FROM content WHERE collection = ? AND id = ?"),
  maxSort: db.prepare("SELECT coalesce(max(sort_order), 0) AS m FROM content WHERE collection = ?"),
  insert: db.prepare(`
    INSERT INTO content (collection, id, data, sort_order, published)
    VALUES (@collection, @id, @data, @sort_order, @published)
  `),
  update: db.prepare(`
    UPDATE content SET data = @data, published = @published, sort_order = @sort_order, updated_at = datetime('now')
    WHERE collection = @collection AND id = @id
  `),
  rename: db.prepare("UPDATE content SET id = ? WHERE collection = ? AND id = ?"),
  remove: db.prepare("DELETE FROM content WHERE collection = ? AND id = ?"),
  clear: db.prepare("DELETE FROM content WHERE collection = ?"),
  setSort: db.prepare("UPDATE content SET sort_order = ?, updated_at = datetime('now') WHERE collection = ? AND id = ?"),
  counts: db.prepare(`
    SELECT collection, sum(published) AS published, count(*) AS total
    FROM content GROUP BY collection
  `),
  lastUpdate: db.prepare(`
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
export function seedCollection(name: CollectionName) {
  const items = defaultContent.collections[name] as unknown as { id: string }[];
  db.transaction(() => {
    contentQ.clear.run(name);
    items.forEach((item, index) => {
      contentQ.insert.run({
        collection: name,
        id: item.id,
        data: JSON.stringify(item),
        sort_order: (index + 1) * 10,
        published: 1,
      });
    });
  })();
}

/* ------------------------------------------------------------------ */
/* First-run seeding                                                  */
/* Each collection is auto-seeded at most once, so deleting every     */
/* entry in a section from the admin doesn't bring defaults back.     */
/* ------------------------------------------------------------------ */
const countCollection = db.prepare("SELECT count(*) AS c FROM content WHERE collection = ?");
const seededRow = getSettingStmt.get("seeded_collections") as { value: string } | undefined;
const seeded = new Set<string>(seededRow ? (JSON.parse(seededRow.value) as string[]) : []);
for (const name of COLLECTION_NAMES) {
  if (seeded.has(name)) continue;
  const { c } = countCollection.get(name) as { c: number };
  if (c === 0) seedCollection(name);
  seeded.add(name);
}
putSettingStmt.run("seeded_collections", JSON.stringify([...seeded]));
if (!readSetting("site")) writeSetting("site", defaultContent.settings);
if (!readSetting("advanced")) writeSetting("advanced", defaultContent.advanced);

const adminCount = (db.prepare("SELECT count(*) AS c FROM admin_users").get() as { c: number }).c;
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
  db.prepare("INSERT INTO admin_users (email, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, 'owner')").run(
    email,
    hash,
    salt,
    process.env.ADMIN_NAME || "Afzal Hussain",
  );
  const line = "-".repeat(58);
  console.log(`\n+${line}+`);
  console.log(`|  Owner account created for the admin console${" ".repeat(13)}|`);
  console.log(`|  Email:    ${email.padEnd(46)}|`);
  console.log(`|  Password: ${(generated ? password : "(from ADMIN_PASSWORD)").padEnd(46)}|`);
  console.log(`|  ${generated ? "Save it now - change it in Admin > Security.".padEnd(56) : " ".repeat(56)}|`);
  console.log(`+${line}+\n`);
}

/* Housekeeping: drop expired sessions on boot and hourly. */
const purgeSessions = db.prepare("DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')");
purgeSessions.run();
setInterval(() => purgeSessions.run(), 60 * 60 * 1000).unref();
