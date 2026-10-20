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
import { mailEnabled, notifyBooking, notifyLead, notifyPayment, verifyMail, type MailContext } from "./mailer.js";
import Razorpay from "razorpay";
import {
  TZ_MOD,
  contentQ,
  db,
  hashPassword,
  hashToken,
  isCollection,
  newReference,
  parseRow,
  readSetting,
  seedCollection,
  verifyPassword,
  writeSetting,
  type ContentRow,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const SESSION_DAYS = Number(process.env.SESSION_DAYS) || 7;

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY || "loopback, linklocal, uniquelocal");

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

const siteSettings = () => deepMerge(defaultContent.settings, readSetting<SiteSettings>("site"));
const advancedSettings = () => deepMerge(defaultContent.advanced, readSetting<AdvancedSettings>("advanced"));

/** Public site URL for links inside emails (optional, e.g. https://novaframe.studio). */
const SITE_URL = /^https?:\/\//i.test(process.env.SITE_URL ?? "") ? (process.env.SITE_URL as string).replace(/\/+$/, "") : undefined;

/** Branding + signature used by every outgoing email. */
function mailContext(): MailContext {
  const founder = (contentQ.listPublished.all("team") as ContentRow[]).map((row) => parseRow(row).data as { name?: string; role?: string })[0];
  return { settings: siteSettings(), founder: founder?.name ? { name: founder.name, role: founder.role } : undefined, siteUrl: SITE_URL };
}

/** yyyy-mm-dd for "now + offsetDays" in an IANA timezone */
function dateInTz(timeZone: string, offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function estimateValue(budgetLabel: string): number | null {
  const range = advancedSettings().budgetRanges.find((b) => b.label === budgetLabel);
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
  create: db.prepare("INSERT INTO sessions (token_hash, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)"),
  find: db.prepare(`
    SELECT s.id AS session_id, s.last_seen_at, u.id, u.email, u.full_name, u.role, u.active
    FROM sessions s JOIN admin_users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND datetime(s.expires_at) > datetime('now')
  `),
  touch: db.prepare("UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?"),
  remove: db.prepare("DELETE FROM sessions WHERE id = ?"),
  removeForUser: db.prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?"),
  listForUser: db.prepare(
    "SELECT id, ip_address, user_agent, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC",
  ),
};

const auditStmt = db.prepare(
  "INSERT INTO audit_logs (admin_id, admin_email, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
);
function audit(req: AuthedRequest, action: string, target: string, details = "") {
  auditStmt.run(req.admin?.id ?? null, req.admin?.email ?? null, action, target.slice(0, 120), details.slice(0, 500), ipOf(req));
}

function bearer(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const legacy = req.headers["x-admin-token"];
  return typeof legacy === "string" ? legacy.trim() : "";
}

function requireRole(minRole: AdminRole = "editor") {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (!token) return fail(res, 401, "Authentication required.");
    const row = sessionQ.find.get(hashToken(token)) as
      | { session_id: number; last_seen_at: string; id: number; email: string; full_name: string; role: AdminRole; active: number }
      | undefined;
    if (!row || row.active !== 1) return fail(res, 401, "Your session has expired. Please sign in again.");
    if ((ROLE_RANK[row.role] ?? 0) < ROLE_RANK[minRole]) return fail(res, 403, "Your role doesn't allow this action.");
    req.admin = { id: row.id, email: row.email, fullName: row.full_name, role: row.role, sessionId: row.session_id };
    if (Date.now() - Date.parse(row.last_seen_at + "Z") > 5 * 60 * 1000) sessionQ.touch.run(row.session_id);
    next();
  };
}

const anyAdmin = requireRole("editor");
const adminOnly = requireRole("admin");
const ownerOnly = requireRole("owner");

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */
app.get("/api/health", (_req, res) => {
  const { c } = db.prepare("SELECT count(*) AS c FROM content").get() as { c: number };
  ok(res, { service: "novaframe-api", database: "sqlite", contentItems: c, time: new Date().toISOString() });
});

function publishedCollection(name: CollectionName) {
  return (contentQ.listPublished.all(name) as ContentRow[]).map((row) => parseRow(row).data);
}

app.get("/api/content", (_req, res) => {
  const collections = Object.fromEntries(COLLECTION_NAMES.map((name) => [name, publishedCollection(name)]));
  const { t } = contentQ.lastUpdate.get() as { t: string | null };
  res.setHeader("Cache-Control", "no-cache");
  ok(res, { settings: siteSettings(), advanced: advancedSettings(), collections, version: t ?? "" });
});

app.get("/api/content/:collection", (req, res) => {
  const name = req.params.collection;
  if (!isCollection(name)) return fail(res, 404, "Unknown collection.");
  ok(res, publishedCollection(name));
});

