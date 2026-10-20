/**
 * Optional email notifications (SMTP via Nodemailer).
 * Enabled only when SMTP_HOST is set. Every new enquiry / booked call:
 *   • alerts the studio (NOTIFY_EMAIL, falling back to the site email), Reply-To = the client
 *   • sends the client a branded confirmation (disable with SEND_CONFIRMATIONS=false)
 * Sending never blocks or fails the API response.
 */
import nodemailer, { type Transporter } from "nodemailer";
import type { SiteSettings } from "../src/data/types.js";

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

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

function layout(settings: SiteSettings, heading: string, intro: string, rows: [string, string][], note = "") {
  const tr = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;color:#9b9385;font-size:12px;letter-spacing:.12em;text-transform:uppercase;width:150px;vertical-align:top">${esc(k)}</td>` +
        `<td style="padding:10px 0;color:#f3eee5;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#080706;padding:32px 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#12100e;border:1px solid rgba(227,200,140,.2);border-radius:18px">
    <tr><td style="padding:32px 32px 8px">
      <div style="color:#d4ad66;font-size:11px;letter-spacing:.3em;text-transform:uppercase">${esc(settings.name)}</div>
      <h1 style="margin:14px 0 0;color:#f3eee5;font-family:Georgia,serif;font-weight:400;font-size:26px">${esc(heading)}</h1>
      <p style="margin:12px 0 0;color:#c2baab;font-size:14px;line-height:1.7">${esc(intro)}</p>
    </td></tr>
    <tr><td style="padding:16px 32px"><table role="presentation" width="100%" style="border-top:1px solid rgba(227,200,140,.15)">${tr}</table></td></tr>
    ${note ? `<tr><td style="padding:0 32px 8px;color:#9b9385;font-size:13px;line-height:1.7">${esc(note)}</td></tr>` : ""}
    <tr><td style="padding:16px 32px 32px;color:#6d665c;font-size:12px">${esc(settings.name)} · ${esc(settings.location)} · ${esc(settings.email)}</td></tr>
  </table></body></html>`;
}

function textVersion(heading: string, intro: string, rows: [string, string][]) {
  return [heading, "", intro, "", ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].join("\n");
}

async function send(message: { to: string; replyTo?: string; subject: string; html: string; text: string }, settings: SiteSettings) {
  const t = getTransport();
  if (!t) return;
  const from = process.env.MAIL_FROM || `"${settings.name}" <${process.env.SMTP_USER || settings.email}>`;
  await t.sendMail({ from, ...message });
}

type LeadMail = { reference: string; name: string; email: string; phone?: string; company?: string; service: string; budget: string; timeline?: string; details: string; source: string };

export async function notifyLead(lead: LeadMail, settings: SiteSettings) {
  if (!mailEnabled()) return;
  const rows: [string, string][] = [
    ["Reference", lead.reference],
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone ?? ""],
    ["Company", lead.company ?? ""],
    ["Service", lead.service],
    ["Budget", lead.budget],
    ["Timeline", lead.timeline ?? ""],
    ["Source", lead.source],
    ["Brief", lead.details],
  ];
  const heading = `New lead — ${lead.name}`;
  const intro = `A new enquiry just arrived from your website. Reply to this email to answer ${lead.name.split(" ")[0]} directly.`;
  await send({ to: process.env.NOTIFY_EMAIL || settings.email, replyTo: lead.email, subject: `New lead · ${lead.name} — ${lead.service}`, html: layout(settings, heading, intro, rows), text: textVersion(heading, intro, rows) }, settings);

  if (process.env.SEND_CONFIRMATIONS === "false") return;
  const first = lead.name.split(" ")[0];
  const cHeading = `Thank you, ${first} — brief received.`;
  const cIntro = `${settings.responseTime}. Here's a copy of what you sent us. If anything is urgent, just reply to this email or message us on WhatsApp.`;
  const cRows: [string, string][] = [
    ["Reference", lead.reference],
    ["Service", lead.service],
    ["Budget", lead.budget],
    ["Timeline", lead.timeline ?? ""],
    ["Your brief", lead.details],
  ];
  await send({ to: lead.email, replyTo: settings.email, subject: `We received your brief — ${settings.name}`, html: layout(settings, cHeading, cIntro, cRows, "You own 100% of the code and design we create for you, and every engagement is fixed-scope with milestone payments."), text: textVersion(cHeading, cIntro, cRows) }, settings);
}

type BookingMail = { reference: string; name: string; email: string; phone?: string; company?: string; topic: string; date: string; time: string; notes?: string };

export async function notifyBooking(b: BookingMail, settings: SiteSettings) {
  if (!mailEnabled()) return;
  const when = `${b.date} · ${b.time} ${settings.timezoneLabel} (${settings.booking.durationMinutes} min)`;
  const rows: [string, string][] = [
    ["Reference", b.reference],
    ["When", when],
    ["Name", b.name],
    ["Email", b.email],
    ["Phone", b.phone ?? ""],
    ["Company", b.company ?? ""],
    ["Topic", b.topic],
    ["Notes", b.notes ?? ""],
  ];
  const heading = `Call booked — ${b.name}`;
  const intro = "Add a meeting link from Admin → Call bookings, then send it to the client.";
  await send({ to: process.env.NOTIFY_EMAIL || settings.email, replyTo: b.email, subject: `New call · ${b.date} ${b.time} — ${b.name}`, html: layout(settings, heading, intro, rows), text: textVersion(heading, intro, rows) }, settings);

  if (process.env.SEND_CONFIRMATIONS === "false") return;
  const cHeading = `You're booked, ${b.name.split(" ")[0]}.`;
  const cIntro = `Your ${settings.booking.durationMinutes}-minute strategy call is reserved. We'll send a ${settings.booking.meetingTool} link before the call.`;
  const cRows: [string, string][] = [
    ["When", when],
    ["Topic", b.topic],
    ["Reference", b.reference],
  ];
  await send({ to: b.email, replyTo: settings.email, subject: `Your call with ${settings.name} — ${b.date} ${b.time}`, html: layout(settings, cHeading, cIntro, cRows, "Need to reschedule? Simply reply to this email."), text: textVersion(cHeading, cIntro, cRows) }, settings);
}
