/**
 * Novaframe Studio — API server (Node.js + Express + SQLite)
 * ----------------------------------------------------------
 * Public:  content bootstrap, enquiries, call bookings, newsletter, analytics events
 * Admin:   token sessions (PBKDF2 + hashed bearer tokens), role-based access,
 *          leads CRM, bookings, subscribers, every CMS collection, site settings,
 *          analytics, audit log, user management and JSON export.
 */
import "./env.js";
import express, { type NextFunction, type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADMIN_ROLES,
  BOOKING_STATUSES,
  COLLECTION_NAMES,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  type AdminRole,
  type AdvancedSettings,
  type CollectionName,
  type SiteSettings,
} from "../src/data/types.js";
import { defaultContent } from "../src/data/defaults.js";
import { mailEnabled, mailBackend, notifyBooking, notifyLead, notifyPayment, verifyMail, type MailContext } from "./mailer.js";
import Razorpay from "razorpay";
import {
  TZ_MOD,
  all,
  contentQ,
  get,
  hashPassword,
  hashToken,
  initDb,
  isCollection,
  newReference,
  parseRow,
  readSetting,
  run,
  seedCollection,
  tx,
  usingTurso,
  verifyPassword,
  writeSetting,
  type Args,
  type ContentRow,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const SESSION_DAYS = Number(process.env.SESSION_DAYS) || 7;

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY || "loopback, linklocal, uniquelocal");
// gzip/brotli for the site's JS/CSS/HTML and API JSON — roughly 4x less to download on mobile data.
app.use(compression({ threshold: 1024 }));

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true, maxAge: 86_400 }));
app.use(
  express.json({
    limit: "512kb",
    // Razorpay webhooks are signed over the exact raw bytes, so keep them for that one route.
    verify: (req, _res, buf) => {
      if (req.url?.startsWith("/api/payments/webhook")) (req as RawBodyRequest).rawBody = Buffer.from(buf);
    },
  }),
);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
type AdminUser = { id: number; email: string; fullName: string; role: AdminRole; sessionId: number };
type AuthedRequest = Request & { admin?: AdminUser };
type RawBodyRequest = Request & { rawBody?: Buffer };

const ok = (res: Response, data: unknown = null, status = 200) => res.status(status).json({ ok: true, data });
const fail = (res: Response, status: number, error: string, extra?: Record<string, unknown>) =>
  res.status(status).json({ ok: false, error, ...extra });

const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ipOf = (req: Request) => (req.ip ?? "").slice(0, 64);
const uaOf = (req: Request) => String(req.headers["user-agent"] ?? "").slice(0, 300);

function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return (override ?? base) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = (base as Record<string, unknown>)[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return out as T;
}

const siteSettings = async () => deepMerge(defaultContent.settings, await readSetting<SiteSettings>("site"));
const advancedSettings = async () => deepMerge(defaultContent.advanced, await readSetting<AdvancedSettings>("advanced"));

/** Public site URL for links inside emails (optional, e.g. https://novaframe.studio). */
const SITE_URL = /^https?:\/\//i.test(process.env.SITE_URL ?? "") ? (process.env.SITE_URL as string).replace(/\/+$/, "") : undefined;

/** Branding + signature used by every outgoing email. */
async function mailContext(): Promise<MailContext> {
  const founder = (await contentQ.listPublished("team")).map((row) => parseRow(row).data as { name?: string; role?: string })[0];
  return { settings: await siteSettings(), founder: founder?.name ? { name: founder.name, role: founder.role } : undefined, siteUrl: SITE_URL };
}

/** yyyy-mm-dd for "now + offsetDays" in an IANA timezone */
function dateInTz(timeZone: string, offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

async function estimateValue(budgetLabel: string): Promise<number | null> {
  const range = (await advancedSettings()).budgetRanges.find((b) => b.label === budgetLabel);
  if (!range) return null;
  if (range.max === null) return Math.round(range.min * 1.25);
  return Math.round((range.min + range.max) / 2);
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/** Simple fixed-window in-memory rate limiter. */
function rateLimit(opts: { windowMs: number; max: number; key?: (req: Request) => string; message?: string }) {
  const hits = new Map<string, { count: number; reset: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, opts.windowMs).unref();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.key ? opts.key(req) : ipOf(req);
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      hits.set(key, { count: 1, reset: now + opts.windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return fail(res, 429, opts.message ?? "Too many requests — please try again in a little while.");
    }
    next();
  };
}

const formLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 12 });
const subscribeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
const eventLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  key: (req) => `${ipOf(req)}|${str(req.body?.email, 160).toLowerCase()}`,
  message: "Too many sign-in attempts. Please wait 15 minutes and try again.",
});

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */
const ROLE_RANK: Record<AdminRole, number> = { editor: 1, admin: 2, owner: 3 };

const sessionQ = {
  create: (tokenHash: string, userId: number, ip: string, ua: string, expiresAt: string) =>
    run("INSERT INTO sessions (token_hash, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)", [
      tokenHash,
      userId,
      ip,
      ua,
      expiresAt,
    ]),
  find: (tokenHash: string) =>
    get<{ session_id: number; last_seen_at: string; id: number; email: string; full_name: string; role: AdminRole; active: number }>(
      `SELECT s.id AS session_id, s.last_seen_at, u.id, u.email, u.full_name, u.role, u.active
       FROM sessions s JOIN admin_users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND datetime(s.expires_at) > datetime('now')`,
      [tokenHash],
    ),
  touch: (id: number) => run("UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?", [id]),
  remove: (id: number) => run("DELETE FROM sessions WHERE id = ?", [id]),
  removeForUser: (userId: number, keepId: number) => run("DELETE FROM sessions WHERE user_id = ? AND id != ?", [userId, keepId]),
  listForUser: (userId: number) =>
    all<{ id: number; ip_address: string; user_agent: string; created_at: string; last_seen_at: string; expires_at: string }>(
      "SELECT id, ip_address, user_agent, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC",
      [userId],
    ),
};

async function audit(req: AuthedRequest, action: string, target: string, details = "") {
  await run("INSERT INTO audit_logs (admin_id, admin_email, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)", [
    req.admin?.id ?? null,
    req.admin?.email ?? null,
    action,
    target.slice(0, 120),
    details.slice(0, 500),
    ipOf(req),
  ]);
}

function bearer(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const legacy = req.headers["x-admin-token"];
  return typeof legacy === "string" ? legacy.trim() : "";
}

function requireRole(minRole: AdminRole = "editor") {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const token = bearer(req);
      if (!token) return fail(res, 401, "Authentication required.");
      const row = await sessionQ.find(hashToken(token));
      if (!row || row.active !== 1) return fail(res, 401, "Your session has expired. Please sign in again.");
      if ((ROLE_RANK[row.role] ?? 0) < ROLE_RANK[minRole]) return fail(res, 403, "Your role doesn't allow this action.");
      req.admin = { id: row.id, email: row.email, fullName: row.full_name, role: row.role, sessionId: row.session_id };
      if (Date.now() - Date.parse(row.last_seen_at + "Z") > 5 * 60 * 1000) await sessionQ.touch(row.session_id);
      next();
    } catch (err) {
      next(err);
    }
  };
}

const anyAdmin = requireRole("editor");
const adminOnly = requireRole("admin");
const ownerOnly = requireRole("owner");

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */
app.get("/api/health", async (_req, res) => {
  const { c } = (await get<{ c: number }>("SELECT count(*) AS c FROM content")) ?? { c: 0 };
  ok(res, { service: "novaframe-api", database: usingTurso ? "turso" : "sqlite", contentItems: c, time: new Date().toISOString() });
});

async function publishedCollection(name: CollectionName) {
  return (await contentQ.listPublished(name)).map((row) => parseRow(row).data);
}

app.get("/api/content", async (_req, res) => {
  const collections = Object.fromEntries(await Promise.all(COLLECTION_NAMES.map(async (name) => [name, await publishedCollection(name)])));
  const { t } = (await contentQ.lastUpdate()) ?? { t: null };
  res.setHeader("Cache-Control", "no-cache");
  ok(res, { settings: await siteSettings(), advanced: await advancedSettings(), collections, version: t ?? "" });
});

app.get("/api/content/:collection", async (req, res) => {
  const name = req.params.collection;
  if (!isCollection(name)) return fail(res, 404, "Unknown collection.");
  ok(res, await publishedCollection(name));
});