const insertEnquiry = db.prepare(`
  INSERT INTO enquiries (reference, name, company_name, email, phone, service, budget_range, timeline,
    project_details, source, value_estimate, ip_address, user_agent)
  VALUES (@reference, @name, @company, @email, @phone, @service, @budget, @timeline,
    @details, @source, @value, @ip, @ua)
`);

app.post("/api/enquiries", formLimiter, (req, res) => {
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
  insertEnquiry.run({ ...lead, value: estimateValue(budget), ip: ipOf(req), ua: uaOf(req) });
  notifyLead(lead, mailContext()).catch((err) => console.error("[mail] lead notification failed:", (err as Error).message));
  ok(res, { reference, message: "Enquiry received. We reply within 12 business hours.", mail: mailEnabled() }, 201);
});

app.get("/api/bookings/availability", (req, res) => {
  const settings = siteSettings();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from)) ? String(req.query.from) : dateInTz(settings.timezone);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to)) ? String(req.query.to) : dateInTz(settings.timezone, 45);
  const rows = db
    .prepare(
      "SELECT slot_date, slot_time FROM bookings WHERE slot_date BETWEEN ? AND ? AND status IN ('scheduled','confirmed')",
    )
    .all(from, to) as { slot_date: string; slot_time: string }[];
  const taken: Record<string, string[]> = {};
  for (const r of rows) (taken[r.slot_date] ??= []).push(r.slot_time);
  ok(res, { taken, slots: settings.booking.slots, timezone: settings.timezone });
});

const insertBooking = db.prepare(`
  INSERT INTO bookings (reference, name, email, phone, company_name, topic, budget_range, notes, slot_date, slot_time,
    timezone, enquiry_id, ip_address, user_agent)
  VALUES (@reference, @name, @email, @phone, @company, @topic, @budget, @notes, @date, @time, @tz, @enquiryId, @ip, @ua)
`);

app.post("/api/bookings", formLimiter, (req, res) => {
  const b = req.body ?? {};
  if (str(b.website, 200)) return ok(res, { reference: newReference("NFC") }, 201);

  const settings = siteSettings();
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

  try {
    db.transaction(() => {
      const enquiry = insertEnquiry.run({
        reference: newReference("NF"),
        name,
        company,
        email,
        phone,
        service: `Discovery call — ${topic}`,
        budget: budget || "To discuss on call",
        timeline: `Call booked for ${date} · ${time} ${settings.timezoneLabel}`,
        details: notes || `Discovery call requested about: ${topic}.`,
        source: "booking",
        value: estimateValue(budget),
        ip: ipOf(req),
        ua: uaOf(req),
      });
      insertBooking.run({
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
        enquiryId: Number(enquiry.lastInsertRowid),
        ip: ipOf(req),
        ua: uaOf(req),
      });
    })();
  } catch (err) {
    if (String((err as Error).message).includes("UNIQUE")) {
      return fail(res, 409, "That slot was just taken — please pick another time.", { errors: { time: "Slot taken" } });
    }
    throw err;
  }
  notifyBooking({ reference, name, email, phone, company, topic, budget, date, time, notes }, mailContext()).catch((err) =>
    console.error("[mail] booking notification failed:", (err as Error).message),
  );
  ok(
    res,
    { reference, date, time, timezone: settings.timezoneLabel, durationMinutes: settings.booking.durationMinutes, mail: mailEnabled() },
    201,
  );
});

app.post("/api/subscribe", subscribeLimiter, (req, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  if (!isEmail(email)) return fail(res, 422, "Please enter a valid email address.");
  const info = db
    .prepare("INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)")
    .run(email, str(req.body?.source, 40) || "footer");
  ok(res, { subscribed: true, existing: info.changes === 0 });
});

