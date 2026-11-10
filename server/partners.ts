/**
 * Student Partner & Campus Ambassador program — API
 * -------------------------------------------------
 * Public:   program terms, leaderboard, partner registration/login, referral-click tracking
 * Partner:  session-authenticated dashboard (profile, leads, wallet, payouts, ambassador application)
 * Admin:    partners, partner leads, client payments, commissions, payouts, ambassador approvals
 *
 * Money rules
 *  - All amounts are integer paise.
 *  - A commission is created only by the server, from a client payment that is verified
 *    (Razorpay signature-checked, or recorded and then verified by an admin), at the
 *    program rate, inside the same database transaction as the verification.
 *  - Wallet balances are never stored: they are computed from commissions minus payouts.
 *    No endpoint accepts a balance, and database triggers block edits to amounts.
 */
import crypto from "node:crypto";
import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { LEAD_STATUSES, type AdminRole } from "../src/data/types.js";
import {
  ACCOUNT_RE,
  IFSC_RE,
  PAN_RE,
  PAYMENT_METHODS,
  REFERRAL_RE,
  REGIONS,
  UPI_RE,
  YEARS_OF_STUDY,
  partnerPasswordProblem,
  type PartnerConfig,
} from "../src/data/partner.js";
import { TZ_MOD, all, get, hashPassword, hashToken, newReference, run, tx, verifyPassword, type Args } from "./db.js";