/* ------------------------------------------------------------------ */
/* Media library — images uploaded from the admin console             */
/* ------------------------------------------------------------------ */
/** Upload formats we accept, mapped to the extension used in the stored id. */
const MEDIA_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
const MEDIA_MAX_BYTES = 4 * 1024 * 1024;
const MEDIA_ID_RE = /^[a-z0-9][a-z0-9-]{0,80}\.(jpg|png|webp|avif|gif)$/;

/** Magic-byte check so a renamed .exe can't be stored as an image. */
function sniffImage(buf: Buffer, mime: string) {
  if (buf.length < 12) return false;
  switch (mime) {
    case "image/jpeg":
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "image/png":
      return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/gif":
      return buf.subarray(0, 6).toString("latin1").startsWith("GIF8");
    case "image/webp":
      return buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP";
    case "image/avif":
      return buf.subarray(4, 8).toString("latin1") === "ftyp";
    default:
      return false;
  }
}

/** Public: serve an uploaded image. Ids carry a random suffix, so they cache forever. */
const mediaCache = new Map<string, { mime: string; body: Buffer }>();
let mediaCacheBytes = 0;
const MEDIA_CACHE_MAX_BYTES = 24 * 1024 * 1024;

function sendMedia(res: Response, mime: string, body: Buffer) {
  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  // Defensive: these bytes are user-supplied, so never let them run as a document.
  res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self' data:; sandbox");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.send(body);
}

app.get("/api/media/:id", async (req, res) => {
  const id = String(req.params.id).toLowerCase();
  if (!MEDIA_ID_RE.test(id)) return fail(res, 404, "Image not found.");
  // Images are immutable, so a small in-process cache saves a database read per view.
  const cached = mediaCache.get(id);
  if (cached) return sendMedia(res, cached.mime, cached.body);

  const row = await get<{ mime_type: string; data: Buffer | Uint8Array | ArrayBuffer }>(
    "SELECT mime_type, data FROM media WHERE id = ?",
    [id],
  );
  if (!row) return fail(res, 404, "Image not found.");
  const body = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data as ArrayBuffer);
  while (mediaCacheBytes + body.length > MEDIA_CACHE_MAX_BYTES && mediaCache.size) {
    const oldest = mediaCache.keys().next().value as string;
    mediaCacheBytes -= mediaCache.get(oldest)?.body.length ?? 0;
    mediaCache.delete(oldest);
  }
  mediaCache.set(id, { mime: row.mime_type, body });
  mediaCacheBytes += body.length;
  sendMedia(res, row.mime_type, body);
});

function insertEnquiry(args: Args) {
  return run(
    `INSERT INTO enquiries (reference, name, company_name, email, phone, service, budget_range, timeline,
      project_details, source, value_estimate, ip_address, user_agent)
    VALUES (@reference, @name, @company, @email, @phone, @service, @budget, @timeline,
      @details, @source, @value, @ip, @ua)`,
    args,
  );
}

app.post("/api/enquiries", formLimiter, async (req, res) => {
  const b = req.body ?? {};
  // Honeypot — bots fill every field. Pretend success, store nothing.
  if (str(b.website, 200)) return ok(res, { reference: newReference("NF"), message: "Received" }, 201);

  const name = str(b.name, 120);
  const email = str(b.email, 160).toLowerCase();
  const details = str(b.details, 5000);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Please enter your name.";
  if (!isEmail(email)) errors.email = "Please enter a valid email address.";
  if (details.length < 10) errors.details = "Please share a little more detail about the project.";
  if (Object.keys(errors).length) return fail(res, 422, "Please check the highlighted fields.", { errors });

  const budget = str(b.budget, 80) || "Not specified";
  const reference = newReference("NF");
  const lead = {
    reference,
    name,
    company: str(b.companyName, 160),
    email,
    phone: str(b.phone, 40),
    service: str(b.service, 100) || "General enquiry",
    budget,
    timeline: str(b.timeline, 80),
    details,
    source: (str(b.source, 30).replace(/[^a-z_-]/gi, "") || "contact").toLowerCase(),
  };
  await insertEnquiry({ ...lead, value: await estimateValue(budget), ip: ipOf(req), ua: uaOf(req) });
  notifyLead(lead, await mailContext()).catch((err) => console.error("[mail] lead notification failed:", (err as Error).message));
  ok(res, { reference, message: "Enquiry received. We reply within 12 business hours.", mail: mailEnabled() }, 201);
});

app.get("/api/bookings/availability", async (req, res) => {
  const settings = await siteSettings();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from)) ? String(req.query.from) : dateInTz(settings.timezone);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to)) ? String(req.query.to) : dateInTz(settings.timezone, 45);
  const rows = await all<{ slot_date: string; slot_time: string }>(
    "SELECT slot_date, slot_time FROM bookings WHERE slot_date BETWEEN ? AND ? AND status IN ('scheduled','confirmed')",
    [from, to],
  );
  const taken: Record<string, string[]> = {};
  for (const r of rows) (taken[r.slot_date] ??= []).push(r.slot_time);
  ok(res, { taken, slots: settings.booking.slots, timezone: settings.timezone });
});

app.post("/api/bookings", formLimiter, async (req, res) => {
  const b = req.body ?? {};
  if (str(b.website, 200)) return ok(res, { reference: newReference("NFC") }, 201);

  const settings = await siteSettings();
  const name = str(b.name, 120);
  const email = str(b.email, 160).toLowerCase();
  const date = str(b.date, 10);
  const time = str(b.time, 12);
  const topic = str(b.topic, 100) || "Discovery call";
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Please enter your name.";
  if (!isEmail(email)) errors.email = "Please enter a valid email address.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = "Please choose a day.";
  if (!settings.booking.slots.includes(time)) errors.time = "Please choose one of the available times.";
  if (Object.keys(errors).length) return fail(res, 422, "Please check the highlighted fields.", { errors });

  const today = dateInTz(settings.timezone);
  const latest = dateInTz(settings.timezone, settings.booking.daysAhead + 10);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (date <= today || date > latest || !settings.workingHours.days.includes(weekday)) {
    return fail(res, 422, "That day isn't available for calls — please pick another.", { errors: { date: "Unavailable day" } });
  }

  const budget = str(b.budget, 80);
  const notes = str(b.notes, 2000);
  const company = str(b.companyName, 160);
  const phone = str(b.phone, 40);
  const reference = newReference("NFC");
  const enquiryReference = newReference("NF");

  try {
    // Atomic: create the lead then the booking. The UNIQUE active-slot index
    // rejects a double-booking, which rolls the whole batch back → 409 below.
    await tx([
      [
        `INSERT INTO enquiries (reference, name, company_name, email, phone, service, budget_range, timeline,
          project_details, source, value_estimate, ip_address, user_agent)
        VALUES (@reference, @name, @company, @email, @phone, @service, @budget, @timeline,
          @details, @source, @value, @ip, @ua)`,
        {
          reference: enquiryReference,
          name,
          company,
          email,
          phone,
          service: `Discovery call — ${topic}`,
          budget: budget || "To discuss on call",
          timeline: `Call booked for ${date} · ${time} ${settings.timezoneLabel}`,
          details: notes || `Discovery call requested about: ${topic}.`,
          source: "booking",
          value: await estimateValue(budget),
          ip: ipOf(req),
          ua: uaOf(req),
        },
      ],
      [
        `INSERT INTO bookings (reference, name, email, phone, company_name, topic, budget_range, notes, slot_date, slot_time,
          timezone, enquiry_id, ip_address, user_agent)
        VALUES (@reference, @name, @email, @phone, @company, @topic, @budget, @notes, @date, @time, @tz,
          (SELECT id FROM enquiries WHERE reference = @enquiryRef), @ip, @ua)`,
        {
          reference,
          name,
          email,
          phone,
          company,
          topic,
          budget,
          notes,
          date,
          time,
          tz: settings.timezone,
          enquiryRef: enquiryReference,
          ip: ipOf(req),
          ua: uaOf(req),
        },
      ],
    ]);
  } catch (err) {
    if (String((err as Error).message).includes("UNIQUE")) {
      return fail(res, 409, "That slot was just taken — please pick another time.", { errors: { time: "Slot taken" } });
    }
    throw err;
  }
  notifyBooking({ reference, name, email, phone, company, topic, budget, date, time, notes }, await mailContext()).catch((err) =>
    console.error("[mail] booking notification failed:", (err as Error).message),
  );
  ok(
    res,
    { reference, date, time, timezone: settings.timezoneLabel, durationMinutes: settings.booking.durationMinutes, mail: mailEnabled() },
    201,
  );
});

