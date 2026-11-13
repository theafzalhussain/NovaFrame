/**
 * WebXstudio — SQLite / libSQL data layer
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

/**
 * Local file backend. The studio was renamed from Novaframe to WebXstudio, so an
 * existing novaframe.db is still used when there is no webxstudio.db beside it —
 * otherwise the rename would quietly start an empty database and orphan the data.
 */
function localDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  const current = path.join(__dirname, "webxstudio.db");
  const legacy = path.join(__dirname, "novaframe.db");
  return !fs.existsSync(current) && fs.existsSync(legacy) ? legacy : current;
}
const DB_PATH = localDbPath();

/**
 * In production (TURSO_DATABASE_URL set) the client talks to the hosted
 * Turso database. Otherwise it falls back to a local libSQL file so dev
 * and `npm run server` work offline without any Turso credentials.
 */
export const usingTurso = Boolean(process.env.TURSO_DATABASE_URL);

/**
 * Optional embedded replica (`TURSO_EMBEDDED_REPLICA=1`).
 *
 * Normally every read in Turso mode is an HTTP round-trip to the primary. An embedded
 * replica keeps a full local copy of the database on disk: reads are answered from that
 * file in microseconds, while writes still go to the primary and are applied locally too
 * (`readYourWrites`, on by default, so a value can be read back straight after writing).
 *
 * Off by default on purpose. It needs a writable filesystem and it pulls the whole
 * database — including the `media` image blobs — on boot, which costs start-up time and
 * disk. Turn it on when read latency matters more than cold-start time.
 */
const replicaEnabled = usingTurso && /^(1|true|yes)$/i.test(process.env.TURSO_EMBEDDED_REPLICA ?? "");
const REPLICA_PATH = process.env.TURSO_REPLICA_PATH || path.join(__dirname, "turso-replica.db");
/** Seconds between background pulls from the primary (picks up edits made elsewhere). */
const SYNC_INTERVAL = Math.max(1, Number(process.env.TURSO_SYNC_INTERVAL || 60));

if (!usingTurso) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} else if (replicaEnabled) {
  fs.mkdirSync(path.dirname(REPLICA_PATH), { recursive: true });
}

export const db: Client = usingTurso
  ? replicaEnabled
    ? createClient({
        url: `file:${REPLICA_PATH}`,
        syncUrl: process.env.TURSO_DATABASE_URL as string,
        authToken: process.env.TURSO_AUTH_TOKEN,
        syncInterval: SYNC_INTERVAL,
        readYourWrites: true,
      })
    : createClient({ url: process.env.TURSO_DATABASE_URL as string, authToken: process.env.TURSO_AUTH_TOKEN })
  : createClient({ url: `file:${DB_PATH}` });

/** How the data layer is wired, for /api/health and the boot banner. */
export const dbBackend = usingTurso ? (replicaEnabled ? "turso+replica" : "turso") : "sqlite";

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

/* ------------------------------------------------------------------ */
/* Write tracking                                                     */
/* ------------------------------------------------------------------ */
/**
 * Counter bumped whenever a statement writes to the two tables the public site
 * reads from. `server/content.ts` caches the assembled site content in memory and
 * uses this to notice its copy is stale the instant the admin saves something,
 * without having to ask the database on every request.
 */
let revision = 0;
const WRITES_PUBLIC_DATA = /\b(?:INSERT|UPDATE|DELETE|REPLACE)\b[\s\S]{0,200}?\b(?:content|settings)\b/i;

/** Monotonic counter of writes to `content` / `settings` made by this process. */
export const dataRevision = () => revision;

function noteWrite(sql: string) {
  if (WRITES_PUBLIC_DATA.test(sql)) revision++;
}

/** INSERT/UPDATE/DELETE. Returns affected-row count and the new rowid. */
export async function run(sql: string, args?: Args): Promise<RunResult> {
  const rs = await db.execute(args === undefined ? sql : { sql, args });
  noteWrite(sql);
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
  noteWrite(sql);
}

/**
 * Atomic batch of writes. Each statement is `[sql, args?]` or a plain SQL
 * string. Wrapped in a write transaction — all apply or none do. A failing
 * statement (e.g. a UNIQUE violation) rejects the returned promise.
 */