app.post("/api/events", eventLimiter, (req, res) => {
  const name = str(req.body?.name, 40).replace(/[^a-z0-9_:-]/gi, "");
  if (!name) return fail(res, 422, "Event name required.");
  let meta = "";
  if (isPlainObject(req.body?.meta)) meta = JSON.stringify(req.body.meta).slice(0, 1000);
  db.prepare("INSERT INTO events (name, path, session_id, referrer, meta) VALUES (?, ?, ?, ?, ?)").run(
    name,
    str(req.body?.path, 200),
    str(req.body?.sid, 64),
    str(req.body?.referrer, 300),
    meta || null,
  );
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
  insert: db.prepare(`
    INSERT INTO payments (reference, razorpay_order_id, name, email, phone, company_name, purpose, amount, currency, enquiry_id, ip_address, user_agent)
    VALUES (@reference, @orderId, @name, @email, @phone, @company, @purpose, @amount, @currency, @enquiryId, @ip, @ua)
  `),
  byOrder: db.prepare("SELECT * FROM payments WHERE razorpay_order_id = ?"),
  // Only the first successful confirmation flips the row — that caller sends the emails.
  markPaid: db.prepare(`
    UPDATE payments SET status = 'paid', razorpay_payment_id = @paymentId, method = coalesce(@method, method),
      paid_at = datetime('now'), updated_at = datetime('now')
    WHERE razorpay_order_id = @orderId AND status != 'paid'
  `),
  setMethod: db.prepare("UPDATE payments SET method = ?, updated_at = datetime('now') WHERE razorpay_order_id = ? AND method IS NULL"),
  leadPaid: db.prepare("UPDATE enquiries SET project_details = ?, updated_at = datetime('now') WHERE id = ?"),
  leadNote: db.prepare("INSERT INTO enquiry_notes (enquiry_id, admin_name, kind, body) VALUES (?, 'Razorpay', 'payment', ?)"),
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
  const row = paymentQ.byOrder.get(orderId) as PaymentRow | undefined;
  if (!row) return null;
  const method = row.status === "paid" && row.method ? row.method : await inspectPayment(paymentId, row);
  const first = paymentQ.markPaid.run({ orderId, paymentId, method }).changes === 1;
  if (!first && method) paymentQ.setMethod.run(method, orderId);
  const fresh = paymentQ.byOrder.get(orderId) as PaymentRow;

  if (first) {
    const amountLabel = `${fresh.currency} ${fresh.amount.toLocaleString("en-IN")}`;
    if (fresh.enquiry_id) {
      paymentQ.leadPaid.run(
        `Online payment received: ${amountLabel} for "${fresh.purpose}"${method ? ` via ${method}` : ""}. Receipt ${fresh.reference} · Razorpay ${paymentId}.`,
        fresh.enquiry_id,
      );
      paymentQ.leadNote.run(fresh.enquiry_id, `Payment received — ${amountLabel}${method ? ` via ${method}` : ""} · ${paymentId}${paymentsTestMode() ? " (test mode)" : ""}`);
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
      mailContext(),
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
  if (rupees > 5_000_000) errors.amount = "That amount is too large — please contact us for large invoices.";
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
    const enquiry = insertEnquiry.run({
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

    paymentQ.insert.run({
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

  if (!paymentQ.byOrder.get(orderId)) return fail(res, 404, "We couldn't find this order. Please contact us with your payment ID.");

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
  byEmail: db.prepare("SELECT * FROM admin_users WHERE email = ?"),
  byId: db.prepare("SELECT * FROM admin_users WHERE id = ?"),
  list: db.prepare("SELECT id, email, full_name, role, active, last_login_at, created_at FROM admin_users ORDER BY id ASC"),
  lastLogin: db.prepare("UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?"),
  setPassword: db.prepare("UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?"),
  owners: db.prepare("SELECT count(*) AS c FROM admin_users WHERE role = 'owner' AND active = 1"),
};
const DUMMY = hashPassword("timing-safe-placeholder");

const publicUser = (u: { id: number; email: string; full_name: string; role: string; last_login_at?: string | null }) => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  role: u.role,
  lastLoginAt: u.last_login_at ?? null,
});

app.post("/api/admin/login", loginLimiter, (req: AuthedRequest, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) return fail(res, 400, "Email and password are required.");

  const user = userQ.byEmail.get(email) as
    | { id: number; email: string; full_name: string; role: AdminRole; password_hash: string; salt: string; active: number; last_login_at: string | null }
    | undefined;
  // Always run one PBKDF2 check so response timing doesn't reveal whether the email exists.
  const valid = user
    ? verifyPassword(password, user.password_hash, user.salt)
    : (verifyPassword(password, DUMMY.hash, DUMMY.salt), false);
  if (!user || !valid || user.active !== 1) {
    auditStmt.run(user?.id ?? null, email, "LOGIN_FAILED", "AUTH", "Invalid credentials", ipOf(req));
    return fail(res, 401, "Invalid email or password.");
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString().replace("T", " ").slice(0, 19);
  sessionQ.create.run(hashToken(token), user.id, ipOf(req), uaOf(req), expiresAt);
  userQ.lastLogin.run(user.id);
  req.admin = { id: user.id, email: user.email, fullName: user.full_name, role: user.role, sessionId: 0 };
  audit(req, "LOGIN", "AUTH", "Signed in");
  ok(res, { token, expiresAt, user: publicUser(user) });
});

app.get("/api/admin/me", anyAdmin, (req: AuthedRequest, res) => {
  const user = userQ.byId.get(req.admin!.id) as Parameters<typeof publicUser>[0];
  ok(res, { user: publicUser(user) });
});

app.post("/api/admin/logout", anyAdmin, (req: AuthedRequest, res) => {
  sessionQ.remove.run(req.admin!.sessionId);
  audit(req, "LOGOUT", "AUTH", "Signed out");
  ok(res);
});

app.post("/api/admin/password", anyAdmin, (req: AuthedRequest, res) => {
  const current = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const next = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  const user = userQ.byId.get(req.admin!.id) as { password_hash: string; salt: string };
  if (!verifyPassword(current, user.password_hash, user.salt)) return fail(res, 400, "Your current password is incorrect.");
  if (next.length < 10) return fail(res, 422, "The new password must be at least 10 characters.");
  const { hash, salt } = hashPassword(next);
  userQ.setPassword.run(hash, salt, req.admin!.id);
  sessionQ.removeForUser.run(req.admin!.id, req.admin!.sessionId);
  audit(req, "PASSWORD_CHANGED", `USER_${req.admin!.id}`, "Password changed; other sessions revoked");
  ok(res);
});

app.get("/api/admin/sessions", anyAdmin, (req: AuthedRequest, res) => {
  const rows = sessionQ.listForUser.all(req.admin!.id) as { id: number }[];
  ok(res, rows.map((r) => ({ ...r, current: r.id === req.admin!.sessionId })));
});

app.delete("/api/admin/sessions/:id", anyAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?").run(id, req.admin!.id);
  if (!info.changes) return fail(res, 404, "Session not found.");
  audit(req, "SESSION_REVOKED", `SESSION_${id}`);
  ok(res);
});

/* ------------------------------------------------------------------ */
/* Admin — dashboard & analytics                                      */
/* ------------------------------------------------------------------ */
function dailySeries(sql: string, days: number, ...params: unknown[]) {
  const rows = db.prepare(sql).all(...params) as { day: string; c: number }[];
  const map = new Map(rows.map((r) => [r.day, r.c]));
  const tz = siteSettings().timezone;
  return Array.from({ length: days }, (_, i) => {
    const day = dateInTz(tz, i - days + 1);
    return { date: day, count: map.get(day) ?? 0 };
  });
}

app.get("/api/admin/overview", adminOnly, (_req, res) => {
  const settings = siteSettings();
  const today = dateInTz(settings.timezone);
  const one = <T>(sql: string, ...params: unknown[]) => db.prepare(sql).get(...params) as T;

  const leads = one<{ total: number; fresh: number; won: number; lost: number; last7: number; prev7: number; pipeline: number | null; wonValue: number | null }>(`
    SELECT count(*) AS total,
      sum(status = 'new') AS fresh,
      sum(status = 'won') AS won,
      sum(status = 'lost') AS lost,
      sum(datetime(created_at) >= datetime('now', '-7 days')) AS last7,
      sum(datetime(created_at) < datetime('now', '-7 days') AND datetime(created_at) >= datetime('now', '-14 days')) AS prev7,
      sum(CASE WHEN status IN ('new','contacted','qualified','proposal') THEN coalesce(value_estimate, 0) END) AS pipeline,
      sum(CASE WHEN status = 'won' THEN coalesce(value_estimate, 0) END) AS wonValue
    FROM enquiries`);
  const traffic = one<{ views: number; visitors: number }>(`
    SELECT count(*) AS views, count(DISTINCT session_id) AS visitors FROM events
    WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', '-7 days')`);
  const subs = one<{ total: number; last7: number }>(`
    SELECT count(*) AS total, sum(datetime(created_at) >= datetime('now', '-7 days')) AS last7 FROM subscribers`);
  const upcoming = one<{ c: number }>(
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
    leadsSeries: dailySeries(
      `SELECT date(created_at, '${TZ_MOD}') AS day, count(*) AS c FROM enquiries
       WHERE datetime(created_at) >= datetime('now', '-31 days') GROUP BY day`,
      30,
    ),
    viewsSeries: dailySeries(
      `SELECT date(created_at, '${TZ_MOD}') AS day, count(*) AS c FROM events
       WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', '-31 days') GROUP BY day`,
      30,
    ),
    pipeline: db
      .prepare("SELECT status, count(*) AS count, coalesce(sum(value_estimate), 0) AS value FROM enquiries GROUP BY status")
      .all(),
    sources: db.prepare("SELECT source, count(*) AS count FROM enquiries GROUP BY source ORDER BY count DESC").all(),
    services: db
      .prepare("SELECT service, count(*) AS count FROM enquiries GROUP BY service ORDER BY count DESC LIMIT 6")
      .all(),
    upcomingBookings: db
      .prepare(
        `SELECT id, reference, name, company_name AS companyName, topic, slot_date AS date, slot_time AS time, status, meeting_link AS meetingLink
         FROM bookings WHERE slot_date >= ? AND status IN ('scheduled','confirmed') ORDER BY slot_date, slot_time LIMIT 6`,
      )
      .all(today),
    recentLeads: db
      .prepare(
        `SELECT id, reference, name, company_name AS companyName, service, budget_range AS budget, status, priority, created_at AS createdAt
         FROM enquiries ORDER BY datetime(created_at) DESC, id DESC LIMIT 6`,
      )
      .all(),
    recentActivity: db.prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 8").all(),
    content: contentQ.counts.all(),
  });
});

app.get("/api/admin/analytics", adminOnly, (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 180);
  const since = `-${days} days`;
  const series = dailySeries(
    `SELECT date(created_at, '${TZ_MOD}') AS day, count(*) AS c FROM events
     WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', ?) GROUP BY day`,
    days,
    since,
  );
  const visitors = dailySeries(
    `SELECT date(created_at, '${TZ_MOD}') AS day, count(DISTINCT session_id) AS c FROM events
     WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', ?) GROUP BY day`,
    days,
    since,
  );
  const totals = db
    .prepare(
      `SELECT count(*) AS views, count(DISTINCT session_id) AS visitors FROM events
       WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', ?)`,
    )
    .get(since) as { views: number; visitors: number };
  const leads = db
    .prepare("SELECT count(*) AS c FROM enquiries WHERE datetime(created_at) >= datetime('now', ?)")
    .get(since) as { c: number };
  ok(res, {
    days,
    totals: { ...totals, leads: leads.c, conversion: totals.visitors ? +((leads.c / totals.visitors) * 100).toFixed(2) : 0 },
    series: series.map((s, i) => ({ date: s.date, views: s.count, visitors: visitors[i]?.count ?? 0 })),
    topPages: db
      .prepare(
        `SELECT path, count(*) AS views FROM events WHERE name = 'page_view' AND datetime(created_at) >= datetime('now', ?)
         GROUP BY path ORDER BY views DESC LIMIT 10`,
      )
      .all(since),
    topEvents: db
      .prepare(
        `SELECT name, count(*) AS count FROM events WHERE name != 'page_view' AND datetime(created_at) >= datetime('now', ?)
         GROUP BY name ORDER BY count DESC LIMIT 10`,
      )
      .all(since),
    ctas: db
      .prepare(
        `SELECT coalesce(json_extract(meta, '$.label'), 'unknown') AS label, count(*) AS count FROM events
         WHERE name = 'cta_click' AND datetime(created_at) >= datetime('now', ?) GROUP BY label ORDER BY count DESC LIMIT 10`,
      )
      .all(since),
    referrers: db
      .prepare(
        `SELECT referrer, count(*) AS count FROM events
         WHERE name = 'page_view' AND referrer IS NOT NULL AND referrer != '' AND datetime(created_at) >= datetime('now', ?)
         GROUP BY referrer ORDER BY count DESC LIMIT 8`,
      )
      .all(since),
  });
});

/* ------------------------------------------------------------------ */
/* Admin — leads CRM                                                  */
/* ------------------------------------------------------------------ */
const LEAD_COLUMNS = `id, reference, name, company_name AS companyName, email, phone, service, budget_range AS budget, timeline,
  project_details AS details, status, priority, value_estimate AS valueEstimate, internal_notes AS notes, source,
  created_at AS createdAt, updated_at AS updatedAt`;

app.get("/api/admin/enquiries", adminOnly, (_req, res) => {
  ok(res, db.prepare(`SELECT ${LEAD_COLUMNS} FROM enquiries ORDER BY datetime(created_at) DESC, id DESC`).all());
});

app.get("/api/admin/enquiries/:id", adminOnly, (req, res) => {
  const id = Number(req.params.id);
  const lead = db.prepare(`SELECT ${LEAD_COLUMNS} FROM enquiries WHERE id = ?`).get(id);
  if (!lead) return fail(res, 404, "Lead not found.");
  const notes = db
    .prepare("SELECT id, kind, body, admin_name AS author, created_at AS createdAt FROM enquiry_notes WHERE enquiry_id = ? ORDER BY id DESC")
    .all(id);
  const booking = db
    .prepare("SELECT id, reference, slot_date AS date, slot_time AS time, status FROM bookings WHERE enquiry_id = ?")
    .get(id);
  ok(res, { ...(lead as object), activity: notes, booking: booking ?? null });
});

const addNote = db.prepare("INSERT INTO enquiry_notes (enquiry_id, admin_id, admin_name, kind, body) VALUES (?, ?, ?, ?, ?)");

app.patch("/api/admin/enquiries/:id", adminOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const lead = db.prepare("SELECT status, priority FROM enquiries WHERE id = ?").get(id) as { status: string; priority: string } | undefined;
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

  db.transaction(() => {
    db.prepare(`UPDATE enquiries SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...params, id);
    if (b.status !== undefined && b.status !== lead.status) {
      addNote.run(id, req.admin!.id, req.admin!.fullName, "status", `Status changed from ${lead.status} to ${b.status}`);
    }
    if (b.priority !== undefined && b.priority !== lead.priority) {
      addNote.run(id, req.admin!.id, req.admin!.fullName, "priority", `Priority set to ${b.priority}`);
    }
  })();
  audit(req, "LEAD_UPDATED", `LEAD_${id}`, Object.keys(b).join(", "));
  ok(res, db.prepare(`SELECT ${LEAD_COLUMNS} FROM enquiries WHERE id = ?`).get(id));
});

app.post("/api/admin/enquiries/:id/notes", adminOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const body = str(req.body?.body, 4000);
  if (!body) return fail(res, 422, "Note can't be empty.");
  if (!db.prepare("SELECT 1 FROM enquiries WHERE id = ?").get(id)) return fail(res, 404, "Lead not found.");
  const info = addNote.run(id, req.admin!.id, req.admin!.fullName, "note", body);
  db.prepare("UPDATE enquiries SET updated_at = datetime('now') WHERE id = ?").run(id);
  audit(req, "LEAD_NOTE", `LEAD_${id}`);
  ok(res, { id: Number(info.lastInsertRowid), kind: "note", body, author: req.admin!.fullName, createdAt: new Date().toISOString() }, 201);
});

app.delete("/api/admin/enquiries/:id", adminOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM enquiries WHERE id = ?").run(id);
  if (!info.changes) return fail(res, 404, "Lead not found.");
  audit(req, "LEAD_DELETED", `LEAD_${id}`);
  ok(res);
});

/* ------------------------------------------------------------------ */
/* Admin — bookings                                                   */
/* ------------------------------------------------------------------ */
const BOOKING_COLUMNS = `id, reference, name, email, phone, company_name AS companyName, topic, budget_range AS budget, notes,
  slot_date AS date, slot_time AS time, timezone, status, meeting_link AS meetingLink, internal_notes AS internalNotes,
  enquiry_id AS enquiryId, created_at AS createdAt, updated_at AS updatedAt`;

app.get("/api/admin/bookings", adminOnly, (_req, res) => {
  ok(res, db.prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings ORDER BY slot_date DESC, slot_time DESC`).all());
});

app.patch("/api/admin/bookings/:id", adminOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as { status: string } | undefined;
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
    db.prepare(`UPDATE bookings SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...params, id);
  } catch (err) {
    if (String((err as Error).message).includes("UNIQUE")) return fail(res, 409, "Another call is already booked in that slot.");
    throw err;
  }
  audit(req, "BOOKING_UPDATED", `BOOKING_${id}`, Object.keys(b).join(", "));
  ok(res, db.prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = ?`).get(id));
});