app.post("/api/subscribe", subscribeLimiter, async (req, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  if (!isEmail(email)) return fail(res, 422, "Please enter a valid email address.");
  const info = await run("INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)", [
    email,
    str(req.body?.source, 40) || "footer",
  ]);
  ok(res, { subscribed: true, existing: info.changes === 0 });
});

app.post("/api/events", eventLimiter, async (req, res) => {
  const name = str(req.body?.name, 40).replace(/[^a-z0-9_:-]/gi, "");
  if (!name) return fail(res, 422, "Event name required.");
  let meta = "";
  if (isPlainObject(req.body?.meta)) meta = JSON.stringify(req.body.meta).slice(0, 1000);
  await run("INSERT INTO events (name, path, session_id, referrer, meta) VALUES (?, ?, ?, ?, ?)", [
    name,
    str(req.body?.path, 200),
    str(req.body?.sid, 64),
    str(req.body?.referrer, 300),
    meta || null,
  ]);
  ok(res, null, 202);
});

/* ------------------------------------------------------------------ */
/* Public API — Payments (Razorpay)                                   */
/* ------------------------------------------------------------------ */
let razorpayClient: Razorpay | null | undefined;
function getRazorpay(): Razorpay | null {
  if (razorpayClient !== undefined) return razorpayClient;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  razorpayClient = key_id && key_secret ? new Razorpay({ key_id, key_secret }) : null;
  return razorpayClient;
}
const paymentsEnabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const paymentsTestMode = () => (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_");
const PAYMENT_CURRENCY = (process.env.PAYMENT_CURRENCY || "INR").toUpperCase();
const paymentLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });

type PaymentRow = {
  id: number;
  reference: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  purpose: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed";
  method: string | null;
  paid_at: string | null;
  enquiry_id: number | null;
};

const paymentQ = {
  insert: (args: Args) =>
    run(
      `INSERT INTO payments (reference, razorpay_order_id, name, email, phone, company_name, purpose, amount, currency, enquiry_id, ip_address, user_agent)
       VALUES (@reference, @orderId, @name, @email, @phone, @company, @purpose, @amount, @currency, @enquiryId, @ip, @ua)`,
      args,
    ),
  byOrder: (orderId: string) => get<PaymentRow>("SELECT * FROM payments WHERE razorpay_order_id = ?", [orderId]),
  // Only the first successful confirmation flips the row — that caller sends the emails.
  markPaid: (args: { paymentId: string; method: string | null; orderId: string }) =>
    run(
      `UPDATE payments SET status = 'paid', razorpay_payment_id = @paymentId, method = coalesce(@method, method),
        paid_at = datetime('now'), updated_at = datetime('now')
      WHERE razorpay_order_id = @orderId AND status != 'paid'`,
      args,
    ),
  setMethod: (method: string, orderId: string) =>
    run("UPDATE payments SET method = ?, updated_at = datetime('now') WHERE razorpay_order_id = ? AND method IS NULL", [
      method,
      orderId,
    ]),
  leadPaid: (details: string, id: number) =>
    run("UPDATE enquiries SET project_details = ?, updated_at = datetime('now') WHERE id = ?", [details, id]),
  leadNote: (id: number, body: string) =>
    run("INSERT INTO enquiry_notes (enquiry_id, admin_name, kind, body) VALUES (?, 'Razorpay', 'payment', ?)", [id, body]),
};

const METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  cardless_emi: "Cardless EMI",
  paylater: "Pay Later",
  bank_transfer: "Bank transfer",
};

const hmacHex = (secret: string, data: string | Buffer) => crypto.createHmac("sha256", secret).update(data).digest("hex");
function sameHex(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms).unref())]);
}

/**
 * Best effort: read the payment from Razorpay for the receipt (method, bank/wallet) and
 * capture it if the account is set to manual capture — uncaptured payments are auto-refunded.
 */
async function inspectPayment(paymentId: string, row: PaymentRow): Promise<string | null> {
  const rp = getRazorpay();
  if (!rp) return null;
  try {
    let payment = await withTimeout(rp.payments.fetch(paymentId), 8000);
    if (payment.order_id && payment.order_id !== row.razorpay_order_id) {
      console.warn(`[payment] ${paymentId} belongs to ${payment.order_id}, not ${row.razorpay_order_id}`);
      return null;
    }
    if (payment.status === "authorized") {
      payment = await withTimeout(rp.payments.capture(paymentId, row.amount * 100, row.currency), 8000);
      console.log(`[payment] captured ${paymentId}`);
    }
    const label = METHOD_LABELS[payment.method] ?? payment.method;
    // Wallet names read well ("Paytm"); net-banking bank codes ("UTIB") don't, so they're left out.
    const wallet = payment.method === "wallet" && payment.wallet ? payment.wallet.replace(/^\w/, (c) => c.toUpperCase()) : "";
    return wallet ? `${label} · ${wallet}` : label || null;
  } catch (err) {
    const e = err as { message?: string; error?: { description?: string } };
    console.warn(`[payment] couldn't inspect ${paymentId}:`, e.error?.description ?? e.message);
    return null;
  }
}

const isoUtc = (sqlite: string | null) => (sqlite ? `${sqlite.replace(" ", "T")}Z` : new Date().toISOString());

/** Marks an order paid (idempotent). The first caller logs it on the lead and sends the emails. */
async function settlePayment(orderId: string, paymentId: string): Promise<PaymentRow | null> {
  const row = await paymentQ.byOrder(orderId);
  if (!row) return null;
  const method = row.status === "paid" && row.method ? row.method : await inspectPayment(paymentId, row);
  const first = (await paymentQ.markPaid({ orderId, paymentId, method })).changes === 1;
  if (!first && method) await paymentQ.setMethod(method, orderId);
  const fresh = (await paymentQ.byOrder(orderId)) as PaymentRow;

  if (first) {
    const amountLabel = `${fresh.currency} ${fresh.amount.toLocaleString("en-IN")}`;
    if (fresh.enquiry_id) {
      await paymentQ.leadPaid(
        `Online payment received: ${amountLabel} for "${fresh.purpose}"${method ? ` via ${method}` : ""}. Receipt ${fresh.reference} · Razorpay ${paymentId}.`,
        fresh.enquiry_id,
      );
      await paymentQ.leadNote(fresh.enquiry_id, `Payment received — ${amountLabel}${method ? ` via ${method}` : ""} · ${paymentId}${paymentsTestMode() ? " (test mode)" : ""}`);
    }
    console.log(`[payment] ${fresh.reference} paid — ${amountLabel} (${paymentId})`);
    notifyPayment(
      {
        reference: fresh.reference,
        name: fresh.name,
        email: fresh.email,
        phone: fresh.phone ?? undefined,
        company: fresh.company_name ?? undefined,
        purpose: fresh.purpose,
        amount: fresh.amount,
        currency: fresh.currency,
        paymentId,
        orderId,
        method: fresh.method,
        paidAt: new Date(isoUtc(fresh.paid_at)),
        testMode: paymentsTestMode(),
      },
      await mailContext(),
    ).catch((err) => console.error("[mail] payment emails failed:", (err as Error).message));
  }
  return fresh;
}

const receiptOf = (row: PaymentRow) => ({
  reference: row.reference,
  paymentId: row.razorpay_payment_id ?? "",
  orderId: row.razorpay_order_id,
  amount: row.amount,
  currency: row.currency,
  purpose: row.purpose,
  name: row.name,
  email: row.email,
  phone: row.phone ?? "",
  companyName: row.company_name ?? "",
  method: row.method,
  paidAt: isoUtc(row.paid_at),
  testMode: paymentsTestMode(),
  mail: mailEnabled(),
});

/** Public config so the frontend knows whether to show the checkout. */
app.get("/api/payments/config", (_req, res) => {
  ok(res, { enabled: paymentsEnabled(), keyId: process.env.RAZORPAY_KEY_ID ?? "", currency: PAYMENT_CURRENCY, testMode: paymentsTestMode() });
});

