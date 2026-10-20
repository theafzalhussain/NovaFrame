/**
 * Transactional email over SMTP (Nodemailer) — works with Brevo, Gmail or any provider.
 * Enabled only when SMTP_HOST is set. Every enquiry, booked call and payment:
 *   • alerts the studio (NOTIFY_EMAIL, falling back to the site email), Reply-To = the client
 *   • sends the client a branded confirmation / official receipt (disable with SEND_CONFIRMATIONS=false)
 * Sending runs in the background and never blocks or fails an API response.
 *
 * Templates are table-based with inline styles (Gmail, Outlook, Apple Mail safe) and follow the
 * site's "Noir & Champagne" palette. Every HTML email ships with a plain-text alternative.
 */
import nodemailer, { type IcalAttachment, type Transporter } from "nodemailer";
import type { SiteSettings } from "../src/data/types.js";
import { buildIcs, googleCalendarUrl, zonedToUtc } from "../src/lib/calendar.js";

export type MailContext = {
  settings: SiteSettings;
  /** Signs client emails, e.g. { name: "Afzal Hussain", role: "Founder" } */
  founder?: { name: string; role?: string };
  /** Public site URL (SITE_URL) — enables "book a call" and admin console links. */
  siteUrl?: string;
};

export type Message = {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  icalEvent?: IcalAttachment;
};

/* ------------------------------------------------------------------ */
/* Transport                                                          */
/* ------------------------------------------------------------------ */
let transport: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) {
    transport = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  return transport;
}

export const mailEnabled = () => Boolean(process.env.SMTP_HOST);
const confirmationsOn = () => process.env.SEND_CONFIRMATIONS !== "false";
const studioInbox = (settings: SiteSettings) => process.env.NOTIFY_EMAIL || settings.email;