app.delete("/api/admin/bookings/:id", adminOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  if (!info.changes) return fail(res, 404, "Booking not found.");
  audit(req, "BOOKING_DELETED", `BOOKING_${id}`);
  ok(res);
});

/* ------------------------------------------------------------------ */
/* Admin — subscribers                                                */
/* ------------------------------------------------------------------ */
app.get("/api/admin/subscribers", adminOnly, (_req, res) => {
  ok(res, db.prepare("SELECT id, email, source, created_at AS createdAt FROM subscribers ORDER BY id DESC").all());
});

app.delete("/api/admin/subscribers/:id", adminOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM subscribers WHERE id = ?").run(id);
  if (!info.changes) return fail(res, 404, "Subscriber not found.");
  audit(req, "SUBSCRIBER_DELETED", `SUBSCRIBER_${id}`);
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

app.get("/api/admin/content/:collection", anyAdmin, (req, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  ok(res, (contentQ.listAll.all(name) as ContentRow[]).map(parseRow));
});

app.post("/api/admin/content/:collection", anyAdmin, (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  const data = req.body?.data;
  const error = validateDoc(name, data);
  if (error) return fail(res, 422, error);
  const doc = data as Record<string, unknown>;
  const base = str(req.body?.id, 80) || str(doc.id, 80) || slugify(String(doc.title ?? doc.name ?? doc.q ?? "item"));
  let id = slugify(base) || `item-${Date.now().toString(36)}`;
  while (contentQ.get.get(name, id)) id = `${slugify(base).slice(0, 70)}-${crypto.randomBytes(2).toString("hex")}`;
  if (!ID_RE.test(id)) return fail(res, 422, "Invalid ID — use lowercase letters, numbers and dashes.");
  const { m } = contentQ.maxSort.get(name) as { m: number };
  contentQ.insert.run({
    collection: name,
    id,
    data: JSON.stringify({ ...doc, id }),
    sort_order: m + 10,
    published: req.body?.published === false ? 0 : 1,
  });
  audit(req, "CONTENT_CREATED", `${name}/${id}`, String(doc.title ?? doc.name ?? doc.q ?? ""));
  ok(res, parseRow(contentQ.get.get(name, id) as ContentRow), 201);
});

app.put("/api/admin/content/:collection/:id", anyAdmin, (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  const currentId = String(req.params.id);
  const row = contentQ.get.get(name, currentId) as ContentRow | undefined;
  if (!row) return fail(res, 404, "Entry not found.");
  const data = req.body?.data;
  const error = validateDoc(name, data);
  if (error) return fail(res, 422, error);

  let id = currentId;
  const requested = str(req.body?.newId, 80);
  if (requested && requested !== currentId) {
    if (!ID_RE.test(requested)) return fail(res, 422, "Invalid ID — use lowercase letters, numbers and dashes.");
    if (contentQ.get.get(name, requested)) return fail(res, 409, "Another entry already uses that ID.");
    contentQ.rename.run(requested, name, currentId);
    id = requested;
  }
  contentQ.update.run({
    collection: name,
    id,
    data: JSON.stringify({ ...(data as object), id }),
    published: req.body?.published === undefined ? row.published : req.body.published ? 1 : 0,
    sort_order: Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : row.sort_order,
  });
  audit(req, "CONTENT_UPDATED", `${name}/${id}`);
  ok(res, parseRow(contentQ.get.get(name, id) as ContentRow));
});

app.delete("/api/admin/content/:collection/:id", anyAdmin, (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  const info = contentQ.remove.run(name, String(req.params.id));
  if (!info.changes) return fail(res, 404, "Entry not found.");
  audit(req, "CONTENT_DELETED", `${name}/${req.params.id}`);
  ok(res);
});

app.post("/api/admin/content/:collection/reorder", anyAdmin, (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).map(String) : [];
  if (!ids.length) return fail(res, 422, "Provide the new order as an array of IDs.");
  db.transaction(() => ids.forEach((id, i) => contentQ.setSort.run((i + 1) * 10, name, id)))();
  audit(req, "CONTENT_REORDERED", name);
  ok(res, (contentQ.listAll.all(name) as ContentRow[]).map(parseRow));
});