/** Step 1 — create a Razorpay order (amount is validated server-side). */
app.post("/api/payments/order", paymentLimiter, async (req, res) => {
  const rp = getRazorpay();
  if (!rp) return fail(res, 503, "Online payments aren't configured yet. Please contact us to pay.");

  const b = req.body ?? {};
  if (str(b.website, 200)) return fail(res, 400, "Invalid request."); // honeypot

  const name = str(b.name, 120);
  const email = str(b.email, 160).toLowerCase();
  const purpose = str(b.purpose, 160) || "Payment to Novaframe Studio";
  // Amount arrives in major units (rupees). Clamp to a sane range.
  const rupees = Math.round(Number(b.amount));
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Please enter your name.";
  if (!isEmail(email)) errors.email = "Please enter a valid email address.";
  if (!Number.isFinite(rupees) || rupees < 1) errors.amount = "Please enter a valid amount.";
  if (rupees > 10_000) errors.amount = "That amount is above our online limit — please contact us for larger invoices.";
  if (Object.keys(errors).length) return fail(res, 422, "Please check the highlighted fields.", { errors });

  const reference = newReference("NFP");
  const amountPaise = rupees * 100; // Razorpay works in the smallest currency unit
  const company = str(b.companyName, 160);
  const phone = str(b.phone, 40);

  try {
    const order = await rp.orders.create({
      amount: amountPaise,
      currency: PAYMENT_CURRENCY,
      receipt: reference,
      notes: { reference, name, email, purpose },
    });

    // Record a lead so every payer shows up in the admin CRM, then the payment row.
    const enquiry = await insertEnquiry({
      reference: newReference("NF"),
      name,
      company,
      email,
      phone,
      service: `Payment — ${purpose}`,
      budget: `${PAYMENT_CURRENCY} ${rupees.toLocaleString("en-IN")}`,
      timeline: "",
      details: `Online payment started for "${purpose}" (${PAYMENT_CURRENCY} ${rupees.toLocaleString("en-IN")}) — not completed yet. Receipt ${reference}.`,
      source: "payment",
      value: rupees,
      ip: ipOf(req),
      ua: uaOf(req),
    });

    await paymentQ.insert({
      reference,
      orderId: order.id,
      name,
      email,
      phone,
      company,
      purpose,
      amount: rupees,
      currency: PAYMENT_CURRENCY,
      enquiryId: Number(enquiry.lastInsertRowid),
      ip: ipOf(req),
      ua: uaOf(req),
    });

    ok(res, {
      reference,
      orderId: order.id,
      amount: amountPaise,
      currency: PAYMENT_CURRENCY,
      keyId: process.env.RAZORPAY_KEY_ID,
      name,
      email,
      phone,
      testMode: paymentsTestMode(),
    }, 201);
  } catch (err) {
    const e = err as { message?: string; error?: { description?: string } };
    console.error("[payment] order creation failed:", e.error?.description ?? e.message);
    fail(res, 502, "Couldn't start the payment. Please try again in a moment.");
  }
});

/** Step 2 — the browser hands back Razorpay's signed result; we verify it before confirming. */
app.post("/api/payments/verify", paymentLimiter, async (req, res) => {
  if (!paymentsEnabled()) return fail(res, 503, "Payments aren't configured.");
  const orderId = str(req.body?.razorpay_order_id, 120);
  const paymentId = str(req.body?.razorpay_payment_id, 120);
  const signature = str(req.body?.razorpay_signature, 200);
  if (!orderId || !paymentId || !signature) return fail(res, 400, "Missing payment details.");

  if (!(await paymentQ.byOrder(orderId))) return fail(res, 404, "We couldn't find this order. Please contact us with your payment ID.");

  // HMAC-SHA256(order_id|payment_id) keyed with the secret proves Razorpay approved this payment.
  if (!sameHex(hmacHex(process.env.RAZORPAY_KEY_SECRET as string, `${orderId}|${paymentId}`), signature)) {
    console.warn(`[payment] signature mismatch for ${orderId} / ${paymentId}`);
    return fail(res, 400, "We couldn't verify this payment. If money was deducted, it will be refunded automatically — please contact us.");
  }

  const row = await settlePayment(orderId, paymentId);
  if (!row) return fail(res, 404, "Unknown order.");
  ok(res, receiptOf(row));
});

/**
 * Optional safety net — Razorpay calls this even if the visitor closes the tab right after paying.
 * Dashboard → Webhooks: URL https://<your-domain>/api/payments/webhook, events payment.captured + order.paid,
 * and the same secret in RAZORPAY_WEBHOOK_SECRET.
 */
app.post("/api/payments/webhook", async (req: RawBodyRequest, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !paymentsEnabled()) return fail(res, 404, "Route not found.");
  const signature = String(req.headers["x-razorpay-signature"] ?? "");
  if (!req.rawBody || !signature || !sameHex(hmacHex(secret, req.rawBody), signature)) {
    return fail(res, 400, "Invalid webhook signature.");
  }
  const event = str(req.body?.event, 60);
  const payment = req.body?.payload?.payment?.entity as { id?: string; order_id?: string } | undefined;
  if (["payment.captured", "payment.authorized", "order.paid"].includes(event) && payment?.id && payment.order_id) {
    await settlePayment(payment.order_id, payment.id);
  }
  ok(res, { received: true });
});
/* ------------------------------------------------------------------ */
const userQ = {
  byEmail: (email: string) => get<{ id: number; email: string; full_name: string; role: AdminRole; password_hash: string; salt: string; active: number; last_login_at: string | null }>(
    "SELECT * FROM admin_users WHERE email = ?",
    [email],
  ),
  byId: <T>(id: number) => get<T>("SELECT * FROM admin_users WHERE id = ?", [id]),
  list: () =>
    all<{ id: number; email: string; full_name: string; role: string; active: number; last_login_at: string; created_at: string }>(
      "SELECT id, email, full_name, role, active, last_login_at, created_at FROM admin_users ORDER BY id ASC",
    ),
  lastLogin: (id: number) => run("UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?", [id]),
  setPassword: (hash: string, salt: string, id: number) =>
    run("UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?", [hash, salt, id]),
  owners: () => get<{ c: number }>("SELECT count(*) AS c FROM admin_users WHERE role = 'owner' AND active = 1"),
};
const DUMMY = hashPassword("timing-safe-placeholder");

const publicUser = (u: { id: number; email: string; full_name: string; role: string; last_login_at?: string | null }) => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  role: u.role,
  lastLoginAt: u.last_login_at ?? null,
});

app.post("/api/admin/login", loginLimiter, async (req: AuthedRequest, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) return fail(res, 400, "Email and password are required.");

  const user = await userQ.byEmail(email);
  // Always run one PBKDF2 check so response timing doesn't reveal whether the email exists.
  const valid = user
    ? verifyPassword(password, user.password_hash, user.salt)
    : (verifyPassword(password, DUMMY.hash, DUMMY.salt), false);
  if (!user || !valid || user.active !== 1) {
    await run("INSERT INTO audit_logs (admin_id, admin_email, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)", [
      user?.id ?? null,
      email,
      "LOGIN_FAILED",
      "AUTH",
      "Invalid credentials",
      ipOf(req),
    ]);
    return fail(res, 401, "Invalid email or password.");
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString().replace("T", " ").slice(0, 19);
  await sessionQ.create(hashToken(token), user.id, ipOf(req), uaOf(req), expiresAt);
  await userQ.lastLogin(user.id);
  req.admin = { id: user.id, email: user.email, fullName: user.full_name, role: user.role, sessionId: 0 };
  await audit(req, "LOGIN", "AUTH", "Signed in");
  ok(res, { token, expiresAt, user: publicUser(user) });
});

app.get("/api/admin/me", anyAdmin, async (req: AuthedRequest, res) => {
  const user = (await userQ.byId<Parameters<typeof publicUser>[0]>(req.admin!.id))!;
  ok(res, { user: publicUser(user) });
});

app.post("/api/admin/logout", anyAdmin, async (req: AuthedRequest, res) => {
  await sessionQ.remove(req.admin!.sessionId);
  await audit(req, "LOGOUT", "AUTH", "Signed out");
  ok(res);
});

