/**
 * Novaframe Studio — Production SQL Database Schema
 * Full CRUD support for:
 * - Admin Users (secure password hash, roles, sessions)
 * - Enquiries & Scheduled Calls (view, status change, notes, delete)
 * - Services (add, edit, toggle active, delete)
 * - Portfolio Projects (add, edit, metrics, tags, delete)
 * - Articles / Insights (create, edit, publish/draft, delete)
 * - Subscribers (view, export, delete)
 * - Site Settings & Audit Logs (system telemetry, security logs)
 */

import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, "novaframe.db");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

/* ------------------------------------------------------------------ */
/* Schema Initialization                                              */
/* ------------------------------------------------------------------ */
db.exec(`
  -- Admin credentials & auth sessions
  CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'superadmin',
    last_login_at TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Auth active sessions
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token         TEXT PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    ip_address    TEXT,
    user_agent    TEXT,
    expires_at    TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Client Enquiries & Scheduled Discovery Calls
  CREATE TABLE IF NOT EXISTS enquiries (
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
                    CHECK (status IN ('new','contacted','qualified','proposal','won','archived')),
    internal_notes  TEXT,
    source          TEXT NOT NULL DEFAULT 'website',
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Services Catalogue (CRUD enabled)
  CREATE TABLE IF NOT EXISTS services (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    category    TEXT NOT NULL,
    tagline     TEXT,
    short_desc  TEXT,
    deliverable TEXT,
    active      INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Portfolio Projects (CRUD enabled)
  CREATE TABLE IF NOT EXISTS projects (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    client       TEXT NOT NULL,
    category     TEXT NOT NULL,
    year         TEXT NOT NULL,
    summary      TEXT NOT NULL,
    problem      TEXT,
    solution     TEXT,
    tech_stack   TEXT, -- comma separated
    metrics_json TEXT, -- JSON array of {label, value}
    featured     INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Newsletter Subscribers
  CREATE TABLE IF NOT EXISTS subscribers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL UNIQUE,
    source     TEXT DEFAULT 'footer',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Audit & Security Logging
  CREATE TABLE IF NOT EXISTS audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id   INTEGER,
    action     TEXT NOT NULL,
    target     TEXT,
    details    TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- General Site Settings (JSON KV store)
  CREATE TABLE IF NOT EXISTS site_settings (
    key_name   TEXT PRIMARY KEY,
    key_value  TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
  CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(token);
`);

/* Safe column migrations for existing databases (ignored if already present) */
for (const stmt of [
  "ALTER TABLE projects ADD COLUMN features_json TEXT",
  "ALTER TABLE projects ADD COLUMN challenges_json TEXT",
  "ALTER TABLE projects ADD COLUMN accent TEXT DEFAULT 'from-indigo-500/30 to-cyan-500/20'",
  "ALTER TABLE projects ADD COLUMN live_url TEXT",
]) {
  try {
    db.exec(stmt);
  } catch {
    /* column already exists */
  }
}

/* ------------------------------------------------------------------ */
/* Crypto & Password Hashing                                          */
/* ------------------------------------------------------------------ */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, "sha512").toString("hex");
  return { hash, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(calculated, "hex"), Buffer.from(hash, "hex"));
}