app.post("/api/admin/content/:collection/reset", adminOnly, (req: AuthedRequest, res) => {
  const name = collectionParam(req, res);
  if (!name) return;
  seedCollection(name);
  audit(req, "CONTENT_RESET", name, "Restored shipped defaults");
  ok(res, (contentQ.listAll.all(name) as ContentRow[]).map(parseRow));
});

/* ------------------------------------------------------------------ */
/* Admin — settings                                                   */
/* ------------------------------------------------------------------ */
app.get("/api/admin/settings", anyAdmin, (_req, res) => {
  ok(res, { site: siteSettings(), advanced: advancedSettings() });
});

app.put("/api/admin/settings/:key", adminOnly, (req: AuthedRequest, res) => {
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
  writeSetting(key, deepMerge(key === "site" ? siteSettings() : advancedSettings(), value));
  audit(req, "SETTINGS_UPDATED", `SETTINGS_${key.toUpperCase()}`);
  ok(res, key === "site" ? siteSettings() : advancedSettings());
});

/* ------------------------------------------------------------------ */
/* Admin — audit, users, export                                       */
/* ------------------------------------------------------------------ */
app.get("/api/admin/audit", adminOnly, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 10), 500);
  ok(res, db.prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?").all(limit));
});

app.get("/api/admin/users", ownerOnly, (_req, res) => {
  ok(res, (userQ.list.all() as { id: number; email: string; full_name: string; role: string; active: number; last_login_at: string; created_at: string }[]).map((u) => ({
    ...publicUser(u),
    active: u.active === 1,
    createdAt: u.created_at,
  })));
});