app.post("/api/admin/password", anyAdmin, async (req: AuthedRequest, res) => {
  const current = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const next = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  const user = (await userQ.byId<{ password_hash: string; salt: string }>(req.admin!.id))!;
  if (!verifyPassword(current, user.password_hash, user.salt)) return fail(res, 400, "Your current password is incorrect.");
  if (next.length < 10) return fail(res, 422, "The new password must be at least 10 characters.");
  const { hash, salt } = hashPassword(next);
  await userQ.setPassword(hash, salt, req.admin!.id);
  await sessionQ.removeForUser(req.admin!.id, req.admin!.sessionId);
  await audit(req, "PASSWORD_CHANGED", `USER_${req.admin!.id}`, "Password changed; other sessions revoked");
  ok(res);
});

app.get("/api/admin/sessions", anyAdmin, async (req: AuthedRequest, res) => {
  const rows = await sessionQ.listForUser(req.admin!.id);
  ok(res, rows.map((r) => ({ ...r, current: r.id === req.admin!.sessionId })));
});

app.delete("/api/admin/sessions/:id", anyAdmin, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const info = await run("DELETE FROM sessions WHERE id = ? AND user_id = ?", [id, req.admin!.id]);
  if (!info.changes) return fail(res, 404, "Session not found.");
  await audit(req, "SESSION_REVOKED", `SESSION_${id}`);
  ok(res);
});

/* ------------------------------------------------------------------ */
/* Admin — dashboard & analytics                                      */
/* ------------------------------------------------------------------ */
async function dailySeries(sql: string, days: number, ...params: unknown[]) {
  const rows = await all<{ day: string; c: number }>(sql, params as Args);
  const map = new Map(rows.map((r) => [r.day, r.c]));
  const tz = (await siteSettings()).timezone;
  return Array.from({ length: days }, (_, i) => {
    const day = dateInTz(tz, i - days + 1);
    return { date: day, count: map.get(day) ?? 0 };
  });
}

app.get("/api/admin/overview", adminOnly, async (_req, res) => {
  const settings = await siteSettings();
  const today = dateInTz(settings.timezone);
  const one = async <T>(sql: string, ...params: unknown[]) => (await get<T>(sql, params as Args))!;

  const leads = await one<{ total: number; fresh: number; won: number; lost: number; last7: number; prev7: number; pipeline: number | null; wonValue: number | null }>(`
    SELECT count(*) AS total,
      sum(status = 'new') AS fresh,
      sum(status = 'won') AS won,
      sum(status = 'lost') AS lost,
      sum(datetime(created_at) >= datetime('now', '-7 days')) AS last7,
      sum(datetime(created_at) < datetime('now', '-7 days') AND datetime(created_at) >= datetime('now', '-14 days')) AS prev7,
      sum(CASE WHEN status IN ('new','contacted','qualified','proposal') THEN coalesce(value_estimate, 0) END) AS pipeline,
      sum(CASE WHEN status = 'won' THEN coalesce(value_estimate, 0) END) AS wonValue
    FROM enquiries`);
  const traffic = await one<{ views: number; visitors: number }>(`
    SELECT count(*) AS views, count(DISTINCT session_id) AS visitors FROM events
    WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', '-7 days')`);
  const subs = await one<{ total: number; last7: number }>(`
    SELECT count(*) AS total, sum(datetime(created_at) >= datetime('now', '-7 days')) AS last7 FROM subscribers`);
  const upcoming = await one<{ c: number }>(
    "SELECT count(*) AS c FROM bookings WHERE slot_date >= ? AND status IN ('scheduled','confirmed')",
    today,
  );

  const decided = (leads.won ?? 0) + (leads.lost ?? 0);
  ok(res, {
    kpis: {
      leadsTotal: leads.total ?? 0,
      leadsNew: leads.fresh ?? 0,
      leads7d: leads.last7 ?? 0,
      leadsPrev7d: leads.prev7 ?? 0,
      won: leads.won ?? 0,
      winRate: decided ? Math.round(((leads.won ?? 0) / decided) * 100) : null,
      pipelineValue: leads.pipeline ?? 0,
      wonValue: leads.wonValue ?? 0,
      bookingsUpcoming: upcoming.c,
      subscribers: subs.total ?? 0,
      subscribers7d: subs.last7 ?? 0,
      views7d: traffic.views ?? 0,
      visitors7d: traffic.visitors ?? 0,
    },
    leadsSeries: await dailySeries(
      `SELECT date(created_at, '${TZ_MOD}') AS day, count(*) AS c FROM enquiries
       WHERE datetime(created_at) >= datetime('now', '-31 days') GROUP BY day`,
      30,
    ),
    viewsSeries: await dailySeries(
      `SELECT date(created_at, '${TZ_MOD}') AS day, count(*) AS c FROM events
       WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', '-31 days') GROUP BY day`,
      30,
    ),
    pipeline: await all(
      "SELECT status, count(*) AS count, coalesce(sum(value_estimate), 0) AS value FROM enquiries GROUP BY status",
    ),
    sources: await all("SELECT source, count(*) AS count FROM enquiries GROUP BY source ORDER BY count DESC"),
    services: await all("SELECT service, count(*) AS count FROM enquiries GROUP BY service ORDER BY count DESC LIMIT 6"),
    upcomingBookings: await all(
      `SELECT id, reference, name, company_name AS companyName, topic, slot_date AS date, slot_time AS time, status, meeting_link AS meetingLink
       FROM bookings WHERE slot_date >= ? AND status IN ('scheduled','confirmed') ORDER BY slot_date, slot_time LIMIT 6`,
      [today],
    ),
    recentLeads: await all(
      `SELECT id, reference, name, company_name AS companyName, service, budget_range AS budget, status, priority, created_at AS createdAt
       FROM enquiries ORDER BY datetime(created_at) DESC, id DESC LIMIT 6`,
    ),
    recentActivity: await all("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 8"),
    content: await contentQ.counts(),
  });
});

app.get("/api/admin/analytics", adminOnly, async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 180);
  const since = `-${days} days`;
  const series = await dailySeries(
    `SELECT date(created_at, '${TZ_MOD}') AS day, count(*) AS c FROM events
     WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', ?) GROUP BY day`,
    days,
    since,
  );
  const visitors = await dailySeries(
    `SELECT date(created_at, '${TZ_MOD}') AS day, count(DISTINCT session_id) AS c FROM events
     WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', ?) GROUP BY day`,
    days,
    since,
  );
  const totals = (await get<{ views: number; visitors: number }>(
    `SELECT count(*) AS views, count(DISTINCT session_id) AS visitors FROM events
       WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', ?)`,
    [since],
  ))!;
  const leads = (await get<{ c: number }>(
    "SELECT count(*) AS c FROM enquiries WHERE datetime(created_at) >= datetime('now', ?)",
    [since],
  ))!;
  ok(res, {
    days,
    totals: { ...totals, leads: leads.c, conversion: totals.visitors ? +((leads.c / totals.visitors) * 100).toFixed(2) : 0 },
    series: series.map((s, i) => ({ date: s.date, views: s.count, visitors: visitors[i]?.count ?? 0 })),
    topPages: await all(
      `SELECT path, count(*) AS views FROM events WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', ?)
         GROUP BY path ORDER BY views DESC LIMIT 10`,
      [since],
    ),
    topEvents: await all(
      `SELECT name, count(*) AS count FROM events WHERE name != 'page_view' AND datetime(created_at) >= datetime('now', ?)
         GROUP BY name ORDER BY count DESC LIMIT 10`,
      [since],
    ),
    ctas: await all(
      `SELECT coalesce(json_extract(meta, '$.label'), 'unknown') AS label, count(*) AS count FROM events
         WHERE name = 'cta_click' AND datetime(created_at) >= datetime('now', ?) GROUP BY label ORDER BY count DESC LIMIT 10`,
      [since],
    ),
    referrers: await all(
      `SELECT referrer, count(*) AS count FROM events
         WHERE name = 'page_view' AND referrer IS NOT NULL AND referrer != '' AND datetime(created_at) >= datetime('now', ?)
         GROUP BY referrer ORDER BY count DESC LIMIT 8`,
      [since],
    ),
  });
});

