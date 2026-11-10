/**
 * End-to-end test of the Student Partner & Campus Ambassador program.
 *
 *   npm run test:partners
 *
 * Boots the real API on a throwaway SQLite file in the OS temp folder (never Turso,
 * never your .env), drives every flow over HTTP, then deletes the temp folder.
 */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wx-partners-"));
const DB_PATH = path.join(tmp, "test.db");
const PORT = 4300 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}/api`;
const OWNER = { email: "owner@test.local", password: "OwnerPass12345" };

// Isolate this process too (it imports db.ts for the Razorpay + trigger checks).
const isolatedEnv: Record<string, string> = {
  PORT: String(PORT),
  DB_PATH,
  ADMIN_EMAIL: OWNER.email,
  ADMIN_PASSWORD: OWNER.password,
  ADMIN_NAME: "Test Owner",
  PARTNER_HOLD_DAYS: "0",
  TURSO_DATABASE_URL: "",
  TURSO_AUTH_TOKEN: "",
  RAZORPAY_KEY_ID: "",
  RAZORPAY_KEY_SECRET: "",
  BREVO_API_KEY: "",
  RESEND_API_KEY: "",
  SMTP_HOST: "",
};
Object.assign(process.env, isolatedEnv);

let server: ChildProcess | null = null;
let passed = 0;
const failures: string[] = [];

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(name);
    console.log(`  ✗ ${name}\n      ${(err as Error).message.split("\n").join("\n      ")}`);
  }
}

type Res<T = any> = { status: number; body: { ok: boolean; data?: T; error?: string; errors?: Record<string, string> } };
async function call<T = any>(method: string, p: string, body?: unknown, token?: string): Promise<Res<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: (await res.json()) as Res<T>["body"] };
}
const expectStatus = (r: Res, status: number) =>
  assert.equal(r.status, status, `expected HTTP ${status}, got ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`);

async function startServer() {
  server = spawn(process.execPath, [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), path.join(root, "server", "index.ts")], {
    cwd: tmp, // no .env here, so nothing from the real environment is loaded
    env: { ...process.env, ...isolatedEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  server.stdout?.on("data", (c) => (log += c));
  server.stderr?.on("data", (c) => (log += c));
  for (let i = 0; i < 80; i += 1) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) {
        const health = (await res.json()) as { data: { database: string } };
        assert.equal(health.data.database, "sqlite", "test server must run on local SQLite");
        return;
      }
    } catch {
      /* not up yet */
    }
  }
  throw new Error(`API did not start:\n${log}`);
}

const partnerBody = (over: Record<string, unknown> = {}) => ({
  fullName: "Riya Sharma",
  email: "riya@student.test",
  phone: "98765 43210",
  password: "riyaPass123",
  college: "Delhi Technological University",
  course: "B.Tech CSE",
  graduationYear: 2027,
  city: "New Delhi",
  region: "Delhi",
  upiId: "riya@okaxis",
  acceptTerms: true,
  ...over,
});

async function main() {
  console.log(`\nPartner program E2E — temp DB ${DB_PATH}\n`);
  await startServer();

  let ownerToken = "";
  let editorAdminToken = "";
  let riya: { token: string; partner: { id: number; partnerCode: string; referralCode: string } } = null as never;
  let aman: { token: string; partner: { id: number; referralCode: string } } = null as never;
  let leadId = 0;
  let linkLeadEmail = "";
  let paymentA = 0;
  let paymentB = 0;

  await step("program config exposes 20% commission", async () => {
    const r = await call("GET", "/partners/config");
    expectStatus(r, 200);
    assert.equal(r.body.data.commissionPercent, 20);
  });

  await step("registration rejects missing / invalid fields with field errors", async () => {
    const r = await call("POST", "/partners/register", { fullName: "R", email: "nope", password: "short", region: "Atlantis" });
    expectStatus(r, 422);
    for (const key of ["fullName", "email", "phone", "college", "region", "password", "upiId", "acceptTerms"]) {
      assert.ok(r.body.errors?.[key], `missing error for ${key}`);
    }
  });

  await step("registration creates Partner ID, referral code, session and a zero wallet", async () => {
    const r = await call("POST", "/partners/register", partnerBody());
    expectStatus(r, 201);
    riya = r.body.data;
    assert.match(riya.partner.partnerCode, /^SP\d{2}-[A-Z2-9]{6}$/);
    assert.match(riya.partner.referralCode, /^RIYA[A-Z2-9]{4}$/);
    assert.equal(r.body.data.partner.phone, "+919876543210");
    assert.deepEqual(
      [r.body.data.wallet.availablePaise, r.body.data.wallet.heldPaise, r.body.data.wallet.lifetimePaise, r.body.data.wallet.paidOutPaise],
      [0, 0, 0, 0],
    );
    assert.ok(riya.token.length > 30);
    assert.equal(JSON.stringify(r.body).includes("password_hash"), false, "hash must never be returned");
  });

  await step("duplicate email is refused", async () => {
    expectStatus(await call("POST", "/partners/register", partnerBody({ phone: "9000000001" })), 409);
  });

  await step("registration with a Campus Ambassador application files both", async () => {
    const r = await call(
      "POST",
      "/partners/register",
      partnerBody({
        fullName: "Aman Verma",
        email: "aman@student.test",
        phone: "9811111111",
        college: "IIT Bombay",
        region: "Maharashtra",
        upiId: "",
        bankAccountName: "Aman Verma",
        bankAccountNumber: "123456789012",
        bankIfsc: "hdfc0001234",
        password: "amanPass123",
        ambassador: { yearOfStudy: "3rd year", motivation: "I run the coding society and want to bring real client work to students.", reach: "Coding club, 400 members" },
      }),
    );
    expectStatus(r, 201);
    aman = r.body.data;
    assert.equal(r.body.data.ambassadorApplied, true);
    assert.equal(r.body.data.partner.payout.bankAccountMasked.endsWith("9012"), true);
    assert.equal(JSON.stringify(r.body).includes("123456789012"), false, "full account number must not be echoed to the partner");
  });

  await step("weak passwords are rejected", async () => {
    const r = await call("POST", "/partners/register", partnerBody({ email: "weak@student.test", password: "abcdefgh" }));
    expectStatus(r, 422);
    assert.ok(r.body.errors?.password);
  });

  await step("passwords are stored as salted PBKDF2 hashes", async () => {
    const { get } = await import("./db.js");
    const row = await get<{ password_hash: string; salt: string }>("SELECT password_hash, salt FROM partners WHERE email = ?", ["riya@student.test"]);
    assert.ok(row);
    assert.equal(row.password_hash.length, 128);
    assert.ok(row.salt.length >= 32);
    assert.equal(row.password_hash.includes("riyaPass123"), false);
  });

  await step("login: wrong password 401, right password issues a new session", async () => {
    expectStatus(await call("POST", "/partners/login", { email: "riya@student.test", password: "wrongPass1" }), 401);
    const r = await call("POST", "/partners/login", { email: "RIYA@student.test", password: "riyaPass123" });
    expectStatus(r, 200);
    assert.equal(r.body.data.partner.partnerCode, riya.partner.partnerCode);
  });

  await step("partner endpoints require a partner session (admin token is not accepted)", async () => {
    expectStatus(await call("GET", "/partner/me"), 401);
    const admin = await call("POST", "/admin/login", OWNER);
    expectStatus(admin, 200);
    ownerToken = admin.body.data.token;
    expectStatus(await call("GET", "/partner/me", undefined, ownerToken), 401);
    expectStatus(await call("GET", "/admin/partners", undefined, riya.token), 401);
    const me = await call("GET", "/partner/me", undefined, riya.token);
    expectStatus(me, 200);
    assert.equal(me.body.data.partner.id, riya.partner.id);
  });

  await step("partner leads: self-referral blocked, valid lead created, duplicates refused", async () => {
    const self = await call("POST", "/partner/leads", { name: "Me", email: "riya@student.test", details: "My own website please" }, riya.token);
    expectStatus(self, 422);
    const ok = await call(
      "POST",
      "/partner/leads",
      { name: "Kapoor Sweets", email: "owner@kapoorsweets.test", phone: "9922334455", companyName: "Kapoor Sweets", service: "E-commerce store", budget: "₹50k", details: "Online store for a sweet shop with delivery." },
      riya.token,
    );
    expectStatus(ok, 201);
    leadId = ok.body.data.id;
    expectStatus(await call("POST", "/partner/leads", { name: "Again", email: "owner@kapoorsweets.test", details: "Same client again here" }, aman.token), 409);
  });

  await step("partner sees own leads only, with masked contact details", async () => {
    const mine = await call("GET", "/partner/leads", undefined, riya.token);
    expectStatus(mine, 200);
    assert.equal(mine.body.data.length, 1);
    assert.equal(mine.body.data[0].stage, "submitted");
    assert.equal(mine.body.data[0].email.includes("kapoorsweets.test"), true);
    assert.equal(mine.body.data[0].email.startsWith("owner@"), false, "email must be masked");
    const other = await call("GET", "/partner/leads", undefined, aman.token);
    assert.equal(other.body.data.length, 0);
  });

  await step("referral link: click is tracked and the contact form lead is attributed", async () => {
    const click = await call("POST", "/partners/click", { code: riya.partner.referralCode.toLowerCase(), sid: "s1", path: "/" });
    expectStatus(click, 200);
    assert.equal(click.body.data.valid, true);
    await call("POST", "/partners/click", { code: riya.partner.referralCode, sid: "s1" }); // same session → counted once
    assert.equal((await call("POST", "/partners/click", { code: "NOPE1234" })).body.data.valid, false);
    linkLeadEmail = "founder@startup.test";
    const enq = await call("POST", "/enquiries", { name: "Startup Founder", email: linkLeadEmail, details: "We need a SaaS dashboard built.", referralCode: riya.partner.referralCode });
    expectStatus(enq, 201);
    const me = await call("GET", "/partner/me", undefined, riya.token);
    assert.equal(me.body.data.stats.leads, 2);
    assert.equal(me.body.data.stats.clicks, 1);
  });

  await step("referral link does not steal an organic client or credit self-referrals", async () => {
    await call("POST", "/enquiries", { name: "Organic Client", email: "organic@client.test", details: "Found you on Google, need a site." });
    await call("POST", "/enquiries", { name: "Organic Client", email: "organic@client.test", details: "Following up via a friend's link.", referralCode: aman.partner.referralCode });
    await call("POST", "/enquiries", { name: "Riya", email: "riya@student.test", details: "Trying my own link for commission.", referralCode: riya.partner.referralCode });
    const leads = await call("GET", "/admin/partner-leads", undefined, ownerToken);
    expectStatus(leads, 200);
    const emails = leads.body.data.map((l: { email: string }) => l.email);
    assert.equal(emails.includes("organic@client.test"), false);
    assert.equal(emails.includes("riya@student.test"), false);
    const flagged = await call("GET", `/admin/partners/${riya.partner.id}`, undefined, ownerToken);
    assert.ok(flagged.body.data.partner.flags.includes("self_referral_attempt"));
  });

  await step("admin CRM lead list shows the referring partner", async () => {
    const r = await call("GET", "/admin/enquiries", undefined, ownerToken);
    const lead = r.body.data.find((l: { id: number }) => l.id === leadId);
    assert.ok(String(lead.partner).includes(riya.partner.partnerCode));
  });

  await step("admin partner list filters by college and region", async () => {
    const byCollege = await call("GET", `/admin/partners?college=${encodeURIComponent("IIT Bombay")}`, undefined, ownerToken);
    assert.deepEqual(byCollege.body.data.partners.map((p: { id: number }) => p.id), [aman.partner.id]);
    const byRegion = await call("GET", "/admin/partners?region=Delhi", undefined, ownerToken);
    assert.deepEqual(byRegion.body.data.partners.map((p: { id: number }) => p.id), [riya.partner.id]);
    assert.ok(byRegion.body.data.facets.colleges.includes("IIT Bombay"));
    const q = await call("GET", `/admin/partners?q=${riya.partner.partnerCode.toLowerCase()}`, undefined, ownerToken);
    assert.equal(q.body.data.partners.length, 1);
  });

  await step("a recorded (unverified) payment earns nothing", async () => {
    const r = await call("POST", "/admin/client-payments", { enquiryId: leadId, amount: 10000.5, installmentLabel: "Advance (40%)", method: "UPI", externalRef: "UTR-AAA-111", paidOn: "2026-11-01" }, ownerToken);
    expectStatus(r, 201);
    paymentA = r.body.data.id;
    assert.equal(r.body.data.status, "pending");
    assert.equal(r.body.data.amountPaise, 1000050);
    const me = await call("GET", "/partner/me", undefined, riya.token);
    assert.equal(me.body.data.wallet.lifetimePaise, 0);
  });

  await step("the same transaction reference can't be recorded twice", async () => {
    expectStatus(await call("POST", "/admin/client-payments", { enquiryId: leadId, amount: 10000.5, externalRef: "UTR-AAA-111" }, ownerToken), 409);
  });

  await step("maker-checker: an admin can't verify a payment they recorded", async () => {
    expectStatus(await call("POST", "/admin/users", { email: "ops@test.local", fullName: "Ops Admin", role: "admin", password: "OpsAdmin12345" }, ownerToken), 201);
    const login = await call("POST", "/admin/login", { email: "ops@test.local", password: "OpsAdmin12345" });
    editorAdminToken = login.body.data.token;
    const rec = await call("POST", "/admin/client-payments", { enquiryId: leadId, amount: 5000, installmentLabel: "Milestone 2 (30%)", method: "Bank transfer", externalRef: "UTR-BBB-222" }, editorAdminToken);
    expectStatus(rec, 201);
    paymentB = rec.body.data.id;
    expectStatus(await call("POST", `/admin/client-payments/${paymentB}/verify`, {}, editorAdminToken), 403);
  });

  await step("verification credits exactly 20% on the server (per installment, paise-exact)", async () => {
    const a = await call("POST", `/admin/client-payments/${paymentA}/verify`, {}, ownerToken);
    expectStatus(a, 200);
    assert.equal(a.body.data.commissionPaise, 200010); // 20% of ₹10,000.50 = ₹2,000.10
    const b = await call("POST", `/admin/client-payments/${paymentB}/verify`, {}, ownerToken);
    expectStatus(b, 200);
    assert.equal(b.body.data.commissionPaise, 100000);
    expectStatus(await call("POST", `/admin/client-payments/${paymentA}/verify`, {}, ownerToken), 409);
    const earn = await call("GET", "/partner/earnings", undefined, riya.token);
    assert.equal(earn.body.data.wallet.lifetimePaise, 300010);
    assert.equal(earn.body.data.wallet.availablePaise, 300010);
    assert.equal(earn.body.data.commissions.length, 2);
    assert.equal(earn.body.data.commissions[0].rateBps, 2000);
    const leads = await call("GET", "/partner/leads", undefined, riya.token);
    const lead = leads.body.data.find((l: { id: number }) => l.id === leadId);
    assert.equal(lead.paidPaise, 1500050);
    assert.equal(lead.installments, 2);
    assert.equal(lead.commissionPaise, 300010);
  });

  await step("wallet can't be set through any API", async () => {
    const adminTry = await call("PATCH", `/admin/partners/${riya.partner.id}`, { wallet: { availablePaise: 99999999 }, availablePaise: 99999999, lifetimePaise: 99999999 }, ownerToken);
    expectStatus(adminTry, 400);
    const selfTry = await call("PATCH", "/partner/me", { availablePaise: 99999999, tier: "ambassador", status: "active" }, riya.token);
    expectStatus(selfTry, 400);
    const me = await call("GET", "/partner/me", undefined, riya.token);
    assert.equal(me.body.data.wallet.availablePaise, 300010);
    assert.equal(me.body.data.partner.tier, "partner");
  });

  await step("database triggers block direct edits/deletes of commissions and payouts", async () => {
    const { run } = await import("./db.js");
    await assert.rejects(run("UPDATE partner_commissions SET amount_paise = 99999999"), /immutable/);
    await assert.rejects(run("DELETE FROM partner_commissions"), /cannot be deleted/);
    await assert.rejects(run("UPDATE client_payments SET amount_paise = 1 WHERE status = 'verified'"), /pending/);
    await assert.rejects(run("DELETE FROM client_payments WHERE status = 'verified'"), /refund/);
  });

  await step("payouts: minimum, balance and one-open-request rules", async () => {
    expectStatus(await call("POST", "/partner/payouts", { amount: 100, method: "upi" }, riya.token), 422);
    expectStatus(await call("POST", "/partner/payouts", { amount: 5000, method: "upi" }, riya.token), 422);
    expectStatus(await call("POST", "/partner/payouts", { amount: 1000, method: "bank" }, riya.token), 422); // no bank on file
    const r = await call("POST", "/partner/payouts", { amount: 1000, method: "upi" }, riya.token);
    expectStatus(r, 201);
    assert.equal(r.body.data.wallet.availablePaise, 200010);
    expectStatus(await call("POST", "/partner/payouts", { amount: 600, method: "upi" }, riya.token), 409);
  });

  await step("admin settles a payout with a UTR (UTR required, single use)", async () => {
    const list = await call("GET", "/admin/partner-payouts", undefined, ownerToken);
    const payout = list.body.data.find((p: { partnerId: number; status: string }) => p.partnerId === riya.partner.id && p.status === "requested");
    expectStatus(await call("POST", `/admin/partner-payouts/${payout.id}/pay`, { utr: "123" }, ownerToken), 422);
    expectStatus(await call("POST", `/admin/partner-payouts/${payout.id}/pay`, { utr: "UPI-998877" }, ownerToken), 200);
    expectStatus(await call("POST", `/admin/partner-payouts/${payout.id}/reject`, { note: "too late" }, ownerToken), 409);
    const me = await call("GET", "/partner/me", undefined, riya.token);
    assert.equal(me.body.data.wallet.paidOutPaise, 100000);
    assert.equal(me.body.data.wallet.availablePaise, 200010);
  });

  await step("simultaneous withdrawal requests can't double-spend", async () => {
    const results = await Promise.all([
      call("POST", "/partner/payouts", { amount: 2000, method: "upi" }, riya.token),
      call("POST", "/partner/payouts", { amount: 2000, method: "upi" }, riya.token),
      call("POST", "/partner/payouts", { amount: 2000, method: "upi" }, riya.token),
    ]);
    assert.equal(results.filter((r) => r.status === 201).length, 1, results.map((r) => r.status).join(","));
    const list = await call("GET", "/admin/partner-payouts", undefined, ownerToken);
    const open = list.body.data.find((p: { partnerId: number; status: string }) => p.partnerId === riya.partner.id && p.status === "requested");
    expectStatus(await call("POST", `/admin/partner-payouts/${open.id}/reject`, { note: "Testing rejection" }, ownerToken), 200);
    const me = await call("GET", "/partner/me", undefined, riya.token);
    assert.equal(me.body.data.wallet.availablePaise, 200010);
  });

  await step("refund reverses the installment's commission", async () => {
    expectStatus(await call("POST", `/admin/client-payments/${paymentB}/refund`, { reason: "Client cancelled milestone" }, ownerToken), 200);
    const earn = await call("GET", "/partner/earnings", undefined, riya.token);
    assert.equal(earn.body.data.wallet.lifetimePaise, 200010);
    assert.equal(earn.body.data.wallet.reversedPaise, 100000);
    assert.equal(earn.body.data.commissions.find((c: { state: string }) => c.state === "reversed").reversedReason, "Client refunded: Client cancelled milestone");
    expectStatus(await call("DELETE", `/admin/client-payments/${paymentB}`, undefined, ownerToken), 409);
  });

  await step("pending payments can be edited, rejected and deleted", async () => {
    const r = await call("POST", "/admin/client-payments", { enquiryId: leadId, amount: 999 }, ownerToken);
    const id = r.body.data.id;
    const edited = await call("PATCH", `/admin/client-payments/${id}`, { amount: 1999, installmentLabel: "Final" }, ownerToken);
    assert.equal(edited.body.data.amountPaise, 199900);
    expectStatus(await call("POST", `/admin/client-payments/${id}/reject`, { reason: "Not received" }, ownerToken), 200);
    expectStatus(await call("PATCH", `/admin/client-payments/${id}`, { amount: 5 }, ownerToken), 409);
    expectStatus(await call("DELETE", `/admin/client-payments/${id}`, undefined, ownerToken), 200);
  });

  await step("verified Razorpay payments from a referred client credit commission automatically", async () => {
    const { run, get } = await import("./db.js");
    const { recordRazorpayCommission } = await import("./partners.js");
    const info = await run(
      `INSERT INTO payments (reference, razorpay_order_id, razorpay_payment_id, name, email, purpose, amount, currency, status, method, paid_at)
       VALUES ('NFP-T1', 'order_T1', 'pay_T1', 'Startup Founder', ?, 'Website advance', 2500, 'INR', 'paid', 'UPI', datetime('now'))`,
      [linkLeadEmail],
    );
    const row = { id: Number(info.lastInsertRowid), enquiry_id: null, email: linkLeadEmail, name: "Startup Founder", amount: 2500, currency: "INR", purpose: "Website advance", razorpay_payment_id: "pay_T1", method: "UPI" };
    await recordRazorpayCommission(row);
    await recordRazorpayCommission(row); // idempotent
    const c = await get<{ n: number; total: number }>(
      "SELECT count(*) AS n, sum(c.amount_paise) AS total FROM partner_commissions c JOIN client_payments cp ON cp.id = c.client_payment_id WHERE cp.payment_id = ?",
      [row.id],
    );
    assert.equal(c?.n, 1);
    assert.equal(c?.total, 50000);
  });

  await step("leaderboard ranks by verified earnings and shows short names", async () => {
    const r = await call("GET", "/partners/leaderboard?period=all");
    expectStatus(r, 200);
    assert.equal(r.body.data.entries[0].name, "Riya S.");
    assert.equal(r.body.data.entries[0].earnedPaise, 250010);
    assert.equal(JSON.stringify(r.body).includes("riya@student.test"), false);
  });

  await step("ambassador: duplicate application blocked, admin approval upgrades the tier", async () => {
    expectStatus(await call("POST", "/partner/ambassador", { yearOfStudy: "3rd year", motivation: "x".repeat(40), reach: "Coding club" }, aman.token), 409);
    expectStatus(await call("POST", "/partner/ambassador", { yearOfStudy: "Year 9", motivation: "short", reach: "" }, riya.token), 422);
    expectStatus(await call("POST", "/partner/ambassador", { yearOfStudy: "2nd year", motivation: "I lead the entrepreneurship cell and host weekly events.", reach: "E-Cell, 250 members" }, riya.token), 201);
    const apps = await call("GET", "/admin/ambassadors", undefined, ownerToken);
    const amanApp = apps.body.data.find((a: { partnerId: number }) => a.partnerId === aman.partner.id);
    const riyaApp = apps.body.data.find((a: { partnerId: number }) => a.partnerId === riya.partner.id);
    expectStatus(await call("POST", `/admin/ambassadors/${amanApp.id}/approve`, { note: "Welcome!" }, ownerToken), 200);
    expectStatus(await call("POST", `/admin/ambassadors/${riyaApp.id}/reject`, {}, ownerToken), 422);
    expectStatus(await call("POST", `/admin/ambassadors/${riyaApp.id}/reject`, { note: "Apply again next semester" }, ownerToken), 200);
    const me = await call("GET", "/partner/me", undefined, aman.token);
    assert.equal(me.body.data.partner.tier, "ambassador");
  });

  await step("payout details change needs the current password", async () => {
    expectStatus(await call("PUT", "/partner/payout-details", { currentPassword: "wrong", upiId: "evil@ybl" }, riya.token), 400);
    const r = await call("PUT", "/partner/payout-details", { currentPassword: "riyaPass123", upiId: "riya.new@ybl" }, riya.token);
    expectStatus(r, 200);
    assert.equal(r.body.data.payout.upiId, "riya.new@ybl");
  });

  await step("suspension blocks the partner, rejects open payouts and blocks verification", async () => {
    const req = await call("POST", "/partner/payouts", { amount: 600, method: "upi" }, riya.token);
    expectStatus(req, 201);
    const pending = await call("POST", "/admin/client-payments", { enquiryId: leadId, amount: 3000 }, ownerToken);
    const s = await call("POST", `/admin/partners/${riya.partner.id}/suspend`, { reason: "Fake leads reported", reverseHeld: true }, ownerToken);
    expectStatus(s, 200);
    expectStatus(await call("GET", "/partner/me", undefined, riya.token), 401); // sessions revoked
    expectStatus(await call("POST", "/partners/login", { email: "riya@student.test", password: "riyaPass123" }), 403);
    expectStatus(await call("POST", `/admin/client-payments/${pending.body.data.id}/verify`, {}, ownerToken), 409);
    assert.equal(s.body.data.wallet.requestedPaise, 0);
    const board = await call("GET", "/partners/leaderboard?period=all");
    assert.equal(board.body.data.entries.some((e: { name: string }) => e.name === "Riya S."), false);
    const next = await call("POST", "/enquiries", { name: "New Client", email: "new@client.test", details: "Came via suspended link.", referralCode: riya.partner.referralCode });
    expectStatus(next, 201);
    const leads = await call("GET", `/admin/partner-leads?partnerId=${riya.partner.id}`, undefined, ownerToken);
    assert.equal(leads.body.data.some((l: { email: string }) => l.email === "new@client.test"), false);
  });

  await step("reactivation restores access", async () => {
    expectStatus(await call("POST", `/admin/partners/${riya.partner.id}/reactivate`, {}, ownerToken), 200);
    const login = await call("POST", "/partners/login", { email: "riya@student.test", password: "riyaPass123" });
    expectStatus(login, 200);
    riya.token = login.body.data.token;
  });

  await step("admin CRUD: create partner, edit, reassign a lead, create a lead, delete", async () => {
    const created = await call(
      "POST",
      "/admin/partners",
      { fullName: "Neha Gupta", email: "neha@student.test", phone: "9876500000", college: "Christ University", region: "Karnataka", upiId: "neha@okicici", password: "nehaTemp123" },
      ownerToken,
    );
    expectStatus(created, 201);
    const neha = created.body.data;
    const edited = await call("PATCH", `/admin/partners/${neha.id}`, { city: "Bengaluru", adminNotes: "Met at campus fest" }, ownerToken);
    assert.equal(edited.body.data.city, "Bengaluru");
    const lead = await call("POST", "/admin/partner-leads", { partnerId: neha.id, name: "Cafe Bloom", email: "hello@cafebloom.test", details: "Menu website with QR ordering." }, ownerToken);
    expectStatus(lead, 201);
    expectStatus(await call("PATCH", `/admin/partner-leads/${lead.body.data.id}`, { partnerId: aman.partner.id, status: "qualified" }, ownerToken), 200);
    const amanLeads = await call("GET", "/partner/leads", undefined, aman.token);
    assert.equal(amanLeads.body.data[0].stage, "in_discussion");
    expectStatus(await call("PATCH", `/admin/partner-leads/${lead.body.data.id}`, { partnerId: null }, ownerToken), 200);
    expectStatus(await call("DELETE", `/admin/partners/${neha.id}`, undefined, ownerToken), 200);
    expectStatus(await call("DELETE", `/admin/partners/${riya.partner.id}`, undefined, ownerToken), 409); // has money history
    expectStatus(await call("DELETE", `/admin/partner-leads/${leadId}`, undefined, ownerToken), 409); // has verified payments
  });

  await step("admin overview and commission ledger reflect the books", async () => {
    const o = await call("GET", "/admin/partners/overview", undefined, ownerToken);
    expectStatus(o, 200);
    assert.equal(o.body.data.kpis.ambassadors, 1);
    assert.equal(o.body.data.kpis.commissionEarnedPaise, 250010);
    assert.equal(o.body.data.kpis.payoutsPaidPaise, 100000);
    const ledger = await call("GET", "/admin/partner-commissions", undefined, ownerToken);
    assert.equal(ledger.body.data.length, 3);
    expectStatus(await call("GET", "/admin/partners/overview"), 401);
  });

  await step("registration is rate limited per network", async () => {
    let limited = false;
    for (let i = 0; i < 8 && !limited; i += 1) {
      const r = await call("POST", "/partners/register", partnerBody({ email: `rl${i}@student.test`, phone: `90000000${10 + i}` }));
      limited = r.status === 429;
    }
    assert.ok(limited, "expected a 429 after repeated sign-ups");
  });
}

main()
  .catch((err) => {
    failures.push(`fatal: ${(err as Error).message}`);
    console.error(err);
  })
  .finally(async () => {
    server?.kill();
    try {
      const { db } = await import("./db.js");
      db.close();
    } catch {
      /* not opened */
    }
    await new Promise((r) => setTimeout(r, 300));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
    process.exit(failures.length ? 1 : 0);
  });