export async function tx(statements: Array<[string, Args?] | string>): Promise<void> {
  await db.batch(statements, "write");
  for (const statement of statements) noteWrite(typeof statement === "string" ? statement : statement[0]);
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

/* ------------------------------------------------------------------ */
/* Student Partner & Campus Ambassador program                        */
/* ------------------------------------------------------------------ */
/**
 * Money is integer paise. A partner's wallet is never stored as an editable
 * number: it is computed from `partner_commissions` (credits, created only
 * from verified client payments) minus `partner_payouts` (debits). Triggers
 * below make both tables tamper-resistant at the database level.
 */
const PARTNER_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS partners (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_code        TEXT NOT NULL UNIQUE,
    referral_code       TEXT NOT NULL UNIQUE,
    full_name           TEXT NOT NULL,
    email               TEXT NOT NULL UNIQUE,
    phone               TEXT NOT NULL,
    password_hash       TEXT NOT NULL,
    salt                TEXT NOT NULL,
    college             TEXT NOT NULL,
    course              TEXT,
    graduation_year     INTEGER,
    city                TEXT,
    region              TEXT NOT NULL,
    upi_id              TEXT,
    bank_account_name   TEXT,
    bank_account_number TEXT,
    bank_ifsc           TEXT,
    pan                 TEXT,
    tier                TEXT NOT NULL DEFAULT 'partner' CHECK (tier IN ('partner','ambassador')),
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    suspended_reason    TEXT,
    suspended_at        TEXT,
    show_on_leaderboard INTEGER NOT NULL DEFAULT 1,
    flags               TEXT,
    admin_notes         TEXT,
    signup_ip           TEXT,
    signup_ua           TEXT,
    last_login_at       TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS partner_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash   TEXT NOT NULL UNIQUE,
    partner_id   INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    ip_address   TEXT,
    user_agent   TEXT,
    expires_at   TEXT NOT NULL,
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ambassador_applications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id    INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    college       TEXT NOT NULL,
    year_of_study TEXT NOT NULL,
    motivation    TEXT NOT NULL,
    reach         TEXT NOT NULL,
    social_links  TEXT,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    review_note   TEXT,
    reviewed_by   TEXT,
    reviewed_at   TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* Payments received from clients. Only 'verified' rows earn commission. */
  CREATE TABLE IF NOT EXISTS client_payments (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    reference         TEXT NOT NULL UNIQUE,
    enquiry_id        INTEGER REFERENCES enquiries(id) ON DELETE SET NULL,
    partner_id        INTEGER REFERENCES partners(id),
    client_name       TEXT NOT NULL,
    client_email      TEXT,
    amount_paise      INTEGER NOT NULL CHECK (amount_paise > 0),
    currency          TEXT NOT NULL DEFAULT 'INR',
    installment_label TEXT,
    method            TEXT,
    external_ref      TEXT,
    paid_on           TEXT,
    source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','razorpay')),
    payment_id        INTEGER UNIQUE REFERENCES payments(id),
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','refunded')),
    recorded_by_id    INTEGER,
    recorded_by       TEXT,
    verified_by       TEXT,
    verified_at       TEXT,
    notes             TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* Wallet credits — one per verified client payment, never edited, only reversed. */
  CREATE TABLE IF NOT EXISTS partner_commissions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id        INTEGER NOT NULL REFERENCES partners(id),
    client_payment_id INTEGER NOT NULL UNIQUE REFERENCES client_payments(id),
    enquiry_id        INTEGER,
    base_paise        INTEGER NOT NULL CHECK (base_paise > 0),
    rate_bps          INTEGER NOT NULL CHECK (rate_bps > 0 AND rate_bps <= 5000),
    amount_paise      INTEGER NOT NULL CHECK (amount_paise >= 0),
    status            TEXT NOT NULL DEFAULT 'earned' CHECK (status IN ('earned','reversed')),
    available_at      TEXT NOT NULL,
    reversed_reason   TEXT,
    reversed_by       TEXT,
    reversed_at       TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* Wallet debits — withdrawal requests and their settlement. */
  CREATE TABLE IF NOT EXISTS partner_payouts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    reference    TEXT NOT NULL UNIQUE,
    partner_id   INTEGER NOT NULL REFERENCES partners(id),
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    method       TEXT NOT NULL CHECK (method IN ('upi','bank')),
    destination  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','paid','rejected')),
    utr          TEXT,
    note         TEXT,
    processed_by TEXT,
    processed_at TEXT,
    requested_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

/** One statement each: trigger bodies contain semicolons, so they never go through executeMultiple. */
const PARTNER_TRIGGERS = [
  `CREATE TRIGGER IF NOT EXISTS trg_commission_locked
   BEFORE UPDATE OF partner_id, client_payment_id, enquiry_id, base_paise, rate_bps, amount_paise, available_at, created_at ON partner_commissions
   BEGIN SELECT RAISE(ABORT, 'Commission amounts are immutable'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_commission_final
   BEFORE UPDATE OF status ON partner_commissions WHEN OLD.status = 'reversed'
   BEGIN SELECT RAISE(ABORT, 'A reversed commission cannot be restored'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_commission_no_delete
   BEFORE DELETE ON partner_commissions
   BEGIN SELECT RAISE(ABORT, 'Commissions cannot be deleted - reverse them instead'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_payout_locked
   BEFORE UPDATE OF partner_id, amount_paise, method, destination, requested_at ON partner_payouts
   BEGIN SELECT RAISE(ABORT, 'Payout amounts are immutable'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_payout_final
   BEFORE UPDATE OF status ON partner_payouts WHEN OLD.status IN ('paid','rejected')
   BEGIN SELECT RAISE(ABORT, 'This payout is already settled'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_payout_no_delete
   BEFORE DELETE ON partner_payouts
   BEGIN SELECT RAISE(ABORT, 'Payouts cannot be deleted'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_client_payment_locked
   BEFORE UPDATE OF amount_paise, partner_id ON client_payments WHEN OLD.status != 'pending'
   BEGIN SELECT RAISE(ABORT, 'Only pending payments can be edited'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_client_payment_no_delete
   BEFORE DELETE ON client_payments WHEN OLD.status IN ('verified','refunded')
   BEGIN SELECT RAISE(ABORT, 'Verified payments cannot be deleted - refund them instead'); END`,
];

const PARTNER_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_enquiries_partner     ON enquiries(partner_id);
  CREATE INDEX IF NOT EXISTS idx_enquiries_email       ON enquiries(email);
  CREATE INDEX IF NOT EXISTS idx_partners_college      ON partners(college);
  CREATE INDEX IF NOT EXISTS idx_partners_region       ON partners(region);
  CREATE INDEX IF NOT EXISTS idx_partners_status       ON partners(status, tier);
  CREATE INDEX IF NOT EXISTS idx_partner_sessions      ON partner_sessions(partner_id);
  CREATE INDEX IF NOT EXISTS idx_amb_apps_partner      ON ambassador_applications(partner_id, status);
  CREATE INDEX IF NOT EXISTS idx_client_payments_enq   ON client_payments(enquiry_id);
  CREATE INDEX IF NOT EXISTS idx_client_payments_partner ON client_payments(partner_id, status);
  CREATE INDEX IF NOT EXISTS idx_commissions_partner   ON partner_commissions(partner_id, status);
  CREATE INDEX IF NOT EXISTS idx_commissions_enquiry   ON partner_commissions(enquiry_id);
  CREATE INDEX IF NOT EXISTS idx_payouts_partner       ON partner_payouts(partner_id, status);
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
  /* Covering index for the published-content listing every page load depends on:
     it carries the ORDER BY tiebreak and the row payload, so the query is answered
     from the index alone — no table lookups and no sort step. */
  CREATE INDEX IF NOT EXISTS idx_content_published ON content(collection, published, sort_order, created_at, id, data, updated_at);
  CREATE INDEX IF NOT EXISTS idx_content_updated   ON content(updated_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_user     ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON sessions(expires_at);
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

/* ------------------------------------------------------------------ */
/* One-time rebrand: Novaframe Studio → WebXstudio                    */
/* ------------------------------------------------------------------ */
/**
 * Site settings and every editorial collection live in this database, so renaming
 * the studio in the source alone would leave the old name on any database that has
 * already been seeded or edited in the admin console.
 *
 * This rewrites the name inside those two tables only: admin edits are preserved,
 * and customer records (leads, bookings, payments, partners) are never touched.
 * Runs once per database, tracked by a marker row.
 */
const BRAND_MARKER = "rebrand_webxstudio";

/** Nested SQL replace() over a column. Longest tokens first, so "Novaframe Studio" never becomes "WebXstudio Studio". */
function swapBrand(column: string) {
  const tokens: [string, string][] = [
    ["novaframe.studio", "webxstudio.me"],
    ["Novaframe Studio", "WebXstudio"],
    ["NOVAFRAME STUDIO", "WEBXSTUDIO"],
    ["Novaframe", "WebXstudio"],
    ["NOVAFRAME", "WEBXSTUDIO"],
    ["novaframe", "webxstudio"],
  ];
  // Fixed literals, so there is nothing here to parameterise or escape.
  return tokens.reduce((sql, [from, to]) => `replace(${sql}, '${from}', '${to}')`, column);
}

async function renameBrand(): Promise<void> {
  if (await get("SELECT 1 AS x FROM settings WHERE key = ?", [BRAND_MARKER])) return;
  // '%ovaframe%' matches either capitalisation, so nothing is missed.
  const content = await run(`UPDATE content SET data = ${swapBrand("data")}, updated_at = datetime('now') WHERE data LIKE '%ovaframe%'`);
  const settings = await run(
    `UPDATE settings SET value = ${swapBrand("value")}, updated_at = datetime('now')
     WHERE key IN ('site', 'advanced') AND value LIKE '%ovaframe%'`,
  );
  await run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [BRAND_MARKER, JSON.stringify({ at: new Date().toISOString(), content: content.changes, settings: settings.changes })],
  );
  if (content.changes || settings.changes) {
    console.log(`[brand] Renamed to WebXstudio in ${content.changes} content entries and ${settings.changes} settings documents.`);
  }
}

let purgeTimer: ReturnType<typeof setInterval> | null = null;

export async function initDb(): Promise<void> {
  // Turso's hosted protocol rejects write pragmas and manages journal + synchronous
  // modes itself, so these only apply to a local file (development, and the embedded
  // replica's local copy). They are the standard read-heavy SQLite settings:
  //   WAL           — readers never block on the writer
  //   NORMAL        — one fsync per checkpoint instead of per commit
  //   cache_size    — 64 MB of page cache (negative value = KiB), so hot pages stay in RAM
  //   mmap_size     — read pages straight from the page cache, skipping a copy
  //   temp_store    — sorts and temp B-trees stay in memory
  //   busy_timeout  — wait for a lock instead of failing instantly under concurrency
  if (!usingTurso) {
    for (const pragma of [
      "PRAGMA journal_mode = WAL",
      "PRAGMA synchronous = NORMAL",
      "PRAGMA foreign_keys = ON",
      "PRAGMA cache_size = -65536",
      "PRAGMA mmap_size = 268435456",
      "PRAGMA temp_store = MEMORY",
      "PRAGMA busy_timeout = 5000",
    ]) {
      try {
        await db.execute(pragma);
      } catch (err) {
        console.warn(`[db] ${pragma} not applied:`, (err as Error).message);
      }
    }
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

  // Partner program. The enquiry columns are added after the rebuild above so it can't drop them.
  await exec(PARTNER_SCHEMA_SQL);
  await addColumn("enquiries", "partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL");
  await addColumn("enquiries", "referral_code TEXT");
  for (const trigger of PARTNER_TRIGGERS) await db.execute(trigger);
  await exec(PARTNER_INDEX_SQL);

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
  await renameBrand();

  /* ---- Owner-account bootstrap ---- */
  const adminCount = (await get<{ c: number }>("SELECT count(*) AS c FROM admin_users"))?.c ?? 0;
  if (adminCount === 0) {
    // `||` (not `??`) so blank lines copied from .env.example fall back correctly.
    const email = (process.env.ADMIN_EMAIL || "admin@webxstudio.me").toLowerCase().trim();
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
  await run("DELETE FROM partner_sessions WHERE datetime(expires_at) <= datetime('now')");
}