/* ------------------------------------------------------------------ */
/* Admin — leads CRM                                                  */
/* ------------------------------------------------------------------ */
const LEAD_COLUMNS = `id, reference, name, company_name AS companyName, email, phone, service, budget_range AS budget, timeline,
  project_details AS details, status, priority, value_estimate AS valueEstimate, internal_notes AS notes, source,
  created_at AS createdAt, updated_at AS updatedAt`;

app.get("/api/admin/enquiries", adminOnly, async (_req, res) => {
  ok(res, await all(`SELECT ${LEAD_COLUMNS} FROM enquiries ORDER BY datetime(created_at) DESC, id DESC`));
});

app.get("/api/admin/enquiries/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const lead = await get(`SELECT ${LEAD_COLUMNS} FROM enquiries WHERE id = ?`, [id]);
  if (!lead) return fail(res, 404, "Lead not found.");
  const notes = await all(
    "SELECT id, kind, body, admin_name AS author, created_at AS createdAt FROM enquiry_notes WHERE enquiry_id = ? ORDER BY id DESC",
    [id],
  );
  const booking = await get(
    "SELECT id, reference, slot_date AS date, slot_time AS time, status FROM bookings WHERE enquiry_id = ?",
    [id],
  );
  ok(res, { ...(lead as object), activity: notes, booking: booking ?? null });
});

async function addNote(enquiryId: number, adminId: number | null, adminName: string | null, kind: string, body: string) {
  return run("INSERT INTO enquiry_notes (enquiry_id, admin_id, admin_name, kind, body) VALUES (?, ?, ?, ?, ?)", [
    enquiryId,
    adminId,
    adminName,
    kind,
    body,
  ]);
}

app.patch("/api/admin/enquiries/:id", adminOnly, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const lead = await get<{ status: string; priority: string }>("SELECT status, priority FROM enquiries WHERE id = ?", [id]);
  if (!lead) return fail(res, 404, "Lead not found.");
  const b = req.body ?? {};
  const sets: string[] = [];
  const params: unknown[] = [];

  if (b.status !== undefined) {
    if (!(LEAD_STATUSES as readonly string[]).includes(b.status)) return fail(res, 422, "Invalid status.");
    sets.push("status = ?");
    params.push(b.status);
  }
  if (b.priority !== undefined) {
    if (!(LEAD_PRIORITIES as readonly string[]).includes(b.priority)) return fail(res, 422, "Invalid priority.");
    sets.push("priority = ?");
    params.push(b.priority);
  }
  if (b.valueEstimate !== undefined) {
    const v = b.valueEstimate === null || b.valueEstimate === "" ? null : Math.max(0, Math.round(Number(b.valueEstimate)));
    if (v !== null && !Number.isFinite(v)) return fail(res, 422, "Invalid deal value.");
    sets.push("value_estimate = ?");
    params.push(v);
  }
  if (b.notes !== undefined) {
    sets.push("internal_notes = ?");
    params.push(str(b.notes, 4000));
  }
  if (!sets.length) return fail(res, 400, "Nothing to update.");

  const statements: Array<[string, Args?]> = [
    [`UPDATE enquiries SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`, [...params, id] as Args],
  ];
  if (b.status !== undefined && b.status !== lead.status) {
    statements.push([
      "INSERT INTO enquiry_notes (enquiry_id, admin_id, admin_name, kind, body) VALUES (?, ?, ?, ?, ?)",
      [id, req.admin!.id, req.admin!.fullName, "status", `Status changed from ${lead.status} to ${b.status}`],
    ]);
  }
  if (b.priority !== undefined && b.priority !== lead.priority) {
    statements.push([
      "INSERT INTO enquiry_notes (enquiry_id, admin_id, admin_name, kind, body) VALUES (?, ?, ?, ?, ?)",
      [id, req.admin!.id, req.admin!.fullName, "priority", `Priority set to ${b.priority}`],
    ]);
  }
  await tx(statements);
  await audit(req, "LEAD_UPDATED", `LEAD_${id}`, Object.keys(b).join(", "));
  ok(res, await get(`SELECT ${LEAD_COLUMNS} FROM enquiries WHERE id = ?`, [id]));
});

app.post("/api/admin/enquiries/:id/notes", adminOnly, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const body = str(req.body?.body, 4000);
  if (!body) return fail(res, 422, "Note can't be empty.");
  if (!(await get("SELECT 1 FROM enquiries WHERE id = ?", [id]))) return fail(res, 404, "Lead not found.");
  const info = await addNote(id, req.admin!.id, req.admin!.fullName, "note", body);
  await run("UPDATE enquiries SET updated_at = datetime('now') WHERE id = ?", [id]);
  await audit(req, "LEAD_NOTE", `LEAD_${id}`);
  ok(res, { id: Number(info.lastInsertRowid), kind: "note", body, author: req.admin!.fullName, createdAt: new Date().toISOString() }, 201);
});

app.delete("/api/admin/enquiries/:id", adminOnly, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const info = await run("DELETE FROM enquiries WHERE id = ?", [id]);
  if (!info.changes) return fail(res, 404, "Lead not found.");
  await audit(req, "LEAD_DELETED", `LEAD_${id}`);
  ok(res);
});

/* ------------------------------------------------------------------ */
/* Admin — bookings                                                   */
/* ------------------------------------------------------------------ */
const BOOKING_COLUMNS = `id, reference, name, email, phone, company_name AS companyName, topic, budget_range AS budget, notes,
  slot_date AS date, slot_time AS time, timezone, status, meeting_link AS meetingLink, internal_notes AS internalNotes,
  enquiry_id AS enquiryId, created_at AS createdAt, updated_at AS updatedAt`;

app.get("/api/admin/bookings", adminOnly, async (_req, res) => {
  ok(res, await all(`SELECT ${BOOKING_COLUMNS} FROM bookings ORDER BY slot_date DESC, slot_time DESC`));
});