/* ------------------------------------------------------------------ */
/* Program terms (env-configurable, clamped to sane ranges)           */
/* ------------------------------------------------------------------ */
function envNumber(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? Number.NaN : Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export const PROGRAM: PartnerConfig = {
  commissionPercent: envNumber("PARTNER_COMMISSION_PERCENT", 20, 1, 50),
  holdDays: Math.round(envNumber("PARTNER_HOLD_DAYS", 7, 0, 90)),
  minPayout: Math.round(envNumber("PARTNER_MIN_PAYOUT", 500, 1, 1_000_000)),
  attributionDays: Math.round(envNumber("PARTNER_ATTRIBUTION_DAYS", 180, 1, 730)),
};
const RATE_BPS = Math.round(PROGRAM.commissionPercent * 100);
const HOLD = `+${PROGRAM.holdDays} days`;
const WINDOW = `-${PROGRAM.attributionDays} days`;
const MAX_PAYMENT_PAISE = 10_00_00_000 * 100; // ₹10 crore — anything above is a typo

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
type AdminUser = { id: number; email: string; fullName: string; role: AdminRole; sessionId: number };
type AdminRequest = Request & { admin?: AdminUser };
type PartnerSession = { id: number; partnerCode: string; referralCode: string; email: string; fullName: string; sessionId: number };
type PartnerRequest = Request & { partner?: PartnerSession };

export type PartnerDeps = {
  ok: (res: Response, data?: unknown, status?: number) => Response;
  fail: (res: Response, status: number, error: string, extra?: Record<string, unknown>) => Response;
  str: (value: unknown, max: number) => string;
  isEmail: (value: string) => boolean;
  ipOf: (req: Request) => string;
  uaOf: (req: Request) => string;
  rateLimit: (opts: { windowMs: number; max: number; key?: (req: Request) => string; message?: string }) => RequestHandler;
  audit: (req: AdminRequest, action: string, target: string, details?: string) => Promise<void>;
  adminOnly: RequestHandler;
  estimateValue: (budgetLabel: string) => Promise<number | null>;
  sessionDays: number;
};

type PartnerRow = {
  id: number;
  partner_code: string;
  referral_code: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  salt: string;
  college: string;
  course: string | null;
  graduation_year: number | null;
  city: string | null;
  region: string;
  upi_id: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  pan: string | null;
  tier: "partner" | "ambassador";
  status: "active" | "suspended";
  suspended_reason: string | null;
  suspended_at: string | null;
  show_on_leaderboard: number;
  flags: string | null;
  admin_notes: string | null;
  signup_ip: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

type Wallet = {
  heldPaise: number;
  availablePaise: number;
  requestedPaise: number;
  paidOutPaise: number;
  lifetimePaise: number;
  reversedPaise: number;
  currency: "INR";
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 symbols, no 0/O/1/I look-alikes

function randomCode(length: number) {
  return Array.from(crypto.randomBytes(length), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
const newPartnerCode = () => `SP${String(new Date().getUTCFullYear()).slice(2)}-${randomCode(6)}`;
function newReferralCode(name: string) {
  // First name only reads best when shared: "Riya Sharma" → RIYA7K3M.
  const first = name.trim().split(/\s+/)[0] ?? "";
  const base = first.normalize("NFKD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8);
  return `${base.length >= 2 ? base : "PARTNER"}${randomCode(4)}`;
}

export function normalizeReferral(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return REFERRAL_RE.test(code) ? code : "";
}

/** 10 digits → Indian mobile (+91…); 11–15 digits → international. */
function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return "";
}
const lastTen = (phone: string | null | undefined) => (phone ?? "").replace(/\D/g, "").slice(-10);

function maskEmail(email: string | null | undefined) {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(4, user.length - 2)))}@${domain}`;
}
function maskTail(value: string | null | undefined, keep = 4) {
  if (!value) return "";
  return `${"•".repeat(Math.max(2, Math.min(8, value.length - keep)))}${value.slice(-keep)}`;
}
/** "Afzal Hussain" → "Afzal H." — used wherever another person's name is shown. */
function shortName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
const n = (v: unknown) => Number(v ?? 0) || 0;

/** "Rahul S." style lead view for partners: they see the stage and money, not the client's contact details. */
function partnerStage(status: string) {
  if (status === "won") return "converted";
  if (status === "lost" || status === "archived") return "closed";
  if (status === "new") return "submitted";
  return "in_discussion";
}

async function addFlag(partnerId: number, flag: string) {
  await run(
    `UPDATE partners SET flags = CASE
       WHEN flags IS NULL OR flags = '' THEN ?1
       WHEN instr(',' || flags || ',', ',' || ?1 || ',') > 0 THEN flags
       ELSE flags || ',' || ?1 END
     WHERE id = ?2`,
    [flag, partnerId],
  );
}

/* ------------------------------------------------------------------ */
/* Wallet (computed, never stored)                                    */
/* ------------------------------------------------------------------ */
export async function walletOf(partnerId: number): Promise<Wallet> {
  const c = await get<{ held: number; matured: number; lifetime: number; reversed: number }>(
    `SELECT
       coalesce(sum(CASE WHEN status = 'earned' AND datetime(available_at) > datetime('now') THEN amount_paise END), 0) AS held,
       coalesce(sum(CASE WHEN status = 'earned' AND datetime(available_at) <= datetime('now') THEN amount_paise END), 0) AS matured,
       coalesce(sum(CASE WHEN status = 'earned' THEN amount_paise END), 0) AS lifetime,
       coalesce(sum(CASE WHEN status = 'reversed' THEN amount_paise END), 0) AS reversed
     FROM partner_commissions WHERE partner_id = ?`,
    [partnerId],
  );
  const p = await get<{ requested: number; paid: number }>(
    `SELECT
       coalesce(sum(CASE WHEN status = 'requested' THEN amount_paise END), 0) AS requested,
       coalesce(sum(CASE WHEN status = 'paid' THEN amount_paise END), 0) AS paid
     FROM partner_payouts WHERE partner_id = ?`,
    [partnerId],
  );
  const requested = n(p?.requested);
  const paid = n(p?.paid);
  return {
    heldPaise: n(c?.held),
    availablePaise: n(c?.matured) - requested - paid,
    requestedPaise: requested,
    paidOutPaise: paid,
    lifetimePaise: n(c?.lifetime),
    reversedPaise: n(c?.reversed),
    currency: "INR",
  };
}

/**
 * The one place a commission is created. Reads the verified payment row in SQL, so the
 * amount always derives from what the database holds — never from a request body.
 * Skips suspended partners and partners paying themselves. Idempotent (UNIQUE client_payment_id).
 */
const COMMISSION_INSERT = (where: string) => `
  INSERT OR IGNORE INTO partner_commissions (partner_id, client_payment_id, enquiry_id, base_paise, rate_bps, amount_paise, status, available_at)
  SELECT cp.partner_id, cp.id, cp.enquiry_id, cp.amount_paise, ${RATE_BPS},
         CAST((cp.amount_paise * ${RATE_BPS}) / 10000 AS INTEGER), 'earned', datetime('now', '${HOLD}')
  FROM client_payments cp JOIN partners p ON p.id = cp.partner_id
  WHERE ${where} AND cp.status = 'verified' AND cp.currency = 'INR' AND p.status = 'active'
    AND lower(p.email) != lower(coalesce(cp.client_email, ''))`;

/* ------------------------------------------------------------------ */
/* Referral attribution — used by the public enquiry/booking/payment  */
/* endpoints in index.ts                                              */
/* ------------------------------------------------------------------ */
/**
 * Decides which partner (if any) a new enquiry belongs to.
 *  1. First touch wins: a client already referred within the attribution window stays with that partner.
 *  2. Otherwise a valid referral code from an active partner attributes the lead,
 *     unless the client is the partner themself or was already in the pipeline organically.
 */
export async function resolveReferral(codeInput: unknown, clientEmail: string): Promise<{ partnerId: number; code: string } | null> {
  const email = clientEmail.trim().toLowerCase();
  if (email) {
    const prior = await get<{ partner_id: number; code: string }>(
      `SELECT e.partner_id, p.referral_code AS code FROM enquiries e JOIN partners p ON p.id = e.partner_id
       WHERE e.email = ? AND datetime(e.created_at) >= datetime('now', ?) ORDER BY e.id ASC LIMIT 1`,
      [email, WINDOW],
    );
    if (prior) return { partnerId: prior.partner_id, code: prior.code };
  }
  const code = normalizeReferral(codeInput);
  if (!code) return null;
  const partner = await get<{ id: number; email: string; status: string }>("SELECT id, email, status FROM partners WHERE referral_code = ?", [code]);
  if (!partner || partner.status !== "active") return null;
  if (email && partner.email === email) {
    await addFlag(partner.id, "self_referral_attempt");
    return null;
  }
  if (email) {
    const organic = await get("SELECT 1 AS x FROM enquiries WHERE email = ? AND partner_id IS NULL AND datetime(created_at) >= datetime('now', '-90 days') LIMIT 1", [email]);
    if (organic) return null;
  }
  return { partnerId: partner.id, code };
}

/**
 * Called once when a Razorpay payment is first confirmed (signature- or webhook-verified).
 * If the payer is a referred client, the payment is mirrored into client_payments as
 * verified and the commission is created in the same transaction.
 */
export async function recordRazorpayCommission(payment: {
  id: number;
  enquiry_id: number | null;
  email: string;
  name: string;
  amount: number; // rupees
  currency: string;
  purpose: string;
  razorpay_payment_id: string | null;
  method: string | null;
}): Promise<void> {
  if (payment.currency !== "INR") return;
  let enquiryId = payment.enquiry_id;
  let partnerId: number | null = null;
  if (enquiryId) partnerId = (await get<{ partner_id: number | null }>("SELECT partner_id FROM enquiries WHERE id = ?", [enquiryId]))?.partner_id ?? null;
  if (!partnerId) {
    const prior = await get<{ id: number; partner_id: number }>(
      `SELECT id, partner_id FROM enquiries WHERE email = ? AND partner_id IS NOT NULL AND datetime(created_at) >= datetime('now', ?)
       ORDER BY id ASC LIMIT 1`,
      [payment.email.toLowerCase(), WINDOW],
    );
    if (prior) {
      partnerId = prior.partner_id;
      enquiryId = prior.id;
    }
  }
  if (!partnerId) return;

  await tx([
    [
      `INSERT OR IGNORE INTO client_payments (reference, enquiry_id, partner_id, client_name, client_email, amount_paise, currency,
         installment_label, method, external_ref, paid_on, source, payment_id, status, recorded_by, verified_by, verified_at, notes)
       VALUES (@reference, @enquiryId, @partnerId, @name, @email, @amount, 'INR', @label, @method, @externalRef, date('now', '${TZ_MOD}'),
         'razorpay', @paymentId, 'verified', 'Razorpay', 'Razorpay', datetime('now'), @notes)`,
      {
        reference: newReference("CP"),
        enquiryId,
        partnerId,
        name: payment.name,
        email: payment.email.toLowerCase(),
        amount: Math.round(payment.amount * 100),
        label: payment.purpose.slice(0, 120),
        method: payment.method ? `Razorpay · ${payment.method}` : "Razorpay",
        externalRef: payment.razorpay_payment_id,
        paymentId: payment.id,
        notes: "Recorded automatically from a verified Razorpay payment.",
      },
    ],
    [COMMISSION_INSERT("cp.payment_id = @paymentId"), { paymentId: payment.id }],
  ]);
}

/* ------------------------------------------------------------------ */
/* Input readers                                                      */
/* ------------------------------------------------------------------ */
type Cols = Record<string, string | number | null>;
type Errors = Record<string, string>;

function makeReaders(d: PartnerDeps) {
  const { str, isEmail } = d;

  /** Contact + college details. `partial` = only validate keys that are present. */
  function readProfile(b: Record<string, unknown>, partial: boolean): { cols: Cols; errors: Errors } {
    const cols: Cols = {};
    const errors: Errors = {};
    const has = (key: string) => !partial || b[key] !== undefined;

    if (has("fullName")) {
      const v = str(b.fullName, 120);
      if (v.length < 2) errors.fullName = "Please enter your full name.";
      else cols.full_name = v;
    }
    if (has("email")) {
      const v = str(b.email, 160).toLowerCase();
      if (!isEmail(v)) errors.email = "Please enter a valid email address.";
      else cols.email = v;
    }
    if (has("phone")) {
      const v = normalizePhone(str(b.phone, 40));
      if (!v) errors.phone = "Enter a valid mobile number (10 digits, or with country code).";
      else cols.phone = v;
    }
    if (has("college")) {
      const v = str(b.college, 160);
      if (v.length < 2) errors.college = "Please enter your college or university.";
      else cols.college = v;
    }
    if (has("course")) cols.course = str(b.course, 120) || null;
    if (has("graduationYear")) {
      const raw = b.graduationYear;
      if (raw === null || raw === undefined || raw === "") cols.graduation_year = null;
      else {
        const year = Number(raw);
        if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 8) errors.graduationYear = "Enter a valid graduation year.";
        else cols.graduation_year = year;
      }
    }
    if (has("city")) cols.city = str(b.city, 80) || null;
    if (has("region")) {
      const v = str(b.region, 60);
      if (!(REGIONS as readonly string[]).includes(v)) errors.region = "Choose your state or region.";
      else cols.region = v;
    }
    return { cols, errors };
  }

  /** Payout details — always validated as a complete set. */
  function readPayout(b: Record<string, unknown>): { cols: Cols; errors: Errors } {
    const errors: Errors = {};
    const upi = str(b.upiId, 120).replace(/\s/g, "");
    const holder = str(b.bankAccountName, 120);
    const account = str(b.bankAccountNumber, 30).replace(/[\s-]/g, "");
    const ifsc = str(b.bankIfsc, 20).replace(/\s/g, "").toUpperCase();
    const pan = str(b.pan, 12).replace(/\s/g, "").toUpperCase();
    const anyBank = Boolean(holder || account || ifsc);

    if (upi && !UPI_RE.test(upi)) errors.upiId = "That doesn't look like a UPI ID (e.g. name@okaxis).";
    if (anyBank) {
      if (holder.length < 2) errors.bankAccountName = "Enter the account holder's name.";
      if (!ACCOUNT_RE.test(account)) errors.bankAccountNumber = "Account numbers are 9–18 digits.";
      if (!IFSC_RE.test(ifsc)) errors.bankIfsc = "IFSC is 11 characters, e.g. HDFC0001234.";
    }
    if (pan && !PAN_RE.test(pan)) errors.pan = "PAN looks like ABCDE1234F.";
    if (!upi && !anyBank) errors.upiId = "Add a UPI ID or a bank account so we can pay you.";
    return {
      cols: {
        upi_id: upi || null,
        bank_account_name: anyBank ? holder : null,
        bank_account_number: anyBank ? account : null,
        bank_ifsc: anyBank ? ifsc : null,
        pan: pan || null,
      },
      errors,
    };
  }

  function readApplication(b: Record<string, unknown>, fallbackCollege: string): { values: Record<string, string>; errors: Errors } {
    const errors: Errors = {};
    const college = str(b.college, 160) || fallbackCollege;
    const year = str(b.yearOfStudy, 40);
    const motivation = str(b.motivation, 1500);
    const reach = str(b.reach, 300);
    const socials = str(b.socialLinks, 500);
    if (college.length < 2) errors.college = "Please enter your college.";
    if (!(YEARS_OF_STUDY as readonly string[]).includes(year)) errors.yearOfStudy = "Choose your year of study.";
    if (motivation.length < 30) errors.motivation = "Tell us a little more (at least 30 characters).";
    if (reach.length < 5) errors.reach = "Tell us about your clubs, societies or audience.";
    return { values: { college, year, motivation, reach, socials }, errors };
  }

  return { readProfile, readPayout, readApplication };
}

/* ------------------------------------------------------------------ */
/* Views                                                              */
/* ------------------------------------------------------------------ */
function selfView(p: PartnerRow) {
  return {
    id: p.id,
    partnerCode: p.partner_code,
    referralCode: p.referral_code,
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    college: p.college,
    course: p.course ?? "",
    graduationYear: p.graduation_year,
    city: p.city ?? "",
    region: p.region,
    tier: p.tier,
    status: p.status,
    showOnLeaderboard: p.show_on_leaderboard === 1,
    createdAt: p.created_at,
    payout: {
      upiId: p.upi_id ?? "",
      bankAccountName: p.bank_account_name ?? "",
      bankAccountMasked: maskTail(p.bank_account_number),
      bankIfsc: p.bank_ifsc ?? "",
      panMasked: maskTail(p.pan, 2),
    },
  };
}

function adminView(p: PartnerRow) {
  return {
    ...selfView(p),
    payout: {
      upiId: p.upi_id ?? "",
      bankAccountName: p.bank_account_name ?? "",
      bankAccountNumber: p.bank_account_number ?? "",
      bankIfsc: p.bank_ifsc ?? "",
      pan: p.pan ?? "",
    },
    suspendedReason: p.suspended_reason,
    suspendedAt: p.suspended_at,
    flags: p.flags ? p.flags.split(",").filter(Boolean) : [],
    adminNotes: p.admin_notes ?? "",
    signupIp: p.signup_ip,
    lastLoginAt: p.last_login_at,
    updatedAt: p.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/* Routes                                                             */
/* ------------------------------------------------------------------ */
export function registerPartnerRoutes(app: Express, d: PartnerDeps) {
  const { ok, fail, str, isEmail, ipOf, uaOf, audit, adminOnly } = d;
  const { readProfile, readPayout, readApplication } = makeReaders(d);
  const DUMMY = hashPassword("partner-timing-placeholder");

  const registerLimiter = d.rateLimit({ windowMs: 60 * 60 * 1000, max: 6, message: "Too many sign-ups from this network — please try again later." });
  const loginLimiter = d.rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    key: (req) => `${ipOf(req)}|${str(req.body?.email, 160).toLowerCase()}`,
    message: "Too many sign-in attempts. Please wait 15 minutes and try again.",
  });
  const clickLimiter = d.rateLimit({ windowMs: 60 * 1000, max: 30 });
  const partnerWriteLimiter = d.rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 40,
    key: (req) => `partner|${(req as PartnerRequest).partner?.id ?? ipOf(req)}`,
    message: "You're doing that a lot — please wait a little and try again.",
  });

  const partnerById = (id: number) => get<PartnerRow>("SELECT * FROM partners WHERE id = ?", [id]);

  /* ---------------- Partner sessions ---------------- */
  async function createSession(partnerId: number, req: Request) {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + d.sessionDays * 86_400_000).toISOString().replace("T", " ").slice(0, 19);
    await run("INSERT INTO partner_sessions (token_hash, partner_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)", [
      hashToken(token),
      partnerId,
      ipOf(req),
      uaOf(req),
      expiresAt,
    ]);
    await run("UPDATE partners SET last_login_at = datetime('now') WHERE id = ?", [partnerId]);
    return { token, expiresAt };
  }

  function bearer(req: Request) {
    const header = req.headers.authorization;
    return header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  }

  const requirePartner: RequestHandler = async (req: PartnerRequest, res: Response, next: NextFunction) => {
    try {
      const token = bearer(req);
      if (!token) return void fail(res, 401, "Please sign in to your partner account.");
      const row = await get<{
        session_id: number;
        last_seen_at: string;
        id: number;
        partner_code: string;
        referral_code: string;
        email: string;
        full_name: string;
        status: string;
        suspended_reason: string | null;
      }>(
        `SELECT s.id AS session_id, s.last_seen_at, p.id, p.partner_code, p.referral_code, p.email, p.full_name, p.status, p.suspended_reason
         FROM partner_sessions s JOIN partners p ON p.id = s.partner_id
         WHERE s.token_hash = ? AND datetime(s.expires_at) > datetime('now')`,
        [hashToken(token)],
      );
      if (!row) return void fail(res, 401, "Your session has expired. Please sign in again.");
      if (row.status !== "active") {
        await run("DELETE FROM partner_sessions WHERE partner_id = ?", [row.id]);
        return void fail(res, 403, `Your partner account is suspended${row.suspended_reason ? `: ${row.suspended_reason}` : ""}. Contact us if you think this is a mistake.`, {
          code: "suspended",
        });
      }
      req.partner = {
        id: row.id,
        partnerCode: row.partner_code,
        referralCode: row.referral_code,
        email: row.email,
        fullName: row.full_name,
        sessionId: row.session_id,
      };
      if (Date.now() - Date.parse(row.last_seen_at + "Z") > 5 * 60 * 1000) {
        await run("UPDATE partner_sessions SET last_seen_at = datetime('now') WHERE id = ?", [row.session_id]);
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  /* ---------------- Lead creation (partner + admin) ---------------- */
  async function createPartnerLead(
    partner: Pick<PartnerRow, "id" | "email" | "phone" | "referral_code" | "status">,
    b: Record<string, unknown>,
    req: Request,
    source: "partner" | "admin",
  ): Promise<{ status: number; error?: string; errors?: Errors; data?: { id: number; reference: string } }> {
    if (partner.status !== "active") return { status: 409, error: "This partner is suspended and can't register new leads." };
    const name = str(b.name, 120);
    const email = str(b.email, 160).toLowerCase();
    const phone = str(b.phone, 40);
    const details = str(b.details, 5000);
    const errors: Errors = {};
    if (name.length < 2) errors.name = "Enter the client's name.";
    if (!isEmail(email)) errors.email = "Enter the client's email address.";
    if (phone && !normalizePhone(phone)) errors.phone = "Enter a valid phone number.";
    if (details.length < 10) errors.details = "Describe what the client needs (at least 10 characters).";
    if (Object.keys(errors).length) return { status: 422, error: "Please check the highlighted fields.", errors };

    if (email === partner.email || (lastTen(phone).length === 10 && lastTen(phone) === lastTen(partner.phone))) {
      await addFlag(partner.id, "self_referral_attempt");
      return { status: 422, error: "You can't refer yourself. Leads must be genuine clients.", errors: { email: "This is your own contact." } };
    }
    const existing = await get<{ partner_id: number | null }>(
      "SELECT partner_id FROM enquiries WHERE email = ? AND datetime(created_at) >= datetime('now', ?) ORDER BY id ASC LIMIT 1",
      [email, WINDOW],
    );
    if (existing) {
      const who = existing.partner_id === partner.id ? "by you" : existing.partner_id ? "by another partner" : "directly";
      return { status: 409, error: `This client is already in our pipeline (registered ${who}), so it can't be added as a new referral.`, errors: { email: "Already registered." } };
    }

    const budget = str(b.budget, 80) || "Not specified";
    const reference = newReference("WX");
    const info = await run(
      `INSERT INTO enquiries (reference, name, company_name, email, phone, service, budget_range, timeline, project_details, source,
         value_estimate, ip_address, user_agent, partner_id, referral_code)
       VALUES (@reference, @name, @company, @email, @phone, @service, @budget, @timeline, @details, @source, @value, @ip, @ua, @partnerId, @code)`,
      {
        reference,
        name,
        company: str(b.companyName, 160),
        email,
        phone,
        service: str(b.service, 100) || "Website / app project",
        budget,
        timeline: str(b.timeline, 80),
        details,
        source: "partner",
        value: await d.estimateValue(budget),
        ip: ipOf(req),
        ua: uaOf(req),
        partnerId: partner.id,
        code: partner.referral_code,
      },
    );
    const id = Number(info.lastInsertRowid);
    await run("INSERT INTO enquiry_notes (enquiry_id, admin_name, kind, body) VALUES (?, ?, 'referral', ?)", [
      id,
      source === "partner" ? "Partner portal" : "Admin",
      `Referral registered for partner ${partner.referral_code}${source === "admin" ? " by an admin" : ""}.`,
    ]);
    return { status: 201, data: { id, reference } };
  }

  /* ================================================================ */
  /* Public                                                           */
  /* ================================================================ */
  app.get("/api/partners/config", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    ok(res, PROGRAM);
  });

  const leaderboardCache = new Map<string, { at: number; data: unknown }>();
  app.get("/api/partners/leaderboard", async (req, res) => {
    const period = req.query.period === "all" ? "all" : "month";
    const cached = leaderboardCache.get(period);
    if (cached && Date.now() - cached.at < 60_000) return ok(res, cached.data);

    const cPeriod = period === "month" ? `AND date(c.created_at, '${TZ_MOD}') >= date('now', '${TZ_MOD}', 'start of month')` : "";
    const ePeriod = period === "month" ? `AND date(e.created_at, '${TZ_MOD}') >= date('now', '${TZ_MOD}', 'start of month')` : "";
    const rows = await all<{ id: number; full_name: string; college: string; region: string; tier: string; earned: number; leads: number; won: number }>(
      `SELECT * FROM (
         SELECT p.id, p.full_name, p.college, p.region, p.tier,
           (SELECT coalesce(sum(c.amount_paise), 0) FROM partner_commissions c WHERE c.partner_id = p.id AND c.status = 'earned' ${cPeriod}) AS earned,
           (SELECT count(*) FROM enquiries e WHERE e.partner_id = p.id ${ePeriod}) AS leads,
           (SELECT count(*) FROM enquiries e WHERE e.partner_id = p.id AND e.status = 'won' ${ePeriod}) AS won
         FROM partners p WHERE p.status = 'active' AND p.show_on_leaderboard = 1
       ) WHERE earned > 0 OR leads > 0
       ORDER BY earned DESC, won DESC, leads DESC, id ASC LIMIT 10`,
    );
    const data = {
      period,
      updatedAt: new Date().toISOString(),
      entries: rows.map((r, i) => ({
        rank: i + 1,
        name: shortName(r.full_name),
        college: r.college,
        region: r.region,
        tier: r.tier,
        earnedPaise: n(r.earned),
        leads: n(r.leads),
        converted: n(r.won),
      })),
    };
    leaderboardCache.set(period, { at: Date.now(), data });
    ok(res, data);
  });

  /** Records a visit through a referral link (once per browser session). */
  app.post("/api/partners/click", clickLimiter, async (req, res) => {
    const code = normalizeReferral(req.body?.code);
    if (!code) return ok(res, { valid: false });
    const partner = await get<{ full_name: string; status: string }>("SELECT full_name, status FROM partners WHERE referral_code = ?", [code]);
    if (!partner || partner.status !== "active") return ok(res, { valid: false });
    const sid = str(req.body?.sid, 64);
    const seen = sid
      ? await get("SELECT 1 AS x FROM events WHERE name = 'referral_click' AND session_id = ? AND json_extract(meta, '$.code') = ? LIMIT 1", [sid, code])
      : null;
    if (!seen) {
      await run("INSERT INTO events (name, path, session_id, referrer, meta) VALUES ('referral_click', ?, ?, ?, ?)", [
        str(req.body?.path, 200),
        sid || null,
        str(req.body?.referrer, 300),
        JSON.stringify({ code }),
      ]);
    }
    ok(res, { valid: true, partnerName: partner.full_name.split(/\s+/)[0] });
  });

  app.post("/api/partners/register", registerLimiter, async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (str(b.website, 200)) return fail(res, 400, "Invalid request."); // honeypot

    const profile = readProfile(b, false);
    const payout = readPayout(b);
    const errors: Errors = { ...profile.errors, ...payout.errors };
    const password = typeof b.password === "string" ? b.password : "";
    const passwordProblem = partnerPasswordProblem(password);
    if (passwordProblem) errors.password = passwordProblem;
    if (b.acceptTerms !== true) errors.acceptTerms = "Please accept the program terms.";

    const wantsAmbassador = b.ambassador !== undefined && b.ambassador !== null && typeof b.ambassador === "object";
    const application = wantsAmbassador ? readApplication(b.ambassador as Record<string, unknown>, String(profile.cols.college ?? "")) : null;
    if (application) for (const [k, v] of Object.entries(application.errors)) errors[`ambassador.${k}`] = v;
    if (Object.keys(errors).length) return fail(res, 422, "Please check the highlighted fields.", { errors });

    const email = String(profile.cols.email);
    if (await get("SELECT 1 AS x FROM partners WHERE email = ?", [email])) {
      return fail(res, 409, "A partner account already exists for this email. Please sign in instead.", { errors: { email: "Already registered." } });
    }

    const { hash, salt } = hashPassword(password);
    let partnerId = 0;
    for (let attempt = 0; attempt < 5 && !partnerId; attempt += 1) {
      try {
        const info = await run(
          `INSERT INTO partners (partner_code, referral_code, full_name, email, phone, password_hash, salt, college, course, graduation_year,
             city, region, upi_id, bank_account_name, bank_account_number, bank_ifsc, pan, signup_ip, signup_ua)
           VALUES (@code, @ref, @full_name, @email, @phone, @hash, @salt, @college, @course, @graduation_year,
             @city, @region, @upi_id, @bank_account_name, @bank_account_number, @bank_ifsc, @pan, @ip, @ua)`,
          {
            code: newPartnerCode(),
            ref: newReferralCode(String(profile.cols.full_name)),
            ...profile.cols,
            ...payout.cols,
            hash,
            salt,
            ip: ipOf(req),
            ua: uaOf(req),
          } as Args,
        );
        partnerId = Number(info.lastInsertRowid);
      } catch (err) {
        const message = String((err as Error).message);
        if (message.includes("partners.email")) return fail(res, 409, "A partner account already exists for this email.", { errors: { email: "Already registered." } });
        if (!message.includes("UNIQUE")) throw err; // code collision → retry with fresh codes
      }
    }
    if (!partnerId) return fail(res, 503, "Couldn't create your account just now. Please try again.");

    // Shared-network sign-ups are allowed (hostels, campus Wi-Fi) but flagged for review.
    const sameIp = await get<{ c: number }>("SELECT count(*) AS c FROM partners WHERE signup_ip = ? AND id != ? AND datetime(created_at) >= datetime('now', '-1 day')", [ipOf(req), partnerId]);
    if (n(sameIp?.c) >= 3) await addFlag(partnerId, "many_signups_same_ip");

    if (application) {
      const v = application.values;
      await run(
        "INSERT INTO ambassador_applications (partner_id, college, year_of_study, motivation, reach, social_links) VALUES (?, ?, ?, ?, ?, ?)",
        [partnerId, v.college, v.year, v.motivation, v.reach, v.socials || null],
      );
    }

    const session = await createSession(partnerId, req);
    const partner = (await partnerById(partnerId)) as PartnerRow;
    console.log(`[partners] new partner ${partner.partner_code} (${partner.college})`);
    ok(res, { token: session.token, expiresAt: session.expiresAt, partner: selfView(partner), wallet: await walletOf(partnerId), ambassadorApplied: Boolean(application) }, 201);
  });

  app.post("/api/partners/login", loginLimiter, async (req, res) => {
    const email = str(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) return fail(res, 400, "Email and password are required.");
    const partner = await get<PartnerRow>("SELECT * FROM partners WHERE email = ?", [email]);
    // Always run one PBKDF2 check so timing doesn't reveal whether the email is registered.
    const valid = partner ? verifyPassword(password, partner.password_hash, partner.salt) : (verifyPassword(password, DUMMY.hash, DUMMY.salt), false);
    if (!partner || !valid) return fail(res, 401, "Invalid email or password.");
    if (partner.status !== "active") {
      return fail(res, 403, `Your partner account is suspended${partner.suspended_reason ? `: ${partner.suspended_reason}` : ""}. Contact us if you think this is a mistake.`, {
        code: "suspended",
      });
    }
    const session = await createSession(partner.id, req);
    ok(res, { token: session.token, expiresAt: session.expiresAt, partner: selfView(partner) });
  });

  /* ================================================================ */
  /* Partner (session-authenticated)                                  */
  /* ================================================================ */
  app.get("/api/partner/me", requirePartner, async (req: PartnerRequest, res) => {
    const me = req.partner!;
    const partner = (await partnerById(me.id)) as PartnerRow;
    const wallet = await walletOf(me.id);
    const stats = await get<{ leads: number; won: number; clicks: number }>(
      `SELECT
         (SELECT count(*) FROM enquiries WHERE partner_id = @id) AS leads,
         (SELECT count(*) FROM enquiries WHERE partner_id = @id AND status = 'won') AS won,
         (SELECT count(*) FROM events WHERE name = 'referral_click' AND json_extract(meta, '$.code') = @code) AS clicks`,
      { id: me.id, code: me.referralCode },
    );
    const ahead = wallet.lifetimePaise
      ? await get<{ c: number }>(
          `SELECT count(*) AS c FROM (SELECT partner_id, sum(amount_paise) AS s FROM partner_commissions WHERE status = 'earned' GROUP BY partner_id) t
           JOIN partners p ON p.id = t.partner_id WHERE p.status = 'active' AND t.s > ?`,
          [wallet.lifetimePaise],
        )
      : null;
    const application = await get<{ status: string }>("SELECT status FROM ambassador_applications WHERE partner_id = ? ORDER BY id DESC LIMIT 1", [me.id]);
    ok(res, {
      partner: selfView(partner),
      wallet,
      stats: { leads: n(stats?.leads), converted: n(stats?.won), clicks: n(stats?.clicks), rank: ahead ? n(ahead.c) + 1 : null },
      ambassadorStatus: application?.status ?? null,
      program: PROGRAM,
    });
  });

  app.post("/api/partner/logout", requirePartner, async (req: PartnerRequest, res) => {
    await run("DELETE FROM partner_sessions WHERE id = ?", [req.partner!.sessionId]);
    ok(res);
  });

  app.patch("/api/partner/me", requirePartner, partnerWriteLimiter, async (req: PartnerRequest, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    // Email and payout details have their own, password-protected flows.
    const allowed = Object.fromEntries(
      ["fullName", "phone", "college", "course", "graduationYear", "city", "region"].filter((k) => b[k] !== undefined).map((k) => [k, b[k]]),
    );
    const { cols, errors } = readProfile(allowed, true);
    if (b.showOnLeaderboard !== undefined) cols.show_on_leaderboard = b.showOnLeaderboard ? 1 : 0;
    if (Object.keys(errors).length) return fail(res, 422, "Please check the highlighted fields.", { errors });
    if (!Object.keys(cols).length) return fail(res, 400, "Nothing to update.");
    const keys = Object.keys(cols);
    await run(`UPDATE partners SET ${keys.map((k) => `${k} = @${k}`).join(", ")}, updated_at = datetime('now') WHERE id = @id`, { ...cols, id: req.partner!.id } as Args);
    leaderboardCache.clear();
    ok(res, selfView((await partnerById(req.partner!.id)) as PartnerRow));
  });

  app.put("/api/partner/payout-details", requirePartner, partnerWriteLimiter, async (req: PartnerRequest, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const partner = (await partnerById(req.partner!.id)) as PartnerRow;
    const current = typeof b.currentPassword === "string" ? b.currentPassword : "";
    if (!verifyPassword(current, partner.password_hash, partner.salt)) {
      return fail(res, 400, "Your current password is incorrect.", { errors: { currentPassword: "Incorrect password." } });
    }
    // Partners only ever see masked bank/PAN values, so a blank field means "keep what's on file".
    const input: Record<string, unknown> = { ...b };
    if (!str(b.bankAccountNumber, 30) && partner.bank_account_number && b.removeBank !== true) {
      input.bankAccountName = partner.bank_account_name;
      input.bankAccountNumber = partner.bank_account_number;
      input.bankIfsc = partner.bank_ifsc;
    }
    if (!str(b.pan, 12) && partner.pan && b.removePan !== true) input.pan = partner.pan;
    const { cols, errors } = readPayout(input);
    if (Object.keys(errors).length) return fail(res, 422, "Please check the highlighted fields.", { errors });
    await run(
      `UPDATE partners SET upi_id = @upi_id, bank_account_name = @bank_account_name, bank_account_number = @bank_account_number,
         bank_ifsc = @bank_ifsc, pan = @pan, updated_at = datetime('now') WHERE id = @id`,
      { ...cols, id: partner.id } as Args,
    );
    await addFlag(partner.id, "payout_details_changed");
    ok(res, selfView((await partnerById(partner.id)) as PartnerRow));
  });

  app.post("/api/partner/password", requirePartner, partnerWriteLimiter, async (req: PartnerRequest, res) => {
    const current = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const next = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    const partner = (await partnerById(req.partner!.id)) as PartnerRow;
    if (!verifyPassword(current, partner.password_hash, partner.salt)) return fail(res, 400, "Your current password is incorrect.");
    const problem = partnerPasswordProblem(next);
    if (problem) return fail(res, 422, `New password: ${problem}`);
    const { hash, salt } = hashPassword(next);
    await run("UPDATE partners SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = ?", [hash, salt, partner.id]);
    await run("DELETE FROM partner_sessions WHERE partner_id = ? AND id != ?", [partner.id, req.partner!.sessionId]);
    ok(res);
  });

  app.get("/api/partner/leads", requirePartner, async (req: PartnerRequest, res) => {
    const id = req.partner!.id;
    const rows = await all<{
      id: number;
      reference: string;
      name: string;
      companyName: string | null;
      email: string;
      service: string;
      status: string;
      source: string;
      createdAt: string;
      paidPaise: number;
      commissionPaise: number;
      installments: number;
    }>(
      `SELECT e.id, e.reference, e.name, e.company_name AS companyName, e.email, e.service, e.status, e.source, e.created_at AS createdAt,
         (SELECT coalesce(sum(cp.amount_paise), 0) FROM client_payments cp WHERE cp.enquiry_id = e.id AND cp.status = 'verified') AS paidPaise,
         (SELECT count(*) FROM client_payments cp WHERE cp.enquiry_id = e.id AND cp.status = 'verified') AS installments,
         (SELECT coalesce(sum(c.amount_paise), 0) FROM partner_commissions c WHERE c.enquiry_id = e.id AND c.partner_id = @id AND c.status = 'earned') AS commissionPaise
       FROM enquiries e WHERE e.partner_id = @id ORDER BY e.id DESC LIMIT 500`,
      { id },
    );
    ok(
      res,
      rows.map((r) => ({
        id: r.id,
        reference: r.reference,
        client: shortName(r.name),
        company: r.companyName ?? "",
        email: maskEmail(r.email),
        service: r.service,
        stage: partnerStage(r.status),
        via: r.source === "partner" ? "submitted" : "referral_link",
        paidPaise: n(r.paidPaise),
        installments: n(r.installments),
        commissionPaise: n(r.commissionPaise),
        createdAt: r.createdAt,
      })),
    );
  });

  app.post("/api/partner/leads", requirePartner, partnerWriteLimiter, async (req: PartnerRequest, res) => {
    const partner = (await partnerById(req.partner!.id)) as PartnerRow;
    const result = await createPartnerLead(partner, (req.body ?? {}) as Record<string, unknown>, req, "partner");
    if (result.error) return fail(res, result.status, result.error, result.errors ? { errors: result.errors } : undefined);
    leaderboardCache.clear();
    ok(res, result.data, 201);
  });

  app.get("/api/partner/earnings", requirePartner, async (req: PartnerRequest, res) => {
    const id = req.partner!.id;
    const commissions = await all<{ clientName: string | null } & Record<string, unknown>>(
      `SELECT c.id, c.amount_paise AS amountPaise, c.base_paise AS basePaise, c.rate_bps AS rateBps, c.status, c.available_at AS availableAt,
         c.created_at AS createdAt, c.reversed_reason AS reversedReason, cp.installment_label AS installment, cp.reference AS paymentReference,
         cp.paid_on AS paidOn, coalesce(e.name, cp.client_name) AS clientName
       FROM partner_commissions c JOIN client_payments cp ON cp.id = c.client_payment_id LEFT JOIN enquiries e ON e.id = c.enquiry_id
       WHERE c.partner_id = ? ORDER BY c.id DESC LIMIT 500`,
      [id],
    );
    const payouts = await all(
      `SELECT id, reference, amount_paise AS amountPaise, method, destination, status, utr, note, requested_at AS requestedAt, processed_at AS processedAt
       FROM partner_payouts WHERE partner_id = ? ORDER BY id DESC LIMIT 200`,
      [id],
    );
    const now = Date.now();
    ok(res, {
      wallet: await walletOf(id),
      program: PROGRAM,
      commissions: commissions.map((c) => ({
        ...c,
        clientName: shortName(String(c.clientName ?? "Client")),
        // "held" = inside the refund-safety window; becomes withdrawable at availableAt.
        state: c.status === "reversed" ? "reversed" : Date.parse(String(c.availableAt).replace(" ", "T") + "Z") > now ? "held" : "available",
      })),
      payouts,
    });
  });

  app.post("/api/partner/payouts", requirePartner, partnerWriteLimiter, async (req: PartnerRequest, res) => {
    const partner = (await partnerById(req.partner!.id)) as PartnerRow;
    const wallet = await walletOf(partner.id);
    const method = req.body?.method === "bank" ? "bank" : "upi";
    const amountPaise = req.body?.all === true ? wallet.availablePaise : Math.round(Number(req.body?.amount) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) return fail(res, 422, "Enter the amount you want to withdraw.");
    if (amountPaise < PROGRAM.minPayout * 100) return fail(res, 422, `The minimum withdrawal is ₹${PROGRAM.minPayout.toLocaleString("en-IN")}.`);
    if (amountPaise > wallet.availablePaise) return fail(res, 422, "That's more than your available balance.");

    let destination = "";
    if (method === "upi") {
      if (!partner.upi_id) return fail(res, 422, "Add a UPI ID in your profile first.");
      destination = `UPI · ${partner.upi_id}`;
    } else {
      if (!partner.bank_account_number || !partner.bank_ifsc) return fail(res, 422, "Add your bank account in your profile first.");
      destination = `Bank · ${partner.bank_account_name ?? ""} · A/c ${maskTail(partner.bank_account_number)} · ${partner.bank_ifsc}`;
    }

    // One atomic statement: re-checks the balance and "one open request at a time" inside the write,
    // so two simultaneous requests can never both pass.
    const reference = newReference("PO");
    const info = await run(
      `INSERT INTO partner_payouts (reference, partner_id, amount_paise, method, destination, status)
       SELECT @reference, @pid, @amount, @method, @destination, 'requested'
       WHERE (SELECT status FROM partners WHERE id = @pid) = 'active'
         AND NOT EXISTS (SELECT 1 FROM partner_payouts WHERE partner_id = @pid AND status = 'requested')
         AND (SELECT coalesce(sum(amount_paise), 0) FROM partner_commissions
                WHERE partner_id = @pid AND status = 'earned' AND datetime(available_at) <= datetime('now'))
           - (SELECT coalesce(sum(amount_paise), 0) FROM partner_payouts WHERE partner_id = @pid AND status IN ('requested','paid')) >= @amount`,
      { reference, pid: partner.id, amount: amountPaise, method, destination },
    );
    if (!info.changes) {
      const open = await get("SELECT 1 AS x FROM partner_payouts WHERE partner_id = ? AND status = 'requested'", [partner.id]);
      return fail(res, 409, open ? "You already have a withdrawal being processed. You can request another once it's paid." : "Your available balance changed — please refresh and try again.");
    }
    ok(res, { reference, amountPaise, destination, wallet: await walletOf(partner.id) }, 201);
  });

  app.get("/api/partner/ambassador", requirePartner, async (req: PartnerRequest, res) => {
    const rows = await all(
      `SELECT id, college, year_of_study AS yearOfStudy, motivation, reach, social_links AS socialLinks, status, review_note AS reviewNote,
         reviewed_at AS reviewedAt, created_at AS createdAt
       FROM ambassador_applications WHERE partner_id = ? ORDER BY id DESC LIMIT 5`,
      [req.partner!.id],
    );
    ok(res, rows);
  });

  app.post("/api/partner/ambassador", requirePartner, partnerWriteLimiter, async (req: PartnerRequest, res) => {
    const partner = (await partnerById(req.partner!.id)) as PartnerRow;
    if (partner.tier === "ambassador") return fail(res, 409, "You're already a Campus Ambassador.");
    if (await get("SELECT 1 AS x FROM ambassador_applications WHERE partner_id = ? AND status = 'pending'", [partner.id])) {
      return fail(res, 409, "Your application is already under review.");
    }
    const { values, errors } = readApplication((req.body ?? {}) as Record<string, unknown>, partner.college);
    if (Object.keys(errors).length) return fail(res, 422, "Please check the highlighted fields.", { errors });
    const info = await run(
      "INSERT INTO ambassador_applications (partner_id, college, year_of_study, motivation, reach, social_links) VALUES (?, ?, ?, ?, ?, ?)",
      [partner.id, values.college, values.year, values.motivation, values.reach, values.socials || null],
    );
    ok(res, { id: Number(info.lastInsertRowid), status: "pending" }, 201);
  });

  /* ================================================================ */
  /* Admin                                                            */
  /* ================================================================ */
  const idParam = (req: Request) => {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : 0;
  };

  app.get("/api/admin/partners/overview", adminOnly, async (_req, res) => {
    const partners = await get<Record<string, number>>(
      `SELECT count(*) AS total, sum(status = 'active') AS active, sum(status = 'suspended') AS suspended, sum(tier = 'ambassador') AS ambassadors,
         sum(datetime(created_at) >= datetime('now', '-7 days')) AS last7, sum(flags IS NOT NULL AND flags != '') AS flagged
       FROM partners`,
    );
    const leads = await get<Record<string, number>>("SELECT count(*) AS total, sum(status = 'won') AS won FROM enquiries WHERE partner_id IS NOT NULL");
    const payments = await get<Record<string, number>>(
      `SELECT coalesce(sum(CASE WHEN status = 'verified' AND partner_id IS NOT NULL THEN amount_paise END), 0) AS verifiedPaise,
         sum(status = 'pending') AS pending FROM client_payments`,
    );
    const commissions = await get<Record<string, number>>(
      `SELECT coalesce(sum(CASE WHEN status = 'earned' THEN amount_paise END), 0) AS earned,
         coalesce(sum(CASE WHEN status = 'earned' AND datetime(available_at) > datetime('now') THEN amount_paise END), 0) AS held,
         coalesce(sum(CASE WHEN status = 'reversed' THEN amount_paise END), 0) AS reversed
       FROM partner_commissions`,
    );
    const payouts = await get<Record<string, number>>(
      `SELECT sum(status = 'requested') AS requested, coalesce(sum(CASE WHEN status = 'requested' THEN amount_paise END), 0) AS requestedPaise,
         coalesce(sum(CASE WHEN status = 'paid' THEN amount_paise END), 0) AS paidPaise
       FROM partner_payouts`,
    );
    const apps = await get<{ c: number }>("SELECT count(*) AS c FROM ambassador_applications WHERE status = 'pending'");
    const earned = n(commissions?.earned);
    ok(res, {
      program: PROGRAM,
      kpis: {
        partners: n(partners?.total),
        active: n(partners?.active),
        suspended: n(partners?.suspended),
        ambassadors: n(partners?.ambassadors),
        newThisWeek: n(partners?.last7),
        flagged: n(partners?.flagged),
        leads: n(leads?.total),
        converted: n(leads?.won),
        verifiedRevenuePaise: n(payments?.verifiedPaise),
        pendingPayments: n(payments?.pending),
        commissionEarnedPaise: earned,
        commissionHeldPaise: n(commissions?.held),
        commissionReversedPaise: n(commissions?.reversed),
        payoutsRequested: n(payouts?.requested),
        payoutsRequestedPaise: n(payouts?.requestedPaise),
        payoutsPaidPaise: n(payouts?.paidPaise),
        liabilityPaise: earned - n(payouts?.paidPaise),
        pendingApplications: n(apps?.c),
      },
      colleges: await all("SELECT college AS label, count(*) AS value FROM partners GROUP BY college ORDER BY value DESC LIMIT 8"),
      regions: await all("SELECT region AS label, count(*) AS value FROM partners GROUP BY region ORDER BY value DESC LIMIT 8"),
    });
  });

  /* ---------------- Partners CRUD ---------------- */
  const PARTNER_LIST_SQL = `
    SELECT p.*,
      (SELECT count(*) FROM enquiries e WHERE e.partner_id = p.id) AS lead_count,
      (SELECT count(*) FROM enquiries e WHERE e.partner_id = p.id AND e.status = 'won') AS won_count,
      (SELECT coalesce(sum(c.amount_paise), 0) FROM partner_commissions c WHERE c.partner_id = p.id AND c.status = 'earned') AS lifetime_paise,
      (SELECT coalesce(sum(c.amount_paise), 0) FROM partner_commissions c WHERE c.partner_id = p.id AND c.status = 'earned' AND datetime(c.available_at) > datetime('now')) AS held_paise,
      (SELECT coalesce(sum(o.amount_paise), 0) FROM partner_payouts o WHERE o.partner_id = p.id AND o.status = 'requested') AS requested_paise,
      (SELECT coalesce(sum(o.amount_paise), 0) FROM partner_payouts o WHERE o.partner_id = p.id AND o.status = 'paid') AS paid_paise
    FROM partners p`;

  type ListRow = PartnerRow & { lead_count: number; won_count: number; lifetime_paise: number; held_paise: number; requested_paise: number; paid_paise: number };
  const listView = (r: ListRow) => {
    const lifetime = n(r.lifetime_paise);
    const held = n(r.held_paise);
    const requested = n(r.requested_paise);
    const paid = n(r.paid_paise);
    return {
      ...adminView(r),
      leads: n(r.lead_count),
      converted: n(r.won_count),
      wallet: { lifetimePaise: lifetime, heldPaise: held, requestedPaise: requested, paidOutPaise: paid, availablePaise: lifetime - held - requested - paid },
    };
  };

  app.get("/api/admin/partners", adminOnly, async (req, res) => {
    const where: string[] = [];
    const args: Record<string, string> = {};
    const q = str(req.query.q, 120).toLowerCase();
    if (q) {
      where.push(`(lower(p.full_name) LIKE @q OR p.email LIKE @q OR p.phone LIKE @q OR lower(p.partner_code) LIKE @q OR lower(p.referral_code) LIKE @q OR lower(p.college) LIKE @q)`);
      args.q = `%${q.replace(/[%_]/g, "")}%`;
    }
    for (const [key, col] of [["college", "college"], ["region", "region"], ["status", "status"], ["tier", "tier"]] as const) {
      const v = str(req.query[key], 160);
      if (v) {
        where.push(`p.${col} = @${key}`);
        args[key] = v;
      }
    }
    if (req.query.flagged === "1") where.push("p.flags IS NOT NULL AND p.flags != ''");
    const rows = await all<ListRow>(`${PARTNER_LIST_SQL} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY p.id DESC LIMIT 2000`, args);
    ok(res, {
      partners: rows.map(listView),
      facets: {
        colleges: (await all<{ v: string }>("SELECT DISTINCT college AS v FROM partners ORDER BY college COLLATE NOCASE")).map((r) => r.v),
        regions: (await all<{ v: string }>("SELECT DISTINCT region AS v FROM partners ORDER BY region")).map((r) => r.v),
      },
    });
  });

  app.post("/api/admin/partners", adminOnly, async (req: AdminRequest, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const profile = readProfile(b, false);
    const payout = readPayout(b);
    const errors: Errors = { ...profile.errors, ...payout.errors };
    const password = typeof b.password === "string" ? b.password : "";
    const problem = partnerPasswordProblem(password);
    if (problem) errors.password = `Temporary password: ${problem}`;
    const tier = b.tier === "ambassador" ? "ambassador" : "partner";
    if (Object.keys(errors).length) return fail(res, 422, Object.values(errors)[0], { errors });
    if (await get("SELECT 1 AS x FROM partners WHERE email = ?", [profile.cols.email])) return fail(res, 409, "A partner with that email already exists.");
    const { hash, salt } = hashPassword(password);
    let id = 0;
    for (let attempt = 0; attempt < 5 && !id; attempt += 1) {
      try {
        const info = await run(
          `INSERT INTO partners (partner_code, referral_code, full_name, email, phone, password_hash, salt, college, course, graduation_year,
             city, region, upi_id, bank_account_name, bank_account_number, bank_ifsc, pan, tier, admin_notes)
           VALUES (@code, @ref, @full_name, @email, @phone, @hash, @salt, @college, @course, @graduation_year,
             @city, @region, @upi_id, @bank_account_name, @bank_account_number, @bank_ifsc, @pan, @tier, @notes)`,
          {
            code: newPartnerCode(),
            ref: newReferralCode(String(profile.cols.full_name)),
            ...profile.cols,
            ...payout.cols,
            hash,
            salt,
            tier,
            notes: str(b.adminNotes, 2000) || null,
          } as Args,
        );
        id = Number(info.lastInsertRowid);
      } catch (err) {
        if (!String((err as Error).message).includes("UNIQUE")) throw err;
      }
    }
    if (!id) return fail(res, 503, "Couldn't create the partner — please try again.");
    await audit(req, "PARTNER_CREATED", `PARTNER_${id}`, String(profile.cols.email));
    leaderboardCache.clear();
    ok(res, adminView((await partnerById(id)) as PartnerRow), 201);
  });

  app.get("/api/admin/partners/:id", adminOnly, async (req, res) => {
    const id = idParam(req);
    const partner = await partnerById(id);
    if (!partner) return fail(res, 404, "Partner not found.");
    ok(res, {
      partner: adminView(partner),
      wallet: await walletOf(id),
      clicks: n((await get<{ c: number }>("SELECT count(*) AS c FROM events WHERE name = 'referral_click' AND json_extract(meta, '$.code') = ?", [partner.referral_code]))?.c),
      leads: await all(
        `SELECT e.id, e.reference, e.name, e.email, e.service, e.status, e.source, e.created_at AS createdAt,
           (SELECT coalesce(sum(cp.amount_paise), 0) FROM client_payments cp WHERE cp.enquiry_id = e.id AND cp.status = 'verified') AS paidPaise
         FROM enquiries e WHERE e.partner_id = ? ORDER BY e.id DESC LIMIT 200`,
        [id],
      ),
      commissions: await all(
        `SELECT c.id, c.amount_paise AS amountPaise, c.base_paise AS basePaise, c.rate_bps AS rateBps, c.status, c.available_at AS availableAt,
           c.created_at AS createdAt, c.reversed_reason AS reversedReason, cp.reference AS paymentReference, cp.client_name AS clientName, cp.installment_label AS installment
         FROM partner_commissions c JOIN client_payments cp ON cp.id = c.client_payment_id WHERE c.partner_id = ? ORDER BY c.id DESC LIMIT 300`,
        [id],
      ),
      payouts: await all(
        `SELECT id, reference, amount_paise AS amountPaise, method, destination, status, utr, note, processed_by AS processedBy,
           requested_at AS requestedAt, processed_at AS processedAt FROM partner_payouts WHERE partner_id = ? ORDER BY id DESC LIMIT 200`,
        [id],
      ),
      applications: await all(
        `SELECT id, college, year_of_study AS yearOfStudy, motivation, reach, social_links AS socialLinks, status, review_note AS reviewNote,
           reviewed_by AS reviewedBy, reviewed_at AS reviewedAt, created_at AS createdAt FROM ambassador_applications WHERE partner_id = ? ORDER BY id DESC`,
        [id],
      ),
    });
  });

  app.patch("/api/admin/partners/:id", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const partner = await partnerById(id);
    if (!partner) return fail(res, 404, "Partner not found.");
    const b = (req.body ?? {}) as Record<string, unknown>;
    const profile = readProfile(b, true);
    const cols: Cols = { ...profile.cols };
    const errors: Errors = { ...profile.errors };
    if (["upiId", "bankAccountName", "bankAccountNumber", "bankIfsc", "pan"].some((k) => b[k] !== undefined)) {
      const payout = readPayout(b);
      Object.assign(cols, payout.cols);
      Object.assign(errors, payout.errors);
    }
    if (b.tier !== undefined) {
      if (b.tier !== "partner" && b.tier !== "ambassador") errors.tier = "Invalid tier.";
      else cols.tier = b.tier;
    }
    if (b.adminNotes !== undefined) cols.admin_notes = str(b.adminNotes, 2000) || null;
    if (b.showOnLeaderboard !== undefined) cols.show_on_leaderboard = b.showOnLeaderboard ? 1 : 0;
    if (b.clearFlags === true) cols.flags = null;
    let passwordChanged = false;
    if (b.password !== undefined) {
      const problem = partnerPasswordProblem(typeof b.password === "string" ? b.password : "");
      if (problem) errors.password = `Password: ${problem}`;
      else {
        const { hash, salt } = hashPassword(b.password as string);
        cols.password_hash = hash;
        cols.salt = salt;
        passwordChanged = true;
      }
    }
    if (Object.keys(errors).length) return fail(res, 422, Object.values(errors)[0], { errors });
    if (!Object.keys(cols).length) return fail(res, 400, "Nothing to update.");
    if (cols.email && cols.email !== partner.email && (await get("SELECT 1 AS x FROM partners WHERE email = ? AND id != ?", [cols.email, id]))) {
      return fail(res, 409, "Another partner already uses that email.");
    }
    const keys = Object.keys(cols);
    await run(`UPDATE partners SET ${keys.map((k) => `${k} = @${k}`).join(", ")}, updated_at = datetime('now') WHERE id = @id`, { ...cols, id } as Args);
    if (passwordChanged) await run("DELETE FROM partner_sessions WHERE partner_id = ?", [id]);
    await audit(req, "PARTNER_UPDATED", `PARTNER_${id}`, keys.filter((k) => k !== "password_hash" && k !== "salt").join(", ") + (passwordChanged ? ", password" : ""));
    leaderboardCache.clear();
    ok(res, adminView((await partnerById(id)) as PartnerRow));
  });

  /** Fraud tool: block sign-in, new leads, commissions and withdrawals — optionally claw back unsettled money. */
  app.post("/api/admin/partners/:id/suspend", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const partner = await partnerById(id);
    if (!partner) return fail(res, 404, "Partner not found.");
    const reason = str(req.body?.reason, 300);
    if (reason.length < 3) return fail(res, 422, "Give a short reason — the partner sees it when signing in.");
    const reverseHeld = req.body?.reverseHeld === true;
    const rejectPayouts = req.body?.rejectPayouts !== false;
    const by = req.admin!.fullName;
    const statements: Array<[string, Args]> = [
      ["UPDATE partners SET status = 'suspended', suspended_reason = ?, suspended_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [reason, id]],
      ["DELETE FROM partner_sessions WHERE partner_id = ?", [id]],
    ];
    if (rejectPayouts) {
      statements.push([
        "UPDATE partner_payouts SET status = 'rejected', note = ?, processed_by = ?, processed_at = datetime('now') WHERE partner_id = ? AND status = 'requested'",
        [`Account suspended: ${reason}`, by, id],
      ]);
    }
    if (reverseHeld) {
      statements.push([
        `UPDATE partner_commissions SET status = 'reversed', reversed_reason = ?, reversed_by = ?, reversed_at = datetime('now')
         WHERE partner_id = ? AND status = 'earned' AND datetime(available_at) > datetime('now')`,
        [`Suspended: ${reason}`, by, id],
      ]);
    }
    await tx(statements);
    await audit(req, "PARTNER_SUSPENDED", `PARTNER_${id}`, `${reason}${reverseHeld ? " · held commissions reversed" : ""}${rejectPayouts ? " · open payouts rejected" : ""}`);
    leaderboardCache.clear();
    ok(res, { partner: adminView((await partnerById(id)) as PartnerRow), wallet: await walletOf(id) });
  });

  app.post("/api/admin/partners/:id/reactivate", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const info = await run(
      "UPDATE partners SET status = 'active', suspended_reason = NULL, suspended_at = NULL, updated_at = datetime('now') WHERE id = ? AND status = 'suspended'",
      [id],
    );
    if (!info.changes) return fail(res, 404, "Partner not found or not suspended.");
    await audit(req, "PARTNER_REACTIVATED", `PARTNER_${id}`);
    leaderboardCache.clear();
    ok(res, adminView((await partnerById(id)) as PartnerRow));
  });

  app.delete("/api/admin/partners/:id", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const partner = await partnerById(id);
    if (!partner) return fail(res, 404, "Partner not found.");
    const money = await get<{ c: number }>(
      `SELECT (SELECT count(*) FROM partner_commissions WHERE partner_id = @id) + (SELECT count(*) FROM partner_payouts WHERE partner_id = @id)
         + (SELECT count(*) FROM client_payments WHERE partner_id = @id) AS c`,
      { id },
    );
    if (n(money?.c) > 0) return fail(res, 409, "This partner has payment history, which must be kept. Suspend the account instead.");
    await tx([
      ["UPDATE enquiries SET partner_id = NULL, referral_code = NULL WHERE partner_id = ?", [id]],
      ["DELETE FROM partner_sessions WHERE partner_id = ?", [id]],
      ["DELETE FROM ambassador_applications WHERE partner_id = ?", [id]],
      ["DELETE FROM partners WHERE id = ?", [id]],
    ]);
    await audit(req, "PARTNER_DELETED", `PARTNER_${id}`, partner.email);
    leaderboardCache.clear();
    ok(res);
  });

  /* ---------------- Partner leads ---------------- */
  app.get("/api/admin/partner-leads", adminOnly, async (req, res) => {
    const where = ["e.partner_id IS NOT NULL"];
    const args: Record<string, string | number> = {};
    const partnerId = Number(req.query.partnerId);
    if (Number.isInteger(partnerId) && partnerId > 0) {
      where.push("e.partner_id = @partnerId");
      args.partnerId = partnerId;
    }
    for (const key of ["college", "region"] as const) {
      const v = str(req.query[key], 160);
      if (v) {
        where.push(`p.${key} = @${key}`);
        args[key] = v;
      }
    }
    ok(
      res,
      await all(
        `SELECT e.id, e.reference, e.name, e.company_name AS companyName, e.email, e.phone, e.service, e.budget_range AS budget, e.status,
           e.source, e.value_estimate AS valueEstimate, e.project_details AS details, e.created_at AS createdAt,
           p.id AS partnerId, p.full_name AS partnerName, p.partner_code AS partnerCode, p.college, p.region, p.status AS partnerStatus,
           (SELECT coalesce(sum(cp.amount_paise), 0) FROM client_payments cp WHERE cp.enquiry_id = e.id AND cp.status = 'verified') AS paidPaise,
           (SELECT coalesce(sum(c.amount_paise), 0) FROM partner_commissions c WHERE c.enquiry_id = e.id AND c.status = 'earned') AS commissionPaise
         FROM enquiries e JOIN partners p ON p.id = e.partner_id
         WHERE ${where.join(" AND ")} ORDER BY e.id DESC LIMIT 2000`,
        args,
      ),
    );
  });

  app.post("/api/admin/partner-leads", adminOnly, async (req: AdminRequest, res) => {
    const partner = await partnerById(Number(req.body?.partnerId));
    if (!partner) return fail(res, 422, "Choose the partner this lead belongs to.");
    const result = await createPartnerLead(partner, (req.body ?? {}) as Record<string, unknown>, req, "admin");
    if (result.error) return fail(res, result.status, result.error, result.errors ? { errors: result.errors } : undefined);
    await audit(req, "PARTNER_LEAD_CREATED", `LEAD_${result.data!.id}`, partner.partner_code);
    leaderboardCache.clear();
    ok(res, result.data, 201);
  });

  /** Reassign / unlink a referral, or move its pipeline stage. */
  app.patch("/api/admin/partner-leads/:id", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const lead = await get<{ id: number; status: string; partner_id: number | null }>("SELECT id, status, partner_id FROM enquiries WHERE id = ?", [id]);
    if (!lead) return fail(res, 404, "Lead not found.");
    const b = req.body ?? {};
    const statements: Array<[string, Args]> = [];
    const notes: string[] = [];
    if (b.partnerId !== undefined) {
      if (b.partnerId === null) {
        statements.push(["UPDATE enquiries SET partner_id = NULL, referral_code = NULL, updated_at = datetime('now') WHERE id = ?", [id]]);
        notes.push("Referral link removed by admin");
      } else {
        const partner = await partnerById(Number(b.partnerId));
        if (!partner) return fail(res, 422, "Partner not found.");
        statements.push(["UPDATE enquiries SET partner_id = ?, referral_code = ?, updated_at = datetime('now') WHERE id = ?", [partner.id, partner.referral_code, id]]);
        notes.push(`Referral assigned to ${partner.full_name} (${partner.partner_code}) by admin`);
      }
    }
    if (b.status !== undefined) {
      if (!(LEAD_STATUSES as readonly string[]).includes(b.status)) return fail(res, 422, "Invalid status.");
      statements.push(["UPDATE enquiries SET status = ?, updated_at = datetime('now') WHERE id = ?", [b.status, id]]);
      if (b.status !== lead.status) notes.push(`Status changed from ${lead.status} to ${b.status}`);
    }
    if (!statements.length) return fail(res, 400, "Nothing to update.");
    for (const body of notes) {
      statements.push(["INSERT INTO enquiry_notes (enquiry_id, admin_id, admin_name, kind, body) VALUES (?, ?, ?, 'referral', ?)", [id, req.admin!.id, req.admin!.fullName, body]]);
    }
    await tx(statements);
    await audit(req, "PARTNER_LEAD_UPDATED", `LEAD_${id}`, notes.join("; "));
    leaderboardCache.clear();
    ok(res);
  });

  app.delete("/api/admin/partner-leads/:id", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    if (!(await get("SELECT 1 AS x FROM enquiries WHERE id = ?", [id]))) return fail(res, 404, "Lead not found.");
    if (await get("SELECT 1 AS x FROM client_payments WHERE enquiry_id = ? AND status IN ('verified','refunded')", [id])) {
      return fail(res, 409, "This lead has verified payments, which must be kept. Unlink the partner or archive the lead instead.");
    }
    await tx([
      ["UPDATE client_payments SET enquiry_id = NULL WHERE enquiry_id = ?", [id]],
      ["DELETE FROM enquiries WHERE id = ?", [id]],
    ]);
    await audit(req, "PARTNER_LEAD_DELETED", `LEAD_${id}`);
    leaderboardCache.clear();
    ok(res);
  });

  /* ---------------- Client payments ---------------- */
  const PAYMENT_SELECT = `
    SELECT cp.id, cp.reference, cp.enquiry_id AS enquiryId, cp.partner_id AS partnerId, cp.client_name AS clientName, cp.client_email AS clientEmail,
      cp.amount_paise AS amountPaise, cp.currency, cp.installment_label AS installment, cp.method, cp.external_ref AS externalRef, cp.paid_on AS paidOn,
      cp.source, cp.status, cp.recorded_by AS recordedBy, cp.recorded_by_id AS recordedById, cp.verified_by AS verifiedBy, cp.verified_at AS verifiedAt,
      cp.notes, cp.created_at AS createdAt,
      e.reference AS leadReference, coalesce(p.full_name, lp.full_name) AS partnerName, coalesce(p.partner_code, lp.partner_code) AS partnerCode,
      coalesce(p.college, lp.college) AS college, c.id AS commissionId, c.amount_paise AS commissionPaise, c.status AS commissionStatus
    FROM client_payments cp
      LEFT JOIN enquiries e ON e.id = cp.enquiry_id
      LEFT JOIN partners p ON p.id = cp.partner_id
      LEFT JOIN partners lp ON lp.id = e.partner_id
      LEFT JOIN partner_commissions c ON c.client_payment_id = cp.id`;

  app.get("/api/admin/client-payments", adminOnly, async (req, res) => {
    const where: string[] = [];
    const args: Record<string, string | number> = {};
    const status = str(req.query.status, 20);
    if (status) {
      where.push("cp.status = @status");
      args.status = status;
    }
    const partnerId = Number(req.query.partnerId);
    if (Number.isInteger(partnerId) && partnerId > 0) {
      where.push("(cp.partner_id = @partnerId OR e.partner_id = @partnerId)");
      args.partnerId = partnerId;
    }
    ok(res, await all(`${PAYMENT_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY cp.id DESC LIMIT 2000`, args));
  });

  function readPaymentFields(b: Record<string, unknown>, partial: boolean): { cols: Cols; errors: Errors } {
    const cols: Cols = {};
    const errors: Errors = {};
    const has = (k: string) => !partial || b[k] !== undefined;
    if (has("amount")) {
      const amount = Math.round(Number(b.amount) * 100);
      if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Enter the amount received.";
      else if (amount > MAX_PAYMENT_PAISE) errors.amount = "That amount looks too large.";
      else cols.amount_paise = amount;
    }
    if (has("installmentLabel")) cols.installment_label = str(b.installmentLabel, 120) || null;
    if (has("method")) {
      const method = str(b.method, 40);
      if (method && !(PAYMENT_METHODS as readonly string[]).includes(method)) errors.method = "Choose a payment method.";
      else cols.method = method || null;
    }
    if (has("externalRef")) cols.external_ref = str(b.externalRef, 120) || null;
    if (has("paidOn")) {
      const date = str(b.paidOn, 10);
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.paidOn = "Use a valid date.";
      else cols.paid_on = date || null;
    }
    if (has("notes")) cols.notes = str(b.notes, 1000) || null;
    return { cols, errors };
  }

  async function duplicateRef(externalRef: string | number | null | undefined, exceptId = 0) {
    if (!externalRef) return false;
    return Boolean(
      await get("SELECT 1 AS x FROM client_payments WHERE external_ref = ? AND status IN ('pending','verified') AND id != ? LIMIT 1", [externalRef, exceptId]),
    );
  }

  app.post("/api/admin/client-payments", adminOnly, async (req: AdminRequest, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const lead = await get<{ id: number; name: string; email: string; partner_id: number | null }>("SELECT id, name, email, partner_id FROM enquiries WHERE id = ?", [
      Number(b.enquiryId),
    ]);
    if (!lead) return fail(res, 422, "Choose the lead (client) this payment is for.", { errors: { enquiryId: "Required." } });
    const { cols, errors } = readPaymentFields(b, false);
    if (Object.keys(errors).length) return fail(res, 422, Object.values(errors)[0], { errors });
    if (await duplicateRef(cols.external_ref)) return fail(res, 409, "A payment with this transaction reference is already recorded.");
    const reference = newReference("CP");
    const info = await run(
      `INSERT INTO client_payments (reference, enquiry_id, partner_id, client_name, client_email, amount_paise, installment_label, method,
         external_ref, paid_on, notes, source, status, recorded_by_id, recorded_by)
       VALUES (@reference, @enquiryId, @partnerId, @name, @email, @amount_paise, @installment_label, @method, @external_ref, @paid_on, @notes,
         'manual', 'pending', @adminId, @adminName)`,
      {
        reference,
        enquiryId: lead.id,
        partnerId: lead.partner_id,
        name: lead.name,
        email: lead.email,
        ...cols,
        adminId: req.admin!.id,
        adminName: req.admin!.fullName,
      } as Args,
    );
    const id = Number(info.lastInsertRowid);
    await audit(req, "CLIENT_PAYMENT_RECORDED", `CPAY_${id}`, `${reference} · ₹${(Number(cols.amount_paise) / 100).toLocaleString("en-IN")}`);
    ok(res, await get(`${PAYMENT_SELECT} WHERE cp.id = ?`, [id]), 201);
  });

  app.patch("/api/admin/client-payments/:id", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const row = await get<{ status: string }>("SELECT status FROM client_payments WHERE id = ?", [id]);
    if (!row) return fail(res, 404, "Payment not found.");
    if (row.status !== "pending") return fail(res, 409, "Only pending payments can be edited. Refund a verified payment instead.");
    const b = (req.body ?? {}) as Record<string, unknown>;
    const { cols, errors } = readPaymentFields(b, true);
    if (b.enquiryId !== undefined) {
      const lead = await get<{ id: number; name: string; email: string; partner_id: number | null }>("SELECT id, name, email, partner_id FROM enquiries WHERE id = ?", [
        Number(b.enquiryId),
      ]);
      if (!lead) errors.enquiryId = "Lead not found.";
      else Object.assign(cols, { enquiry_id: lead.id, partner_id: lead.partner_id, client_name: lead.name, client_email: lead.email });
    }
    if (Object.keys(errors).length) return fail(res, 422, Object.values(errors)[0], { errors });
    if (!Object.keys(cols).length) return fail(res, 400, "Nothing to update.");
    if (await duplicateRef(cols.external_ref, id)) return fail(res, 409, "A payment with this transaction reference is already recorded.");
    const keys = Object.keys(cols);
    await run(`UPDATE client_payments SET ${keys.map((k) => `${k} = @${k}`).join(", ")}, updated_at = datetime('now') WHERE id = @id AND status = 'pending'`, {
      ...cols,
      id,
    } as Args);
    await audit(req, "CLIENT_PAYMENT_UPDATED", `CPAY_${id}`, keys.join(", "));
    ok(res, await get(`${PAYMENT_SELECT} WHERE cp.id = ?`, [id]));
  });

  /** Verification is the only way a manual payment earns commission. Maker-checker for non-owners. */
  app.post("/api/admin/client-payments/:id/verify", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const row = await get<{ status: string; recorded_by_id: number | null; enquiry_id: number | null; client_email: string | null }>(
      "SELECT status, recorded_by_id, enquiry_id, client_email FROM client_payments WHERE id = ?",
      [id],
    );
    if (!row) return fail(res, 404, "Payment not found.");
    if (row.status !== "pending") return fail(res, 409, `This payment is already ${row.status}.`);
    if (req.admin!.role !== "owner" && row.recorded_by_id === req.admin!.id) {
      return fail(res, 403, "Another admin (or the owner) must verify a payment you recorded.");
    }
    const partner = row.enquiry_id
      ? await get<{ id: number; status: string; email: string }>(
          "SELECT p.id, p.status, p.email FROM enquiries e JOIN partners p ON p.id = e.partner_id WHERE e.id = ?",
          [row.enquiry_id],
        )
      : undefined;
    if (partner && partner.status !== "active") {
      return fail(res, 409, "The referring partner is suspended. Reactivate them, or unlink the partner from this lead, before verifying.");
    }
    await tx([
      [
        `UPDATE client_payments SET status = 'verified', verified_by = ?, verified_at = datetime('now'), updated_at = datetime('now'),
           partner_id = (SELECT e.partner_id FROM enquiries e WHERE e.id = client_payments.enquiry_id)
         WHERE id = ? AND status = 'pending'`,
        [req.admin!.fullName, id],
      ],
      [COMMISSION_INSERT("cp.id = @id"), { id }],
    ]);
    const fresh = await get<{ commissionPaise: number | null }>(`${PAYMENT_SELECT} WHERE cp.id = ?`, [id]);
    await audit(req, "CLIENT_PAYMENT_VERIFIED", `CPAY_${id}`, fresh?.commissionPaise ? `commission ₹${(n(fresh.commissionPaise) / 100).toFixed(2)}` : "no commission");
    leaderboardCache.clear();
    ok(res, fresh);
  });

  app.post("/api/admin/client-payments/:id/reject", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const reason = str(req.body?.reason, 300);
    const info = await run(
      `UPDATE client_payments SET status = 'rejected', notes = trim(coalesce(notes, '') || ' ' || ?), verified_by = ?, verified_at = datetime('now'),
         updated_at = datetime('now') WHERE id = ? AND status = 'pending'`,
      [`[Rejected: ${reason || "not received"}]`, req.admin!.fullName, id],
    );
    if (!info.changes) return fail(res, 409, "Only pending payments can be rejected.");
    await audit(req, "CLIENT_PAYMENT_REJECTED", `CPAY_${id}`, reason);
    ok(res, await get(`${PAYMENT_SELECT} WHERE cp.id = ?`, [id]));
  });

  /** Money returned to the client: the payment is marked refunded and its commission reversed. */
  app.post("/api/admin/client-payments/:id/refund", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const reason = str(req.body?.reason, 300);
    if (reason.length < 3) return fail(res, 422, "Give a short reason for the refund.");
    const row = await get<{ status: string }>("SELECT status FROM client_payments WHERE id = ?", [id]);
    if (!row) return fail(res, 404, "Payment not found.");
    if (row.status !== "verified") return fail(res, 409, "Only verified payments can be refunded.");
    await tx([
      [
        "UPDATE client_payments SET status = 'refunded', notes = trim(coalesce(notes, '') || ' ' || ?), updated_at = datetime('now') WHERE id = ? AND status = 'verified'",
        [`[Refunded: ${reason}]`, id],
      ],
      [
        "UPDATE partner_commissions SET status = 'reversed', reversed_reason = ?, reversed_by = ?, reversed_at = datetime('now') WHERE client_payment_id = ? AND status = 'earned'",
        [`Client refunded: ${reason}`, req.admin!.fullName, id],
      ],
    ]);
    await audit(req, "CLIENT_PAYMENT_REFUNDED", `CPAY_${id}`, reason);
    leaderboardCache.clear();
    ok(res, await get(`${PAYMENT_SELECT} WHERE cp.id = ?`, [id]));
  });

  app.delete("/api/admin/client-payments/:id", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const row = await get<{ status: string }>("SELECT status FROM client_payments WHERE id = ?", [id]);
    if (!row) return fail(res, 404, "Payment not found.");
    if (row.status === "verified" || row.status === "refunded") return fail(res, 409, "Verified payments are part of the financial record and can't be deleted.");
    await run("DELETE FROM client_payments WHERE id = ?", [id]);
    await audit(req, "CLIENT_PAYMENT_DELETED", `CPAY_${id}`);
    ok(res);
  });

  /* ---------------- Commissions ---------------- */
  app.get("/api/admin/partner-commissions", adminOnly, async (_req, res) => {
    ok(
      res,
      await all(
        `SELECT c.id, c.partner_id AS partnerId, p.full_name AS partnerName, p.partner_code AS partnerCode, p.college, p.region,
           c.client_payment_id AS clientPaymentId, cp.reference AS paymentReference, cp.client_name AS clientName, cp.installment_label AS installment,
           c.base_paise AS basePaise, c.rate_bps AS rateBps, c.amount_paise AS amountPaise, c.status, c.available_at AS availableAt,
           c.reversed_reason AS reversedReason, c.reversed_by AS reversedBy, c.created_at AS createdAt
         FROM partner_commissions c JOIN partners p ON p.id = c.partner_id JOIN client_payments cp ON cp.id = c.client_payment_id
         ORDER BY c.id DESC LIMIT 5000`,
      ),
    );
  });

  app.post("/api/admin/partner-commissions/:id/reverse", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const reason = str(req.body?.reason, 300);
    if (reason.length < 3) return fail(res, 422, "Give a short reason — the partner sees it.");
    const info = await run(
      "UPDATE partner_commissions SET status = 'reversed', reversed_reason = ?, reversed_by = ?, reversed_at = datetime('now') WHERE id = ? AND status = 'earned'",
      [reason, req.admin!.fullName, id],
    );
    if (!info.changes) return fail(res, 409, "Commission not found or already reversed.");
    await audit(req, "COMMISSION_REVERSED", `COMMISSION_${id}`, reason);
    leaderboardCache.clear();
    ok(res);
  });

  /* ---------------- Payouts ---------------- */
  app.get("/api/admin/partner-payouts", adminOnly, async (_req, res) => {
    ok(
      res,
      await all(
        `SELECT o.id, o.reference, o.partner_id AS partnerId, p.full_name AS partnerName, p.partner_code AS partnerCode, p.college, p.region,
           p.status AS partnerStatus, p.flags, o.amount_paise AS amountPaise, o.method, o.destination, o.status, o.utr, o.note,
           o.processed_by AS processedBy, o.requested_at AS requestedAt, o.processed_at AS processedAt,
           p.upi_id AS upiId, p.bank_account_name AS bankAccountName, p.bank_account_number AS bankAccountNumber, p.bank_ifsc AS bankIfsc
         FROM partner_payouts o JOIN partners p ON p.id = o.partner_id ORDER BY (o.status = 'requested') DESC, o.id DESC LIMIT 2000`,
      ),
    );
  });

  app.post("/api/admin/partner-payouts/:id/pay", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const utr = str(req.body?.utr, 60);
    if (utr.length < 6) return fail(res, 422, "Enter the UPI / bank transaction reference (UTR) of the transfer.");
    if (await get("SELECT 1 AS x FROM partner_payouts WHERE utr = ? AND id != ?", [utr, id])) return fail(res, 409, "That UTR is already used on another payout.");
    const info = await run(
      "UPDATE partner_payouts SET status = 'paid', utr = ?, note = ?, processed_by = ?, processed_at = datetime('now') WHERE id = ? AND status = 'requested'",
      [utr, str(req.body?.note, 300) || null, req.admin!.fullName, id],
    );
    if (!info.changes) return fail(res, 409, "Only open withdrawal requests can be marked paid.");
    await audit(req, "PAYOUT_PAID", `PAYOUT_${id}`, `UTR ${utr}`);
    ok(res);
  });

  app.post("/api/admin/partner-payouts/:id/reject", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const note = str(req.body?.note, 300);
    if (note.length < 3) return fail(res, 422, "Tell the partner why (they see this note).");
    const info = await run(
      "UPDATE partner_payouts SET status = 'rejected', note = ?, processed_by = ?, processed_at = datetime('now') WHERE id = ? AND status = 'requested'",
      [note, req.admin!.fullName, id],
    );
    if (!info.changes) return fail(res, 409, "Only open withdrawal requests can be rejected.");
    await audit(req, "PAYOUT_REJECTED", `PAYOUT_${id}`, note);
    ok(res);
  });

  /* ---------------- Campus Ambassador applications ---------------- */
  app.get("/api/admin/ambassadors", adminOnly, async (_req, res) => {
    ok(
      res,
      await all(
        `SELECT a.id, a.partner_id AS partnerId, p.full_name AS partnerName, p.partner_code AS partnerCode, p.email, p.phone, p.region, p.tier,
           p.status AS partnerStatus, a.college, a.year_of_study AS yearOfStudy, a.motivation, a.reach, a.social_links AS socialLinks, a.status,
           a.review_note AS reviewNote, a.reviewed_by AS reviewedBy, a.reviewed_at AS reviewedAt, a.created_at AS createdAt,
           (SELECT count(*) FROM enquiries e WHERE e.partner_id = p.id) AS leads
         FROM ambassador_applications a JOIN partners p ON p.id = a.partner_id
         ORDER BY (a.status = 'pending') DESC, a.id DESC LIMIT 2000`,
      ),
    );
  });

  async function reviewApplication(req: AdminRequest, res: Response, decision: "approved" | "rejected") {
    const id = idParam(req);
    const application = await get<{ partner_id: number; status: string }>("SELECT partner_id, status FROM ambassador_applications WHERE id = ?", [id]);
    if (!application) return fail(res, 404, "Application not found.");
    if (application.status !== "pending") return fail(res, 409, `This application was already ${application.status}.`);
    const note = str(req.body?.note, 500);
    if (decision === "rejected" && note.length < 3) return fail(res, 422, "Add a short note for the applicant.");
    const statements: Array<[string, Args]> = [
      [
        "UPDATE ambassador_applications SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND status = 'pending'",
        [decision, note || null, req.admin!.fullName, id],
      ],
    ];
    if (decision === "approved") statements.push(["UPDATE partners SET tier = 'ambassador', updated_at = datetime('now') WHERE id = ?", [application.partner_id]]);
    await tx(statements);
    await audit(req, decision === "approved" ? "AMBASSADOR_APPROVED" : "AMBASSADOR_REJECTED", `PARTNER_${application.partner_id}`, note);
    leaderboardCache.clear();
    ok(res);
  }
  app.post("/api/admin/ambassadors/:id/approve", adminOnly, (req: AdminRequest, res) => reviewApplication(req, res, "approved"));
  app.post("/api/admin/ambassadors/:id/reject", adminOnly, (req: AdminRequest, res) => reviewApplication(req, res, "rejected"));

  app.delete("/api/admin/ambassadors/:id", adminOnly, async (req: AdminRequest, res) => {
    const id = idParam(req);
    const info = await run("DELETE FROM ambassador_applications WHERE id = ?", [id]);
    if (!info.changes) return fail(res, 404, "Application not found.");
    await audit(req, "AMBASSADOR_APPLICATION_DELETED", `APPLICATION_${id}`);
    ok(res);
  });
}