app.post("/api/admin/users", ownerOnly, (req: AuthedRequest, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  const fullName = str(req.body?.fullName, 120);
  const role = String(req.body?.role ?? "editor") as AdminRole;
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!isEmail(email)) return fail(res, 422, "Please provide a valid email.");
  if (fullName.length < 2) return fail(res, 422, "Please provide the person's name.");
  if (!(ADMIN_ROLES as readonly string[]).includes(role)) return fail(res, 422, "Invalid role.");
  if (password.length < 10) return fail(res, 422, "Temporary password must be at least 10 characters.");
  if (userQ.byEmail.get(email)) return fail(res, 409, "A user with that email already exists.");
  const { hash, salt } = hashPassword(password);
  const info = db
    .prepare("INSERT INTO admin_users (email, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, ?)")
    .run(email, hash, salt, fullName, role);
  audit(req, "USER_CREATED", `USER_${info.lastInsertRowid}`, `${email} as ${role}`);
  ok(res, { id: Number(info.lastInsertRowid) }, 201);
});

app.patch("/api/admin/users/:id", ownerOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const user = userQ.byId.get(id) as { id: number; role: AdminRole; active: number } | undefined;
  if (!user) return fail(res, 404, "User not found.");
  const b = req.body ?? {};
  const demotingOwner =
    user.role === "owner" && ((b.role !== undefined && b.role !== "owner") || b.active === false);
  if (demotingOwner && (userQ.owners.get() as { c: number }).c <= 1) {
    return fail(res, 422, "At least one active owner is required.");
  }
  if (b.role !== undefined) {
    if (!(ADMIN_ROLES as readonly string[]).includes(b.role)) return fail(res, 422, "Invalid role.");
    db.prepare("UPDATE admin_users SET role = ? WHERE id = ?").run(b.role, id);
  }
  if (b.fullName !== undefined) db.prepare("UPDATE admin_users SET full_name = ? WHERE id = ?").run(str(b.fullName, 120), id);
  if (b.active !== undefined) {
    db.prepare("UPDATE admin_users SET active = ? WHERE id = ?").run(b.active ? 1 : 0, id);
    if (!b.active) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
  if (b.password !== undefined) {
    if (typeof b.password !== "string" || b.password.length < 10) return fail(res, 422, "Password must be at least 10 characters.");
    const { hash, salt } = hashPassword(b.password);
    userQ.setPassword.run(hash, salt, id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
  audit(req, "USER_UPDATED", `USER_${id}`, Object.keys(b).filter((k) => k !== "password").join(", ") || "password");
  ok(res);
});

app.delete("/api/admin/users/:id", ownerOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (id === req.admin!.id) return fail(res, 422, "You can't delete your own account.");
  const info = db.prepare("DELETE FROM admin_users WHERE id = ?").run(id);
  if (!info.changes) return fail(res, 404, "User not found.");
  audit(req, "USER_DELETED", `USER_${id}`);
  ok(res);
});

app.get("/api/admin/export", adminOnly, (req: AuthedRequest, res) => {
  const scope = req.query.scope === "all" ? "all" : "content";
  if (scope === "all" && req.admin!.role !== "owner") return fail(res, 403, "Only owners can export customer data.");
  const collections = Object.fromEntries(
    COLLECTION_NAMES.map((name) => [name, (contentQ.listAll.all(name) as ContentRow[]).map(parseRow)]),
  );
  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    scope,
    settings: { site: siteSettings(), advanced: advancedSettings() },
    collections,
  };
  if (scope === "all") {
    payload.enquiries = db.prepare(`SELECT ${LEAD_COLUMNS} FROM enquiries`).all();
    payload.bookings = db.prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings`).all();
    payload.subscribers = db.prepare("SELECT email, source, created_at FROM subscribers").all();
  }
  audit(req, "EXPORT", `EXPORT_${scope.toUpperCase()}`);
  res.setHeader("Content-Disposition", `attachment; filename="novaframe-${scope}-${dateInTz("UTC")}.json"`);
  ok(res, payload);
});

/* ------------------------------------------------------------------ */
/* Static frontend (optional: serves `npm run build` output)          */
/* ------------------------------------------------------------------ */
const distDir = path.resolve(__dirname, "..", "dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir, { index: false, maxAge: "1h" }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.use("/api", (_req, res) => fail(res, 404, "Route not found."));

app.use((err: Error & { type?: string; status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === "entity.parse.failed") return fail(res, 400, "Malformed JSON body.");
  if (err.type === "entity.too.large") return fail(res, 413, "Request body is too large.");
  console.error("[api] Unhandled error:", err);
  fail(res, 500, "Something went wrong on our side. Please try again.");
});

app.listen(PORT, () => {
  console.log(`\n  > Novaframe API ready:  http://localhost:${PORT}/api/health`);
  console.log(`  > Admin console:       http://localhost:5173/#/admin (dev) or this server's /#/admin`);
  console.log(`  > Email notifications: ${mailEnabled() ? "on (SMTP)" : "off (set SMTP_HOST to enable)"}`);
  console.log(`  > Online payments:     ${paymentsEnabled() ? `on (Razorpay ${paymentsTestMode() ? "TEST" : "LIVE"} mode)` : "off (set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)"}\n`);
  if (mailEnabled()) {
    void verifyMail().then((r) =>
      r.ok
        ? console.log(`  > SMTP login verified (${process.env.SMTP_HOST})`)
        : console.error(`  > SMTP login FAILED — emails will not be delivered: ${r.error}`),
    );
  }
});

export default app;