app.patch("/api/admin/bookings/:id", adminOnly, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const booking = await get<{ status: string }>("SELECT * FROM bookings WHERE id = ?", [id]);
  if (!booking) return fail(res, 404, "Booking not found.");
  const b = req.body ?? {};
  const sets: string[] = [];
  const params: unknown[] = [];
  if (b.status !== undefined) {
    if (!(BOOKING_STATUSES as readonly string[]).includes(b.status)) return fail(res, 422, "Invalid status.");
    sets.push("status = ?");
    params.push(b.status);
  }
  if (b.meetingLink !== undefined) {
    const link = str(b.meetingLink, 300);
    if (link && !/^https?:\/\//i.test(link)) return fail(res, 422, "Meeting link must start with http:// or https://");
    sets.push("meeting_link = ?");
    params.push(link);
  }
  if (b.internalNotes !== undefined) {
    sets.push("internal_notes = ?");
    params.push(str(b.internalNotes, 4000));
  }
  if (b.date !== undefined || b.time !== undefined) {
    const date = str(b.date, 10);
    const time = str(b.time, 12);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) return fail(res, 422, "Provide both a valid date and time.");
    sets.push("slot_date = ?", "slot_time = ?");
    params.push(date, time);
  }
  if (!sets.length) return fail(res, 400, "Nothing to update.");
  try {
    await run(`UPDATE bookings SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`, [...params, id] as Args);
  } catch (err) {
    if (String((err as Error).message).includes("UNIQUE")) return fail(res, 409, "Another call is already booked in that slot.");
    throw err;
  }
  await audit(req, "BOOKING_UPDATED", `BOOKING_${id}`, Object.keys(b).join(", "));
  ok(res, await get(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = ?`, [id]));
});

app.delete("/api/admin/bookings/:id", adminOnly, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const info = await run("DELETE FROM bookings WHERE id = ?", [id]);
  if (!info.changes) return fail(res, 404, "Booking not found.");
  await audit(req, "BOOKING_DELETED", `BOOKING_${id}`);
  ok(res);
});

/* ------------------------------------------------------------------ */
/* Admin — subscribers                                                */
/* ------------------------------------------------------------------ */
app.get("/api/admin/subscribers", adminOnly, async (_req, res) => {
  ok(res, await all("SELECT id, email, source, created_at AS createdAt FROM subscribers ORDER BY id DESC"));
});

app.delete("/api/admin/subscribers/:id", adminOnly, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const info = await run("DELETE FROM subscribers WHERE id = ?", [id]);
  if (!info.changes) return fail(res, 404, "Subscriber not found.");
  await audit(req, "SUBSCRIBER_DELETED", `SUBSCRIBER_${id}`);
  ok(res);
});

/* ------------------------------------------------------------------ */
/* Admin — CMS collections                                            */
/* ------------------------------------------------------------------ */
const REQUIRED: Record<CollectionName, string[]> = {
  services: ["title"],
  projects: ["title", "summary"],
  packages: ["name", "price"],
  team: ["name", "role"],
  testimonials: ["name", "quote"],
  faqs: ["q", "a"],
  process: ["title"],
  techStack: ["title"],
  guarantees: ["title"],
  whyUs: ["title"],
  rhythm: ["title"],
  milestones: ["title", "year"],
  insights: ["title", "excerpt"],
};

function collectionParam(req: Request, res: Response): CollectionName | null {
  const name = String(req.params.collection);
  if (!isCollection(name)) {
    fail(res, 404, "Unknown collection.");
    return null;
  }
  return name;
}

function validateDoc(name: CollectionName, data: unknown): string | null {
  if (!isPlainObject(data)) return "Content must be an object.";
  if (JSON.stringify(data).length > 200_000) return "This entry is too large.";
  for (const field of REQUIRED[name]) {
    const v = data[field];
    if (typeof v !== "string" || !v.trim()) return `"${field}" is required.`;
  }
  return null;
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

app.get("/api/admin/content/:collection", anyAdmin, async (req, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  ok(res, (await contentQ.listAll(name)).map(parseRow));
});

app.post("/api/admin/content/:collection", anyAdmin, async (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  const data = req.body?.data;
  const error = validateDoc(name, data);
  if (error) return fail(res, 422, error);
  const doc = data as Record<string, unknown>;
  const base = str(req.body?.id, 80) || str(doc.id, 80) || slugify(String(doc.title ?? doc.name ?? doc.q ?? "item"));
  let id = slugify(base) || `item-${Date.now().toString(36)}`;
  while (await contentQ.get(name, id)) id = `${slugify(base).slice(0, 70)}-${crypto.randomBytes(2).toString("hex")}`;
  if (!ID_RE.test(id)) return fail(res, 422, "Invalid ID — use lowercase letters, numbers and dashes.");
  const { m } = (await contentQ.maxSort(name)) ?? { m: 0 };
  await contentQ.insert({
    collection: name,
    id,
    data: JSON.stringify({ ...doc, id }),
    sort_order: m + 10,
    published: req.body?.published === false ? 0 : 1,
  });
  await audit(req, "CONTENT_CREATED", `${name}/${id}`, String(doc.title ?? doc.name ?? doc.q ?? ""));
  ok(res, parseRow((await contentQ.get(name, id)) as ContentRow), 201);
});

app.put("/api/admin/content/:collection/:id", anyAdmin, async (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  const currentId = String(req.params.id);
  const row = await contentQ.get(name, currentId);
  if (!row) return fail(res, 404, "Entry not found.");
  const data = req.body?.data;
  const error = validateDoc(name, data);
  if (error) return fail(res, 422, error);

  let id = currentId;
  const requested = str(req.body?.newId, 80);
  if (requested && requested !== currentId) {
    if (!ID_RE.test(requested)) return fail(res, 422, "Invalid ID — use lowercase letters, numbers and dashes.");
    if (await contentQ.get(name, requested)) return fail(res, 409, "Another entry already uses that ID.");
    await contentQ.rename(requested, name, currentId);
    id = requested;
  }
  await contentQ.update({
    collection: name,
    id,
    data: JSON.stringify({ ...(data as object), id }),
    published: req.body?.published === undefined ? row.published : req.body.published ? 1 : 0,
    sort_order: Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : row.sort_order,
  });
  await audit(req, "CONTENT_UPDATED", `${name}/${id}`);
  ok(res, parseRow((await contentQ.get(name, id)) as ContentRow));
});

app.delete("/api/admin/content/:collection/:id", anyAdmin, async (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  const info = await contentQ.remove(name, String(req.params.id));
  if (!info.changes) return fail(res, 404, "Entry not found.");
  await audit(req, "CONTENT_DELETED", `${name}/${req.params.id}`);
  ok(res);
});

app.post("/api/admin/content/:collection/reorder", anyAdmin, async (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).map(String) : [];
  if (!ids.length) return fail(res, 422, "Provide the new order as an array of IDs.");
  await tx(
    ids.map((id, i) => [
      "UPDATE content SET sort_order = ?, updated_at = datetime('now') WHERE collection = ? AND id = ?",
      [(i + 1) * 10, name, id],
    ]),
  );
  await audit(req, "CONTENT_REORDERED", name);
  ok(res, (await contentQ.listAll(name)).map(parseRow));
});

app.post("/api/admin/content/:collection/reset", adminOnly, async (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  await seedCollection(name);
  await audit(req, "CONTENT_RESET", name, "Restored shipped defaults");
  ok(res, (await contentQ.listAll(name)).map(parseRow));
});

/* ------------------------------------------------------------------ */
/* Admin — media uploads                                              */
/* ------------------------------------------------------------------ */
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 120, message: "Too many uploads — please wait a few minutes." });

/**
 * Raw image bytes in the request body (Content-Type is the image type).
 * The browser downscales and re-encodes before sending, so payloads stay small.
 */
app.post(
  "/api/admin/media",
  anyAdmin,
  uploadLimiter,
  express.raw({ type: Object.keys(MEDIA_TYPES), limit: MEDIA_MAX_BYTES }),
  async (req: AuthedRequest, res) => {
    const mime = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    const ext = MEDIA_TYPES[mime];
    if (!ext) return fail(res, 415, "Please upload a JPG, PNG, WebP, AVIF or GIF image.");
    const buf = Buffer.isBuffer(req.body) ? req.body : null;
    if (!buf?.length) return fail(res, 422, "The upload was empty — please choose the file again.");
    if (buf.length > MEDIA_MAX_BYTES) return fail(res, 413, "Images must be 4 MB or smaller.");
    if (!sniffImage(buf, mime)) return fail(res, 415, "That file doesn't look like a real image.");

    const original = str(req.query.name, 120) || `image.${ext}`;
    const base = slugify(original.replace(/\.[a-z0-9]+$/i, "")).slice(0, 64) || "image";
    const id = `${base}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    await run("INSERT INTO media (id, filename, mime_type, bytes, data, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)", [
      id,
      original,
      mime,
      buf.length,
      new Uint8Array(buf),
      req.admin!.email,
    ]);
    await audit(req, "MEDIA_UPLOADED", `MEDIA_${id}`, `${mime} · ${Math.round(buf.length / 1024)} kB`);
    // `path` is relative to the API base so the client can build the right URL.
    ok(res, { id, path: `/media/${id}`, bytes: buf.length, mimeType: mime }, 201);
  },
);

app.get("/api/admin/media", anyAdmin, async (_req, res) => {
  ok(
    res,
    (await all<{ id: string; filename: string; mimeType: string; bytes: number; createdAt: string }>(
      "SELECT id, filename, mime_type AS mimeType, bytes, created_at AS createdAt FROM media ORDER BY created_at DESC LIMIT 200",
    )).map((row) => ({ ...row, path: `/media/${row.id}` })),
  );
});

app.delete("/api/admin/media/:id", adminOnly, async (req: AuthedRequest, res) => {
  const id = String(req.params.id).toLowerCase();
  if (!MEDIA_ID_RE.test(id)) return fail(res, 404, "Image not found.");
  const info = await run("DELETE FROM media WHERE id = ?", [id]);
  if (!info.changes) return fail(res, 404, "Image not found.");
  mediaCacheBytes -= mediaCache.get(id)?.body.length ?? 0;
  mediaCache.delete(id);
  await audit(req, "MEDIA_DELETED", `MEDIA_${id}`);
  ok(res);
});

/* ------------------------------------------------------------------ */
/* Admin — settings                                                   */
/* ------------------------------------------------------------------ */
app.get("/api/admin/settings", anyAdmin, async (_req, res) => {
  ok(res, { site: await siteSettings(), advanced: await advancedSettings() });
});

app.put("/api/admin/settings/:key", adminOnly, async (req: AuthedRequest, res) => {
  const key = req.params.key;
  if (key !== "site" && key !== "advanced") return fail(res, 404, "Unknown settings group.");
  const value = req.body?.value;
  if (!isPlainObject(value)) return fail(res, 422, "Settings must be an object.");
  if (JSON.stringify(value).length > 300_000) return fail(res, 422, "Settings document is too large.");
  if (key === "site") {
    const s = value as Partial<SiteSettings>;
    if (s.email !== undefined && !isEmail(String(s.email))) return fail(res, 422, "Please provide a valid contact email.");
    if (s.whatsapp !== undefined && !/^\d{8,15}$/.test(String(s.whatsapp))) {
      return fail(res, 422, "WhatsApp must be digits only, with country code (e.g. 918447859784).");
    }
    if (s.booking?.slots !== undefined && (!Array.isArray(s.booking.slots) || !s.booking.slots.length)) {
      return fail(res, 422, "Provide at least one booking time slot.");
    }
  }
  if (key === "advanced") {
    const a = value as Partial<AdvancedSettings>;
    if (a.estimator && (!Array.isArray(a.estimator.types) || !a.estimator.types.length)) {
      return fail(res, 422, "The estimator needs at least one project type.");
    }
    if (a.budgetRanges && !Array.isArray(a.budgetRanges)) return fail(res, 422, "budgetRanges must be an array.");
  }
  await writeSetting(key, deepMerge(key === "site" ? await siteSettings() : await advancedSettings(), value));
  await audit(req, "SETTINGS_UPDATED", `SETTINGS_${key.toUpperCase()}`);
  ok(res, key === "site" ? await siteSettings() : await advancedSettings());
});

/* ------------------------------------------------------------------ */
/* Admin — audit, users, export                                       */
/* ------------------------------------------------------------------ */
app.get("/api/admin/audit", adminOnly, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 10), 500);
  ok(res, await all("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", [limit]));
});