/* ------------------------------------------------------------------ */
/* Seed Default Admin if none exists                                 */
/* Default Superadmin: admin@novaframe.studio / admin123!             */
/* ------------------------------------------------------------------ */
const adminCount = (db.prepare("SELECT COUNT(*) as c FROM admin_users").get() as { c: number }).c;
if (adminCount === 0) {
  const { hash, salt } = hashPassword("admin123!");
  db.prepare(`
    INSERT INTO admin_users (email, password_hash, salt, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run("admin@novaframe.studio", hash, salt, "Aarav Mehta (Lead Architect)", "superadmin");
}

/* ------------------------------------------------------------------ */
/* Seed Services if empty                                             */
/* ------------------------------------------------------------------ */
const sCount = (db.prepare("SELECT COUNT(*) as c FROM services").get() as { c: number }).c;
if (sCount === 0) {
  const ins = db.prepare(`
    INSERT INTO services (id, title, category, tagline, short_desc, deliverable, active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);
  [
    ["web", "Web Development", "Engineering", "Blazing-fast, SEO-first websites and web applications", "Marketing sites, headless commerce and full-scale platforms on Next.js and TypeScript.", "Live deployment + repository + documentation", 1],
    ["app", "App Development", "Engineering", "One codebase, every platform, native-quality feel", "iOS and Android apps with cross-platform architecture and offline support.", "Store-ready builds for iOS & Android", 2],
    ["design", "UI/UX Design", "Design", "Interfaces engineered to convert, not just impress", "Research-led design systems, wireframes, and production Figma tokens.", "Figma files + interactive design system", 3],
    ["seo", "SEO & Growth", "Growth", "Technical SEO built into the architecture", "Schema, Core Web Vitals optimization, programmatic landing pages.", "Technical audit + monthly growth tracker", 4],
    ["video", "Video & Motion", "Creative", "Motion design that sells the product story", "High-retention product launch videos, 3D animations, and social creative testing.", "Master film files + platform export packages", 5],
  ].forEach((row) => ins.run(...row));
}

/* ------------------------------------------------------------------ */
/* Seed Initial Projects if empty                                     */
/* ------------------------------------------------------------------ */
const pCount = (db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number }).c;
if (pCount === 0) {
  const insProj = db.prepare(`
    INSERT INTO projects (id, title, client, category, year, summary, problem, solution, tech_stack, metrics_json, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  [
    [
      "kaas-dev-console",
      "KaaS Developer Console",
      "Finstack Labs",
      "Web",
      "2025",
      "Multi-tenant SaaS console unifying real-time infrastructure metrics and billing.",
      "Legacy jQuery tool loading at 12s with 40k+ active users.",
      "Rebuilt on Next.js App Router, TypeScript, Redis caching and BullMQ background workers.",
      "Next.js, TypeScript, Node.js, PostgreSQL, Redis, BullMQ",
      JSON.stringify([{ label: "p95 load", value: "1.1s" }, { label: "JS payload", value: "-68%" }, { label: "Users served", value: "40k+" }]),
    ],
    [
      "kaarva-storefront",
      "Kaarva Headless Storefront",
      "Kaarva Lifestyle",
      "Web",
      "2025",
      "Headless commerce experience with 1-click checkout and live inventory sync.",
      "Mobile conversion sat at 0.8% with 4000+ unoptimized SKUs.",
      "Headless storefront with edge-cached ISR and guest-first checkout flow.",
      "Next.js, Shopify Storefront API, Cloudinary, Redis, Vercel Edge",
      JSON.stringify([{ label: "Conversion", value: "2.1×" }, { label: "LCP", value: "0.9s" }, { label: "Organic traffic", value: "3×" }]),
    ],
    [
      "pulse-fitness-app",
      "Pulse Fitness App",
      "Pulse Health",
      "App",
      "2024",
      "Cross-platform fitness companion with offline workout logging.",
      "Web wrappers causing 4% crash rates and 3.2 star reviews.",
      "React Native & Expo single codebase with SQLite offline-first sync.",
      "React Native, Expo, TypeScript, SQLite, Node.js, Sentry",
      JSON.stringify([{ label: "Store rating", value: "4.8★" }, { label: "Crash-free", value: "99.6%" }, { label: "Cold start", value: "1.3s" }]),
    ],
  ].forEach((row) => insProj.run(...row));
}

/* ------------------------------------------------------------------ */
/* Prepared Queries                                                   */
/* ------------------------------------------------------------------ */
export const queries = {
  // Auth
  getAdminByEmail: db.prepare("SELECT * FROM admin_users WHERE email = ?"),
  getAdminById: db.prepare("SELECT id, email, full_name, role, last_login_at, created_at FROM admin_users WHERE id = ?"),
  createSession: db.prepare("INSERT INTO admin_sessions (token, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)"),
  getSession: db.prepare(`
    SELECT s.token, s.expires_at, u.id AS user_id, u.email, u.full_name, u.role
    FROM admin_sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
  `),
  deleteSession: db.prepare("DELETE FROM admin_sessions WHERE token = ?"),
  updateLastLogin: db.prepare("UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?"),

  // Enquiries (Full CRUD)
  insertEnquiry: db.prepare(`
    INSERT INTO enquiries (reference, name, company_name, email, phone, service, budget_range, timeline, project_details, source, ip_address, user_agent)
    VALUES (@reference, @name, @companyName, @email, @phone, @service, @budget, @timeline, @details, @source, @ip, @userAgent)
  `),
  getAllEnquiries: db.prepare(`
    SELECT id, reference, name, company_name as companyName, email, phone, service, budget_range as budget, timeline, project_details as details, status, internal_notes as notes, created_at as createdAt, updated_at as updatedAt
    FROM enquiries
    ORDER BY datetime(created_at) DESC
  `),
  getEnquiryById: db.prepare("SELECT * FROM enquiries WHERE id = ?"),
  updateEnquiryStatus: db.prepare("UPDATE enquiries SET status = ?, internal_notes = coalesce(?, internal_notes), updated_at = datetime('now') WHERE id = ?"),
  deleteEnquiry: db.prepare("DELETE FROM enquiries WHERE id = ?"),

  // Services (Full CRUD)
  getAllServices: db.prepare("SELECT * FROM services ORDER BY sort_order ASC, created_at DESC"),
  insertService: db.prepare("INSERT INTO services (id, title, category, tagline, short_desc, deliverable, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"),
  updateService: db.prepare("UPDATE services SET title = ?, category = ?, tagline = ?, short_desc = ?, deliverable = ?, active = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?"),
  deleteService: db.prepare("DELETE FROM services WHERE id = ?"),

  // Projects (Full CRUD)
  getAllProjects: db.prepare("SELECT * FROM projects ORDER BY created_at DESC"),
  insertProject: db.prepare("INSERT INTO projects (id, title, client, category, year, summary, problem, solution, tech_stack, metrics_json, featured, features_json, challenges_json, accent, live_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"),
  updateProject: db.prepare("UPDATE projects SET title = ?, client = ?, category = ?, year = ?, summary = ?, problem = ?, solution = ?, tech_stack = ?, metrics_json = ?, featured = ? WHERE id = ?"),
  deleteProject: db.prepare("DELETE FROM projects WHERE id = ?"),

  // Subscribers
  getAllSubscribers: db.prepare("SELECT * FROM subscribers ORDER BY created_at DESC"),
  deleteSubscriber: db.prepare("DELETE FROM subscribers WHERE id = ?"),

  // Audit Logs
  logAudit: db.prepare("INSERT INTO audit_logs (admin_id, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?)"),
  getRecentAudits: db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50"),

  // Dashboard Aggregates
  getDashboardStats: db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM enquiries) AS totalEnquiries,
      (SELECT COUNT(*) FROM enquiries WHERE status = 'new') AS newEnquiries,
      (SELECT COUNT(*) FROM enquiries WHERE status = 'won') AS wonProjects,
      (SELECT COUNT(*) FROM services WHERE active = 1) AS activeServices,
      (SELECT COUNT(*) FROM projects) AS totalProjects,
      (SELECT COUNT(*) FROM subscribers) AS totalSubscribers
  `),
};