/** Logs in to the SMTP server once, so a bad key or blocked IP shows up at start-up. */
export async function verifyMail(): Promise<{ ok: boolean; error?: string }> {
  const t = getTransport();
  if (!t) return { ok: false, error: "SMTP_HOST is not set" };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function send(message: Message, settings: SiteSettings) {
  const t = getTransport();
  if (!t) return;
  const from = process.env.MAIL_FROM || `"${settings.name}" <${process.env.SMTP_USER || settings.email}>`;
  await t.sendMail({ from, ...message });
}

export type DeliveryReport = { studio: "sent" | "failed" | "skipped"; client: "sent" | "failed" | "skipped"; errors: string[] };

/** Sends the studio alert and client email independently — one failure never stops the other. */
async function deliver(label: string, studio: Message, client: Message | null, settings: SiteSettings): Promise<DeliveryReport> {
  const report: DeliveryReport = { studio: "skipped", client: "skipped", errors: [] };
  if (!mailEnabled()) return report;
  const jobs: [keyof Omit<DeliveryReport, "errors">, Message][] = [["studio", studio]];
  if (client && confirmationsOn()) jobs.push(["client", client]);
  const results = await Promise.allSettled(jobs.map(([, m]) => send(m, settings)));
  results.forEach((r, i) => {
    const who = jobs[i][0];
    if (r.status === "fulfilled") {
      report[who] = "sent";
    } else {
      report[who] = "failed";
      const msg = (r.reason as Error)?.message ?? String(r.reason);
      report.errors.push(`${who}: ${msg}`);
      console.error(`[mail] ${label} → ${who} email failed:`, msg);
    }
  });
  return report;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                 */
/* ------------------------------------------------------------------ */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
const nl2br = (s: string) => esc(s).replace(/\r?\n/g, "<br>");
/** Escaped text with **bold** spans. */
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f3eee5;font-weight:600;">$1</strong>');
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function money(amount: number, currency: string, decimals = 2) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(decimals)}`;
  }
}

function dateTime(d: Date, settings: SiteSettings) {
  try {
    const f = new Intl.DateTimeFormat("en-IN", { timeZone: settings.timezone, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
    return `${f.format(d)} ${settings.timezoneLabel}`;
  } catch {
    return d.toISOString();
  }
}

/** "2026-10-21" → "Wednesday, 21 October 2026" (or a short "Wed, 21 Oct") */
function calendarDate(ymd: string, style: "long" | "short" = "long") {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  const opts: Intl.DateTimeFormatOptions =
    style === "long" ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" };
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(d);
}

const telHref = (phone: string) => `tel:+${phone.replace(/\D/g, "")}`;
const mailtoHref = (to: string, subject: string) => `mailto:${to}?subject=${encodeURIComponent(subject)}`;
const studioWhatsapp = (settings: SiteSettings, text?: string) =>
  `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** wa.me link for a client's number (10-digit numbers are treated as Indian). */
function clientWhatsapp(phone?: string, text?: string) {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 10) return "";
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const SOURCE_LABELS: Record<string, string> = {
  contact: "Contact form",
  estimator: "Price estimator",
  service_page: "Service page",
  booking: "Call booking",
  payment: "Online payment",
  founding: "Founding programme",
};
const sourceLabel = (s: string) => SOURCE_LABELS[s] ?? s.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/* ------------------------------------------------------------------ */
/* Template                                                           */
/* ------------------------------------------------------------------ */
type Row = { label: string; value?: string | null; mono?: boolean };

type EmailSpec = {
  subject: string;
  preheader: string;
  /** Small label above the card, e.g. "Payment receipt" */
  docLabel: string;
  badge: { text: string; tone: "gold" | "sage" };
  greeting?: string;
  heading: string;
  accent?: string;
  paragraphs: string[];
  highlight?: { label: string; value: string; sub?: string; size?: "lg" | "md" };
  rowsTitle?: string;
  rows: Row[];
  quote?: { label: string; text: string };
  steps?: { title: string; body: string }[];
  ctas?: { label: string; href: string; primary?: boolean }[];
  signature?: boolean;
  note?: string;
  footerNote: string;
};

const SERIF = "Georgia,'Times New Roman',Times,serif";
const SANS = "'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

function signer(ctx: MailContext) {
  const { settings, founder } = ctx;
  if (founder?.name) return { name: founder.name, title: `${founder.role || "Founder"}, ${settings.name}` };
  return { name: `Team ${settings.short}`, title: settings.name };
}

function renderHtml(spec: EmailSpec, ctx: MailContext) {
  const { settings } = ctx;
  const tone =
    spec.badge.tone === "sage" ? { fg: "#8fc4a2", bg: "#112019", line: "#28493a" } : { fg: "#e3c88c", bg: "#1b160e", line: "#4a3b20" };
  const block = (inner: string, pad = "28px 40px 0") => `<tr><td class="px" style="padding:${pad};">${inner}</td></tr>`;
  const kicker = (text: string, color = "#d4ad66") =>
    `<div style="margin:0 0 12px;font-family:${MONO};font-size:10.5px;letter-spacing:2.2px;text-transform:uppercase;color:${color};">${esc(text)}</div>`;

  const parts: string[] = [];

  // Badge, greeting, heading, intro
  parts.push(
    block(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid ${tone.line};background:${tone.bg};border-radius:999px;padding:6px 14px;font-family:${MONO};font-size:10.5px;letter-spacing:1.8px;text-transform:uppercase;color:${tone.fg};white-space:nowrap;">&#10003;&nbsp;&nbsp;${esc(spec.badge.text)}</td></tr></table>` +
        (spec.greeting ? `<p style="margin:26px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:#ddd5c6;">${esc(spec.greeting)}</p>` : "") +
        `<h1 class="h1" style="margin:${spec.greeting ? "10px" : "24px"} 0 0;font-family:${SERIF};font-weight:normal;font-size:31px;line-height:1.24;letter-spacing:-0.3px;color:#f3eee5;">${esc(spec.heading)}${
          spec.accent ? `<br><em style="font-style:italic;color:#e3c88c;">${esc(spec.accent)}</em>` : ""
        }</h1>` +
        spec.paragraphs.map((p) => `<p style="margin:16px 0 0;font-family:${SANS};font-size:15px;line-height:1.75;color:#c2baab;">${rich(p)}</p>`).join(""),
      "36px 40px 0",
    ),
  );

  // Highlight (amount / date)
  if (spec.highlight) {
    const big = spec.highlight.size !== "md";
    parts.push(
      block(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#15120e;border:1px solid #2c2519;border-radius:16px;"><tr><td style="padding:22px 26px;">` +
          kicker(spec.highlight.label, "#9b9385") +
          `<div class="${big ? "amt" : ""}" style="font-family:${SERIF};font-size:${big ? "38px" : "25px"};line-height:1.15;letter-spacing:-0.4px;color:#eedcb3;">${esc(spec.highlight.value)}</div>` +
          (spec.highlight.sub ? `<div style="margin-top:8px;font-family:${SANS};font-size:13.5px;line-height:1.6;color:#9b9385;">${esc(spec.highlight.sub)}</div>` : "") +
          `</td></tr></table>`,
      ),
    );
  }

  // Details table
  const rows = spec.rows.filter((r): r is Row & { value: string } => Boolean(r.value && r.value.trim()));
  if (rows.length) {
    parts.push(
      block(
        kicker(spec.rowsTitle ?? "Details") +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #2a241c;">` +
          rows
            .map(
              (r) =>
                `<tr><td class="lbl" valign="top" style="width:150px;padding:12px 14px 12px 0;border-bottom:1px solid #201c17;font-family:${SANS};font-size:12.5px;line-height:1.6;color:#9b9385;">${esc(r.label)}</td>` +
                `<td valign="top" style="padding:12px 0;border-bottom:1px solid #201c17;font-family:${r.mono ? MONO : SANS};font-size:${r.mono ? "13px" : "14px"};line-height:1.6;color:${r.mono ? "#eedcb3" : "#f3eee5"};word-break:break-word;">${nl2br(r.value)}</td></tr>`,
            )
            .join("") +
          `</table>`,
      ),
    );
  }

  // Quoted message (project brief / notes)
  if (spec.quote?.text.trim()) {
    parts.push(
      block(
        kicker(spec.quote.label) +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-left:2px solid #d4ad66;background:#15120e;border-radius:0 12px 12px 0;padding:16px 20px;font-family:${SANS};font-size:14px;line-height:1.75;color:#ddd5c6;">${nl2br(spec.quote.text)}</td></tr></table>`,
      ),
    );
  }

  // Next steps
  if (spec.steps?.length) {
    parts.push(
      block(
        kicker("What happens next") +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
          spec.steps
            .map(
              (s, i) =>
                `<tr><td valign="top" width="40" style="width:40px;padding:10px 0;">` +
                `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="28" height="28" style="width:28px;height:28px;border:1px solid #4a3b20;border-radius:50%;font-family:${MONO};font-size:11px;line-height:28px;color:#e3c88c;">${i + 1}</td></tr></table></td>` +
                `<td valign="top" style="padding:10px 0 10px 6px;"><div style="font-family:${SANS};font-size:14.5px;font-weight:600;line-height:1.5;color:#f3eee5;">${esc(s.title)}</div>` +
                `<div style="margin-top:3px;font-family:${SANS};font-size:13.5px;line-height:1.65;color:#9b9385;">${esc(s.body)}</div></td></tr>`,
            )
            .join("") +
          `</table>`,
      ),
    );
  }

  // Buttons
  const ctas = (spec.ctas ?? []).filter((c) => c.href);
  if (ctas.length) {
    parts.push(
      block(
        ctas
          .map((c) =>
            c.primary
              ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;margin:0 10px 10px 0;vertical-align:top;"><tr><td style="border-radius:999px;background:#d4ad66;background-image:linear-gradient(180deg,#f2dfb0 0%,#dcb874 45%,#c69a52 100%);"><a href="${esc(c.href)}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:14px;font-weight:700;letter-spacing:0.2px;color:#18120a;text-decoration:none;border-radius:999px;">${esc(c.label)}</a></td></tr></table>`
              : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;margin:0 10px 10px 0;vertical-align:top;"><tr><td style="border-radius:999px;border:1px solid #5a4828;"><a href="${esc(c.href)}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:14px;font-weight:600;color:#f3eee5;text-decoration:none;border-radius:999px;">${esc(c.label)}</a></td></tr></table>`,
          )
          .join(""),
        "30px 40px 0",
      ),
    );
  }

  // Signature
  if (spec.signature) {
    const s = signer(ctx);
    parts.push(
      block(
        `<p style="margin:0;font-family:${SANS};font-size:14.5px;color:#c2baab;">Warm regards,</p>` +
          `<p style="margin:8px 0 0;font-family:${SERIF};font-size:19px;color:#f3eee5;">${esc(s.name)}</p>` +
          `<p style="margin:3px 0 0;font-family:${SANS};font-size:12.5px;color:#9b9385;">${esc(s.title)}</p>`,
        "32px 40px 0",
      ),
    );
  }

  // Small print (always closes the card with bottom padding)
  parts.push(
    spec.note
      ? block(`<div style="border-top:1px solid #2a241c;padding-top:18px;font-family:${SANS};font-size:12.5px;line-height:1.7;color:#8d8577;">${rich(spec.note)}</div>`, "30px 40px 36px")
      : block("", "0 40px 36px"),
  );

  const site = ctx.siteUrl ? `&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${esc(ctx.siteUrl)}" style="color:#c2baab;text-decoration:none;white-space:nowrap;">${esc(hostOf(ctx.siteUrl))}</a>` : "";
  const monogram = esc((settings.short || settings.name).charAt(0).toUpperCase());

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(spec.subject)}</title>
<style>
  body{margin:0!important;padding:0!important;background:#080706;}
  a{color:#e3c88c;}
  @media only screen and (max-width:620px){
    .px{padding-left:22px!important;padding-right:22px!important;}
    .h1{font-size:26px!important;}
    .amt{font-size:32px!important;}
    .lbl{width:108px!important;}
    .hide-sm{display:none!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#080706;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(spec.preheader)}${"&#8199;&#65279;&#847; ".repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080706;">
<tr><td align="center" style="padding:34px 12px 40px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
  <tr><td style="padding:0 8px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" valign="middle" width="40" height="40" style="width:40px;height:40px;border:1px solid #c3954a;border-radius:11px;background:#15120e;font-family:${SERIF};font-size:21px;line-height:40px;color:#e3c88c;">${monogram}</td>
          <td valign="middle" style="padding-left:12px;">
            <div style="font-family:${SERIF};font-size:19px;line-height:1;color:#f3eee5;">${esc(settings.short || settings.name)}<span style="color:#d4ad66;">.</span></div>
            <div style="margin-top:6px;font-family:${MONO};font-size:8.5px;letter-spacing:3.6px;text-transform:uppercase;color:#9b9385;">Studio</div>
          </td>
        </tr></table>
      </td>
      <td align="right" valign="middle" class="hide-sm" style="font-family:${MONO};font-size:10px;letter-spacing:2.2px;text-transform:uppercase;color:#9b9385;">${esc(spec.docLabel)}</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#100e0c;border:1px solid #2a241c;border-radius:20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="height:3px;line-height:3px;font-size:0;background:#c3954a;background-image:linear-gradient(90deg,#7c5c2e 0%,#e3c88c 35%,#c3954a 65%,#7c5c2e 100%);border-radius:20px 20px 0 0;">&nbsp;</td></tr>
      ${parts.join("\n      ")}
    </table>
  </td></tr>
  <tr><td align="center" style="padding:28px 18px 0;font-family:${SANS};font-size:12px;line-height:1.9;color:#6d665c;">
    <a href="mailto:${esc(settings.email)}" style="color:#c2baab;text-decoration:none;white-space:nowrap;">${esc(settings.email)}</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${telHref(settings.phone)}" style="color:#c2baab;text-decoration:none;white-space:nowrap;">${esc(settings.phone)}</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${esc(studioWhatsapp(settings))}" style="color:#c2baab;text-decoration:none;white-space:nowrap;">WhatsApp</a>${site}<br>
    ${esc(settings.location)} · ${esc(settings.hours)}<br>
    <span style="color:#57514a;">${esc(spec.footerNote)}</span><br>
    <span style="color:#57514a;">© ${new Date().getFullYear()} ${esc(settings.legal)}. All rights reserved.</span>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function renderText(spec: EmailSpec, ctx: MailContext) {
  const { settings } = ctx;
  const out: string[] = [`${settings.name.toUpperCase()} — ${spec.docLabel.toUpperCase()}`, ""];
  if (spec.greeting) out.push(spec.greeting, "");
  out.push(spec.accent ? `${spec.heading} ${spec.accent}` : spec.heading, "");
  for (const p of spec.paragraphs) out.push(plain(p), "");
  if (spec.highlight) out.push(`${spec.highlight.label.toUpperCase()}: ${spec.highlight.value}${spec.highlight.sub ? ` (${spec.highlight.sub})` : ""}`, "");
  const rows = spec.rows.filter((r) => r.value && r.value.trim());
  if (rows.length) {
    out.push((spec.rowsTitle ?? "Details").toUpperCase());
    for (const r of rows) out.push(`${r.label}: ${r.value}`);
    out.push("");
  }
  if (spec.quote?.text.trim()) out.push(spec.quote.label.toUpperCase(), spec.quote.text, "");
  if (spec.steps?.length) {
    out.push("WHAT HAPPENS NEXT");
    spec.steps.forEach((s, i) => out.push(`${i + 1}. ${s.title} — ${s.body}`));
    out.push("");
  }
  const links = (spec.ctas ?? []).filter((c) => /^https?:/i.test(c.href));
  if (links.length) {
    for (const c of links) out.push(`${c.label}: ${c.href}`);
    out.push("");
  }
  if (spec.note) out.push(plain(spec.note), "");
  if (spec.signature) {
    const s = signer(ctx);
    out.push("Warm regards,", s.name, s.title, "");
  }
  out.push("—", `${settings.name} · ${settings.location}`, `${settings.email} · ${settings.phone} · WhatsApp ${studioWhatsapp(settings)}`, spec.footerNote);
  return out.join("\n");
}

function build(to: string, replyTo: string | undefined, spec: EmailSpec, ctx: MailContext, icalEvent?: IcalAttachment): Message {
  return { to, replyTo, subject: spec.subject, html: renderHtml(spec, ctx), text: renderText(spec, ctx), ...(icalEvent ? { icalEvent } : {}) };
}

/* ------------------------------------------------------------------ */
/* Enquiries                                                          */
/* ------------------------------------------------------------------ */
export type LeadMail = {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service: string;
  budget: string;
  timeline?: string;
  details: string;
  source: string;
};

export function leadEmails(lead: LeadMail, ctx: MailContext) {
  const { settings, siteUrl } = ctx;
  const first = firstName(lead.name);
  const received = dateTime(new Date(), settings);

  const studio = build(
    studioInbox(settings),
    lead.email,
    {
      subject: `New enquiry · ${lead.name} — ${lead.service} [${lead.reference}]`,
      preheader: `${lead.budget}${lead.timeline ? ` · ${lead.timeline}` : ""} — reply to this email to answer ${first} directly.`,
      docLabel: "New lead",
      badge: { text: "New enquiry", tone: "gold" },
      heading: "New project enquiry",
      accent: `from ${lead.name}${lead.company ? `, ${lead.company}` : ""}`,
      paragraphs: [
        `A new brief just arrived through the website (${sourceLabel(lead.source)}). Simply reply to this email — your answer goes straight to **${lead.email}**.`,
      ],
      rowsTitle: "Lead details",
      rows: [
        { label: "Reference", value: lead.reference, mono: true },
        { label: "Name", value: lead.name },
        { label: "Email", value: lead.email },
        { label: "Phone", value: lead.phone },
        { label: "Company", value: lead.company },
        { label: "Service", value: lead.service },
        { label: "Budget", value: lead.budget },
        { label: "Timeline", value: lead.timeline },
        { label: "Source", value: sourceLabel(lead.source) },
        { label: "Received", value: received },
      ],
      quote: { label: "Project brief", text: lead.details },
      ctas: [
        { label: `Reply to ${first}`, href: mailtoHref(lead.email, `Re: Your enquiry with ${settings.name} [${lead.reference}]`), primary: true },
        { label: `WhatsApp ${first}`, href: clientWhatsapp(lead.phone, `Hi ${first}, this is ${settings.short} — thank you for your enquiry (${lead.reference}).`) },
        { label: "Open admin console", href: siteUrl ? `${siteUrl}/#/admin` : "" },
      ],
      note: `Logged in Admin → Leads as **${lead.reference}**. Replying within the first few hours makes a strong first impression.`,
      footerNote: "Internal notification from your website.",
    },
    ctx,
  );

  const client = build(
    lead.email,
    settings.email,
    {
      subject: `We've received your enquiry — Ref ${lead.reference} | ${settings.name}`,
      preheader: `Thank you, ${first}. ${settings.responseTime}. Your reference is ${lead.reference}.`,
      docLabel: "Enquiry acknowledgement",
      badge: { text: "Enquiry received", tone: "sage" },
      greeting: `Dear ${first},`,
      heading: "Thank you for reaching out.",
      accent: "Your brief is with our team.",
      paragraphs: [
        `Thank you for considering ${settings.name} for your **${lead.service}** project. This email confirms that we have received your enquiry, and it has been logged under reference **${lead.reference}**.`,
        `${settings.responseTime}. Our reply will include initial thoughts, any clarifying questions and the recommended next steps.`,
      ],
      rowsTitle: "Summary of your enquiry",
      rows: [
        { label: "Reference", value: lead.reference, mono: true },
        { label: "Service", value: lead.service },
        { label: "Budget", value: lead.budget },
        { label: "Timeline", value: lead.timeline },
        { label: "Company", value: lead.company },
        { label: "Submitted", value: received },
      ],
      quote: { label: "Your brief", text: lead.details },
      steps: [
        { title: "Review", body: "We study your brief and any references you shared." },
        { title: "Response", body: "We get back to you by email or WhatsApp with questions and recommended next steps." },
        { title: "Proposal", body: "After a short discovery call, you receive a written scope, timeline and fixed quote." },
      ],
      ctas: [
        { label: "Book a free 30-min call", href: siteUrl ? `${siteUrl}/#/book` : "", primary: true },
        { label: "Chat on WhatsApp", href: studioWhatsapp(settings, `Hi ${settings.short}! Following up on my enquiry ${lead.reference}.`), primary: !siteUrl },
      ],
      signature: true,
      note: "Everything you share with us is kept strictly confidential — an NDA is available on request. Please quote your reference in any correspondence.",
      footerNote: `You're receiving this email because you submitted an enquiry on the ${settings.name} website.`,
    },
    ctx,
  );

  return { studio, client };
}

export async function notifyLead(lead: LeadMail, ctx: MailContext) {
  if (!mailEnabled()) return { studio: "skipped", client: "skipped", errors: [] } as DeliveryReport;
  const { studio, client } = leadEmails(lead, ctx);
  return deliver(`enquiry ${lead.reference}`, studio, client, ctx.settings);
}

/* ------------------------------------------------------------------ */
/* Call bookings                                                      */
/* ------------------------------------------------------------------ */
export type BookingMail = {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  topic: string;
  budget?: string;
  date: string;
  time: string;
  notes?: string;
};

export function bookingEmails(b: BookingMail, ctx: MailContext) {
  const { settings } = ctx;
  const first = firstName(b.name);
  const minutes = settings.booking.durationMinutes;
  const tool = settings.booking.meetingTool;
  const longDate = calendarDate(b.date, "long");
  const when = `${b.time} ${settings.timezoneLabel} · ${minutes} minutes`;
  const start = zonedToUtc(b.date, b.time, settings.timezone);

  const studioCalendar = googleCalendarUrl({
    title: `Discovery call — ${b.name}${b.company ? ` (${b.company})` : ""}`,
    start,
    minutes,
    details: [`Topic: ${b.topic}`, `Email: ${b.email}`, b.phone ? `Phone: ${b.phone}` : "", b.notes ? `Notes: ${b.notes}` : "", `Reference: ${b.reference}`]
      .filter(Boolean)
      .join("\n"),
  });

  const studio = build(
    studioInbox(settings),
    b.email,
    {
      subject: `New call booked · ${calendarDate(b.date, "short")}, ${b.time} ${settings.timezoneLabel} — ${b.name} [${b.reference}]`,
      preheader: `${b.topic} · ${longDate} at ${b.time} ${settings.timezoneLabel}. Add a meeting link and send it to ${first}.`,
      docLabel: "New booking",
      badge: { text: "Call booked", tone: "gold" },
      heading: "Strategy call booked",
      accent: `with ${b.name}${b.company ? `, ${b.company}` : ""}`,
      paragraphs: [
        `${first} has reserved a ${minutes}-minute ${tool} call. Add a meeting link from **Admin → Call bookings** and share it with the client before the call.`,
      ],
      highlight: { label: "Scheduled for", value: longDate, sub: when, size: "md" },
      rowsTitle: "Booking details",
      rows: [
        { label: "Reference", value: b.reference, mono: true },
        { label: "Name", value: b.name },
        { label: "Email", value: b.email },
        { label: "Phone", value: b.phone },
        { label: "Company", value: b.company },
        { label: "Topic", value: b.topic },
        { label: "Budget", value: b.budget },
      ],
      quote: b.notes ? { label: "Notes from the client", text: b.notes } : undefined,
      ctas: [
        { label: "Add to Google Calendar", href: studioCalendar, primary: true },
        { label: `Reply to ${first}`, href: mailtoHref(b.email, `Your call with ${settings.name} — ${longDate}, ${b.time} [${b.reference}]`) },
        { label: `WhatsApp ${first}`, href: clientWhatsapp(b.phone, `Hi ${first}, this is ${settings.short} — looking forward to our call on ${longDate} at ${b.time} ${settings.timezoneLabel}.`) },
      ],
      note: `Booking **${b.reference}** is listed in Admin → Call bookings, where you can confirm it and attach the meeting link.`,
      footerNote: "Internal notification from your website.",
    },
    ctx,
  );

  const clientTitle = `${settings.short} × ${first} — strategy call`;
  const clientDetails = `Topic: ${b.topic}\nReference: ${b.reference}\nA ${tool} link will be shared by email before the call.\nQuestions: ${settings.email} · ${settings.phone}`;
  const ics = buildIcs({ title: clientTitle, start, minutes, details: clientDetails, uid: b.reference || String(Date.now()), location: tool, method: "PUBLISH" });

  const client = build(
    b.email,
    settings.email,
    {
      subject: `Confirmed: your strategy call on ${calendarDate(b.date, "short")} at ${b.time} ${settings.timezoneLabel} | ${settings.name}`,
      preheader: `Your ${minutes}-minute call is reserved. We'll send the ${tool} link before the call. Ref ${b.reference}.`,
      docLabel: "Booking confirmation",
      badge: { text: "Call confirmed", tone: "sage" },
      greeting: `Dear ${first},`,
      heading: "Your call is confirmed.",
      accent: "We look forward to speaking with you.",
      paragraphs: [
        `Thank you for booking a strategy call with ${settings.name}. Your ${minutes}-minute session is reserved — the details are below, and a calendar invitation is attached to this email.`,
        `A **${tool}** link will be sent to this address before the call.`,
      ],
      highlight: { label: "Date & time", value: longDate, sub: `${when} · ${tool}`, size: "md" },
      rowsTitle: "Booking details",
      rows: [
        { label: "Reference", value: b.reference, mono: true },
        { label: "Topic", value: b.topic },
        { label: "Duration", value: `${minutes} minutes` },
        { label: "Meeting via", value: tool },
        { label: "Booked by", value: b.company ? `${b.name}, ${b.company}` : b.name },
      ],
      steps: [
        { title: "Save the date", body: "Add the call to your calendar with the button below or the attached invitation." },
        { title: "Meeting link", body: `We'll email your ${tool} link before the call.` },
        { title: "Share context (optional)", body: "Links, goals or deadlines you'd like us to read beforehand — simply reply to this email." },
      ],
      ctas: [
        { label: "Add to Google Calendar", href: googleCalendarUrl({ title: clientTitle, start, minutes, details: clientDetails }), primary: true },
        { label: "Chat on WhatsApp", href: studioWhatsapp(settings, `Hi ${settings.short}! About my call on ${longDate} at ${b.time} (ref ${b.reference}).`) },
      ],
      signature: true,
      note: "Need to reschedule or cancel? Reply to this email or message us on WhatsApp and we'll gladly find another time.",
      footerNote: `You're receiving this email because you booked a call on the ${settings.name} website.`,
    },
    ctx,
    { filename: "novaframe-strategy-call.ics", method: "PUBLISH", content: ics },
  );

  return { studio, client };
}

export async function notifyBooking(b: BookingMail, ctx: MailContext) {
  if (!mailEnabled()) return { studio: "skipped", client: "skipped", errors: [] } as DeliveryReport;
  const { studio, client } = bookingEmails(b, ctx);
  return deliver(`booking ${b.reference}`, studio, client, ctx.settings);
}

/* ------------------------------------------------------------------ */
/* Payments                                                           */
/* ------------------------------------------------------------------ */
export type PaymentMail = {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  purpose: string;
  amount: number; // major unit (rupees)
  currency: string;
  paymentId: string;
  orderId: string;
  method?: string | null;
  paidAt?: Date;
  testMode?: boolean;
};

export function paymentEmails(p: PaymentMail, ctx: MailContext) {
  const { settings } = ctx;
  const first = firstName(p.name);
  const amount = money(p.amount, p.currency);
  const amountShort = money(p.amount, p.currency, 0);
  const paidAt = dateTime(p.paidAt ?? new Date(), settings);
  const testNote = p.testMode ? " **Test mode:** this payment used Razorpay test keys, so no real money moved." : "";

  const studio = build(
    studioInbox(settings),
    p.email,
    {
      subject: `Payment received · ${amountShort} from ${p.name} [${p.reference}]${p.testMode ? " (TEST)" : ""}`,
      preheader: `${p.purpose} · ${p.method ?? "Razorpay"} · ${p.paymentId}`,
      docLabel: "Payment alert",
      badge: { text: p.testMode ? "Payment received · test" : "Payment received", tone: "sage" },
      heading: `${amount} received`,
      accent: `from ${p.name}${p.company ? `, ${p.company}` : ""}`,
      paragraphs: [
        `A payment was completed successfully on your website${p.method ? ` via **${p.method}**` : ""}. Razorpay settles the funds to your bank account as per your settlement schedule.${testNote}`,
      ],
      highlight: { label: "Amount", value: amount, sub: p.purpose },
      rowsTitle: "Payment details",
      rows: [
        { label: "Receipt no.", value: p.reference, mono: true },
        { label: "Purpose", value: p.purpose },
        { label: "Name", value: p.name },
        { label: "Email", value: p.email },
        { label: "Phone", value: p.phone },
        { label: "Company", value: p.company },
        { label: "Method", value: p.method },
        { label: "Payment ID", value: p.paymentId, mono: true },
        { label: "Order ID", value: p.orderId, mono: true },
        { label: "Paid at", value: paidAt },
      ],
      ctas: [
        { label: "View in Razorpay", href: `https://dashboard.razorpay.com/app/payments/${encodeURIComponent(p.paymentId)}`, primary: true },
        { label: `Reply to ${first}`, href: mailtoHref(p.email, `Your payment to ${settings.name} [${p.reference}]`) },
        { label: `WhatsApp ${first}`, href: clientWhatsapp(p.phone, `Hi ${first}, this is ${settings.short} — we've received your payment of ${amountShort}. Thank you!`) },
      ],
      note: `The client has been emailed an official receipt (**${p.reference}**). The payment is also logged against their lead in Admin → Leads.`,
      footerNote: "Internal notification from your website.",
    },
    ctx,
  );

  const client = build(
    p.email,
    settings.email,
    {
      subject: `Payment receipt — ${amountShort} | ${settings.name} (Ref ${p.reference})`,
      preheader: `Thank you, ${first}. We've received your payment of ${amount}. Please keep this email as your receipt.`,
      docLabel: "Payment receipt",
      badge: { text: "Payment successful", tone: "sage" },
      greeting: `Dear ${first},`,
      heading: "Thank you for your payment.",
      accent: "This is your official receipt.",
      paragraphs: [`We confirm receipt of your payment of **${amount}** towards **${p.purpose}**. The transaction was processed securely by Razorpay.`],
      highlight: { label: "Amount paid", value: amount, sub: `${paidAt}${p.method ? ` · ${p.method}` : ""}` },
      rowsTitle: "Receipt details",
      rows: [
        { label: "Receipt no.", value: p.reference, mono: true },
        { label: "Paid for", value: p.purpose },
        { label: "Billed to", value: p.company ? `${p.name}, ${p.company}` : p.name },
        { label: "Email", value: p.email },
        { label: "Payment method", value: p.method },
        { label: "Payment ID", value: p.paymentId, mono: true },
        { label: "Date & time", value: paidAt },
        { label: "Status", value: "Paid" },
      ],
      ctas: [
        { label: "Questions about this payment", href: mailtoHref(settings.email, `Payment ${p.reference} — ${amountShort}`), primary: true },
        { label: "Chat on WhatsApp", href: studioWhatsapp(settings, `Hi ${settings.short}! About my payment ${p.reference} (${amountShort}).`) },
      ],
      signature: true,
      note: `This is a computer-generated receipt and does not require a signature. For billing questions or refunds, reply to this email quoting receipt no. **${p.reference}**.${testNote}`,
      footerNote: `You're receiving this email because you made a payment to ${settings.legal}.`,
    },
    ctx,
  );

  return { studio, client };
}

export async function notifyPayment(p: PaymentMail, ctx: MailContext) {
  if (!mailEnabled()) return { studio: "skipped", client: "skipped", errors: [] } as DeliveryReport;
  const { studio, client } = paymentEmails(p, ctx);
  return deliver(`payment ${p.reference}`, studio, client, ctx.settings);
}