app.get("/api/admin/users", ownerOnly, async (_req, res) => {
  ok(res, (await userQ.list()).map((u) => ({
    ...publicUser(u),
    active: u.active === 1,
    createdAt: u.created_at,
  })));
});

app.post("/api/admin/users", ownerOnly, async (req: AuthedRequest, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  const fullName = str(req.body?.fullName, 120);
  const role = String(req.body?.role ?? "editor") as AdminRole;
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!isEmail(email)) return fail(res, 422, "Please provide a valid email.");
  if (fullName.length < 2) return fail(res, 422, "Please provide the person's name.");
  if (!(ADMIN_ROLES as readonly string[]).includes(role)) return fail(res, 422, "Invalid role.");
  if (password.length < 10) return fail(res, 422, "Temporary password must be at least 10 characters.");
  if (await userQ.byEmail(email)) return fail(res, 409, "A user with that email already exists.");
  const { hash, salt } = hashPassword(password);
  const info = await run("INSERT INTO admin_users (email, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, ?)", [
    email,
    hash,
    salt,
    fullName,
    role,
  ]);
  await audit(req, "USER_CREATED", `USER_${info.lastInsertRowid}`, `${email} as ${role}`);
  ok(res, { id: Number(info.lastInsertRowid) }, 201);
});

app.patch("/api/admin/users/:id", ownerOnly, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const user = await userQ.byId<{ id: number; role: AdminRole; active: number }>(id);
  if (!user) return fail(res, 404, "User not found.");
  const b = req.body ?? {};
  const demotingOwner =
    user.role === "owner" && ((b.role !== undefined && b.role !== "owner") || b.active === false);
  if (demotingOwner && ((await userQ.owners()) ?? { c: 0 }).c <= 1) {
    return fail(res, 422, "At least one active owner is required.");
  }
  if (b.role !== undefined) {
    if (!(ADMIN_ROLES as readonly string[]).includes(b.role)) return fail(res, 422, "Invalid role.");
    await run("UPDATE admin_users SET role = ? WHERE id = ?", [b.role, id]);
  }
  if (b.fullName !== undefined) await run("UPDATE admin_users SET full_name = ? WHERE id = ?", [str(b.fullName, 120), id]);
  if (b.active !== undefined) {
    await run("UPDATE admin_users SET active = ? WHERE id = ?", [b.active ? 1 : 0, id]);
    if (!b.active) await run("DELETE FROM sessions WHERE user_id = ?", [id]);
  }
  if (b.password !== undefined) {
    if (typeof b.password !== "string" || b.password.length < 10) return fail(res, 422, "Password must be at least 10 characters.");
    const { hash, salt } = hashPassword(b.password);
    await userQ.setPassword(hash, salt, id);
    await run("DELETE FROM sessions WHERE user_id = ?", [id]);
  }
  await audit(req, "USER_UPDATED", `USER_${id}`, Object.keys(b).filter((k) => k !== "password").join(", ") || "password");
  ok(res);
});

app.delete("/api/admin/users/:id", ownerOnly, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (id === req.admin!.id) return fail(res, 422, "You can't delete your own account.");
  const info = await run("DELETE FROM admin_users WHERE id = ?", [id]);
  if (!info.changes) return fail(res, 404, "User not found.");
  await audit(req, "USER_DELETED", `USER_${id}`);
  ok(res);
});

app.get("/api/admin/export", adminOnly, async (req: AuthedRequest, res) => {
  const scope = req.query.scope === "all" ? "all" : "content";
  if (scope === "all" && req.admin!.role !== "owner") return fail(res, 403, "Only owners can export customer data.");
  const collections = Object.fromEntries(
    await Promise.all(COLLECTION_NAMES.map(async (name) => [name, (await contentQ.listAll(name)).map(parseRow)])),
  );
  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    scope,
    settings: { site: await siteSettings(), advanced: await advancedSettings() },
    collections,
  };
  if (scope === "all") {
    payload.enquiries = await all(`SELECT ${LEAD_COLUMNS} FROM enquiries`);
    payload.bookings = await all(`SELECT ${BOOKING_COLUMNS} FROM bookings`);
    payload.subscribers = await all("SELECT email, source, created_at FROM subscribers");
  }
  await audit(req, "EXPORT", `EXPORT_${scope.toUpperCase()}`);
  res.setHeader("Content-Disposition", `attachment; filename="novaframe-${scope}-${dateInTz("UTC")}.json"`);
  ok(res, payload);
});

/* ------------------------------------------------------------------ */
/* Static frontend (optional: serves `npm run build` output)          */
/* ------------------------------------------------------------------ */
const distDir = path.resolve(__dirname, "..", "dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
  const assetsDir = path.join(distDir, "assets") + path.sep;
  app.use(
    express.static(distDir, {
      index: false,
      maxAge: "1h",
      setHeaders(res, filePath) {
        // Build files carry a content hash in their name, so they can be cached for good;
        // the HTML that points at them must always be revalidated so a deploy shows up at once.
        if (filePath.startsWith(assetsDir)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        else if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  // A build file that no longer exists (old tab after a deploy) is a real 404, not the HTML page.
  app.get(/^\/assets\//, (_req, res) => res.status(404).type("text/plain").send("Not found"));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use("/api", (_req, res) => fail(res, 404, "Route not found."));

app.use((err: Error & { type?: string; status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === "entity.parse.failed") return fail(res, 400, "Malformed JSON body.");
  if (err.type === "entity.too.large") return fail(res, 413, "Request body is too large.");
  console.error("[api] Unhandled error:", err);
  fail(res, 500, "Something went wrong on our side. Please try again.");
});

await initDb();

app.listen(PORT, () => {
  console.log(`\n  > Novaframe API ready:  http://localhost:${PORT}/api/health`);
  console.log(`  > Admin console:       http://localhost:5173/#/admin (dev) or this server's /#/admin`);
  console.log(`  > Email notifications: ${mailEnabled() ? `on (${mailBackend()})` : "off (set RESEND_API_KEY or SMTP_HOST to enable)"}`);
  console.log(`  > Online payments:     ${paymentsEnabled() ? `on (Razorpay ${paymentsTestMode() ? "TEST" : "LIVE"} mode)` : "off (set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)"}\n`);
  if (mailEnabled()) {
    void verifyMail().then((r) =>
      r.ok
        ? console.log(`  > Email backend ready: ${mailBackend()}${r.error ? ` — note: ${r.error}` : ""}`)
        : console.error(`  > Email backend FAILED — emails will not be delivered: ${r.error}`),
    );
  }
});

export default app;
