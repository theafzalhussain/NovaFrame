/**
 * Email check — verifies the active backend (Resend or SMTP) and sends one
 * sample of every template (enquiry, call booking, payment × studio + client)
 * to NOTIFY_EMAIL.
 *
 *   npm run mail:test
 */
import "./env.js";
import { defaultContent } from "../src/data/defaults.js";
import { bookingEmails, leadEmails, mailBackend, mailEnabled, paymentEmails, send, verifyMail, type MailContext, type Message } from "./mailer.js";

const settings = defaultContent.settings;
const to = process.env.NOTIFY_EMAIL || settings.email;

if (!mailEnabled()) {
  console.error("Email is off — set RESEND_API_KEY (recommended on Railway/PaaS) or SMTP_HOST/SMTP_USER/SMTP_PASS in .env first.");
  process.exit(1);
}

const login = await verifyMail();
if (!login.ok) {
  console.error(`Email backend check failed (${mailBackend()}): ${login.error}`);
  if (/525|unauthori[sz]ed ip/i.test(login.error ?? "")) {
    console.error("→ Brevo is blocking this IP. Brevo → Settings → Security → Authorized IPs: add this machine's/server's IP (or deactivate IP blocking).");
  } else if (/535|auth/i.test(login.error ?? "")) {
    console.error("→ Check SMTP_USER (your Brevo SMTP login) and SMTP_PASS (an active Brevo SMTP key, not the xkeysib API key).");
  }
  process.exit(1);
}
if (login.error) console.warn(`Note: ${login.error}`);
console.log(`Email backend OK (${mailBackend()}). Sending samples to ${to} from ${process.env.MAIL_FROM || process.env.SMTP_USER || "onboarding@resend.dev"}…`);

const founder = defaultContent.collections.team[0];
const ctx: MailContext = { settings, founder: founder ? { name: founder.name, role: founder.role } : undefined, siteUrl: process.env.SITE_URL?.replace(/\/+$/, "") };
const client = { name: "Sample Client", email: to, phone: "+91 90000 00000", company: "Sample Co" };
const inTwoDays = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);

const lead = leadEmails(
  { reference: "NF-SAMPLE", ...client, service: "Web Development", budget: "₹50,000 – ₹1,00,000", timeline: "In 1 month", details: "This is a sample enquiry sent by `npm run mail:test`.", source: "contact" },
  ctx,
);
const booking = bookingEmails({ reference: "NFC-SAMPLE", ...client, topic: "New website", date: inTwoDays, time: settings.booking.slots[0] ?? "11:00 AM", notes: "Sample booking." }, ctx);
const payment = paymentEmails(
  { reference: "NFP-SAMPLE", ...client, purpose: "Project advance", amount: 25000, currency: "INR", paymentId: "pay_SAMPLE", orderId: "order_SAMPLE", method: "UPI", testMode: true },
  ctx,
);

const samples: [string, Message][] = [
  ["Enquiry → studio", lead.studio],
  ["Enquiry → client", lead.client],
  ["Booking → studio", booking.studio],
  ["Booking → client", booking.client],
  ["Payment → studio", payment.studio],
  ["Payment → client", payment.client],
];

let failed = 0;
for (const [label, message] of samples) {
  try {
    await send({ ...message, to, subject: `[Sample] ${message.subject}` }, settings);
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${label}: ${(err as Error).message}`);
  }
}
console.log(failed ? `${failed} sample(s) failed.` : "All samples sent — check the inbox (and the spam folder the first time).");
process.exit(failed ? 1 : 0);
