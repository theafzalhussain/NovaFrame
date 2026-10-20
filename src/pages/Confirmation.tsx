import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BrandMark } from "../components/Brand";
import { Icon } from "../components/Icons";
import { Button, Eyebrow, Glow, IconTile } from "../components/ui";
import type { SiteSettings } from "../data/types";
import {
  isConfirmationKind,
  readConfirmation,
  type BookingConfirmation,
  type Confirmation,
  type EnquiryConfirmation,
  type PaymentConfirmation,
} from "../lib/confirmation";
import { useContent } from "../lib/content";
import { useRouter } from "../lib/router";
import { phoneHref, whatsappLink } from "../lib/site";
import { downloadIcs, googleCalendarUrl, zonedToUtc } from "../lib/time";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ */
/* Formatting                                                         */
/* ------------------------------------------------------------------ */
function money(amount: number, currency: string, decimals = 2) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(decimals)}`;
  }
}

function stamp(iso: string, settings: SiteSettings) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    const f = new Intl.DateTimeFormat("en-IN", { timeZone: settings.timezone, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
    return `${f.format(d)} ${settings.timezoneLabel}`;
  } catch {
    return d.toLocaleString();
  }
}

function longDate(ymd: string) {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/* ------------------------------------------------------------------ */
/* Copy for each confirmation type                                    */
/* ------------------------------------------------------------------ */
type Row = { label: string; value?: string | null; mono?: boolean; wide?: boolean };

type View = {
  eyebrow: string;
  title: string;
  highlight: string;
  lead: ReactNode;
  mailLine: string;
  docTitle: string;
  status: string;
  hero?: { label: string; value: string; sub?: string };
  rows: Row[];
  quote?: { label: string; text: string };
  docNote: string;
  steps: { icon: string; title: string; body: string }[];
};

const strong = (text: string) => <span className="font-semibold whitespace-nowrap text-gold-100">{text}</span>;

function enquiryView(c: EnquiryConfirmation, settings: SiteSettings): View {
  return {
    eyebrow: "Enquiry received",
    title: `Thank you, ${firstName(c.name)}.`,
    highlight: "Your brief is with our team.",
    lead: (
      <>
        We've received your enquiry for {strong(c.service)} and logged it under reference {strong(c.reference || "—")}. {settings.responseTime}. Our reply will
        include initial thoughts, any clarifying questions and the recommended next steps.
      </>
    ),
    mailLine: `A confirmation email is on its way to ${c.email}`,
    docTitle: "Enquiry acknowledgement",
    status: "Received",
    rows: [
      { label: "Reference", value: c.reference, mono: true },
      { label: "Submitted", value: stamp(c.createdAt, settings) },
      { label: "Name", value: c.name },
      { label: "Email", value: c.email },
      { label: "Company", value: c.companyName },
      { label: "Phone", value: c.phone },
      { label: "Service", value: c.service },
      { label: "Budget", value: c.budget },
      { label: "Ideal start", value: c.timeline },
    ],
    quote: { label: "Your brief", text: c.details },
    docNote: "Please quote your reference in all correspondence. Everything you share is kept strictly confidential — an NDA is available on request.",
    steps: [
      { icon: "eye", title: "Review", body: "We study your brief and any references you shared — the same business day." },
      { icon: "chat", title: "Response", body: "You'll hear from us by email or WhatsApp with questions and the recommended next steps." },
      { icon: "doc", title: "Proposal", body: "After a short discovery call, you receive a written scope, timeline and fixed quote." },
    ],
  };
}

function bookingView(c: BookingConfirmation, settings: SiteSettings, founder?: string): View {
  const minutes = settings.booking.durationMinutes;
  const tool = settings.booking.meetingTool;
  const day = longDate(c.date);
  return {
    eyebrow: "Call confirmed",
    title: `See you soon, ${firstName(c.name)}.`,
    highlight: "Your call is booked.",
    lead: (
      <>
        Your {minutes}-minute strategy call{founder ? ` with ${founder}` : ""} is confirmed for {strong(day)} at {strong(`${c.time} ${settings.timezoneLabel}`)}. We'll send
        a {tool} link to <span className="text-parchment">{c.email}</span> before the call.
      </>
    ),
    mailLine: `Your booking confirmation and calendar invite are on their way to ${c.email}`,
    docTitle: "Booking confirmation",
    status: "Confirmed",
    hero: { label: "Date & time", value: day, sub: `${c.time} ${settings.timezoneLabel} · ${minutes} minutes · ${tool}` },
    rows: [
      { label: "Reference", value: c.reference, mono: true },
      { label: "Booked on", value: stamp(c.createdAt, settings) },
      { label: "Name", value: c.name },
      { label: "Email", value: c.email },
      { label: "Company", value: c.companyName },
      { label: "Phone", value: c.phone },
      { label: "Topic", value: c.topic },
      { label: "Meeting via", value: `${tool} · ${minutes} minutes` },
    ],
    quote: c.notes ? { label: "Notes for the call", text: c.notes } : undefined,
    docNote: "Need to reschedule? Reply to the confirmation email or message us on WhatsApp — we'll gladly find another time.",
    steps: [
      { icon: "calendar", title: "Save the date", body: "Add the call to your calendar now — Google Calendar or a downloadable .ics file." },
      { icon: "mail", title: "Meeting link", body: `Your ${tool} link arrives by email before the call.` },
      { icon: "target", title: "The call", body: `${minutes} focused minutes on goals, scope, budget and timeline — no obligation.` },
    ],
  };
}

function paymentView(c: PaymentConfirmation, settings: SiteSettings): View {
  const amount = money(c.amount, c.currency);
  const paid = stamp(c.paidAt, settings);
  return {
    eyebrow: "Payment successful",
    title: `Thank you, ${firstName(c.name)}.`,
    highlight: "Your payment is confirmed.",
    lead: (
      <>
        We've received {strong(amount)} towards {strong(c.purpose)}. The transaction was processed securely by Razorpay
        {c.method ? ` via ${c.method}` : ""} — this page is your official receipt.
      </>
    ),
    mailLine: `Your official receipt is on its way to ${c.email}`,
    docTitle: "Payment receipt",
    status: "Paid",
    hero: { label: "Amount paid", value: amount, sub: [paid, c.method].filter(Boolean).join(" · ") },
    rows: [
      { label: "Receipt no.", value: c.reference, mono: true },
      { label: "Date & time", value: paid },
      { label: "Billed to", value: c.companyName ? `${c.name}, ${c.companyName}` : c.name },
      { label: "Email", value: c.email },
      { label: "Paid for", value: c.purpose },
      { label: "Payment method", value: c.method ?? "Razorpay" },
      { label: "Payment ID", value: c.paymentId, mono: true },
      { label: "Order ID", value: c.orderId, mono: true },
    ],
    docNote: "This is a computer-generated receipt and does not require a signature. For billing questions or refunds, contact us quoting your receipt number.",
    steps: [
      { icon: "mail", title: "Receipt delivered", body: c.mail ? `A copy of this receipt has been emailed to ${c.email}.` : "Print or save this page as a PDF for your records." },
      { icon: "check-circle", title: "Payment recorded", body: "Our team has been notified and the payment is logged against your project." },
      { icon: "rocket", title: "Next milestone", body: "We'll be in touch shortly about the next step of your project." },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */
function SuccessSeal() {
  return (
    <div className="seal-pop relative mx-auto grid h-[96px] w-[96px] place-items-center" aria-hidden>
      <span className="seal-ring absolute inset-0 rounded-full border border-gold-300/50" />
      <span className="seal-ring seal-ring-delay absolute inset-0 rounded-full border border-gold-300/30" />
      <span className="absolute inset-[10px] rounded-full bg-gradient-to-b from-gold-200 via-gold-400 to-gold-600 shadow-[0_18px_50px_-12px_rgba(212,173,102,0.95),inset_0_1px_0_rgba(255,250,235,0.85)]" />
      <svg viewBox="0 0 24 24" className="check-draw relative h-9 w-9 text-ink-950" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12.5 4.5 4.5L19 7" />
      </svg>
    </div>
  );
}

function CopyButton({ value, label = "Copy reference" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      className="btn btn-line btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        } catch {
          /* clipboard blocked — nothing to do */
        }
      }}
    >
      <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

function OfflineNotice({ c, settings }: { c: EnquiryConfirmation | BookingConfirmation; settings: SiteSettings }) {
  const text =
    c.kind === "enquiry"
      ? `Name: ${c.name}\nCompany: ${c.companyName ?? ""}\nEmail: ${c.email}\nPhone: ${c.phone ?? ""}\nService: ${c.service}\nBudget: ${c.budget}\nTimeline: ${c.timeline ?? ""}\n\n${c.details}`
      : `Name: ${c.name}\nEmail: ${c.email}\nPhone: ${c.phone ?? ""}\nTopic: ${c.topic}\nRequested slot: ${longDate(c.date)} at ${c.time} ${settings.timezoneLabel}\nReference: ${c.reference}`;
  const subject = c.kind === "enquiry" ? `Project enquiry — ${c.service}` : `Call request — ${longDate(c.date)} ${c.time}`;
  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-ember/40 bg-ember/10 p-5 text-left text-[13.5px] leading-relaxed text-parchment print:hidden" role="alert">
      <p className="font-semibold text-ivory">Our server didn't respond, so this is only saved in your browser.</p>
      <p className="mt-1.5 text-sand">Please send it with one tap so it definitely reaches our team:</p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <a href={`mailto:${settings.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`} className="btn btn-gold btn-sm">
          <Icon name="mail" className="h-4 w-4" /> Send by email
        </a>
        <a href={whatsappLink(settings, `Hi ${settings.short}!\n\n${text}`)} target="_blank" rel="noopener noreferrer" className="btn btn-line btn-sm">
          <Icon name="whatsapp" className="h-4 w-4" /> Send on WhatsApp
        </a>
      </div>
    </div>
  );
}

function MissingConfirmation({ reference }: { reference: string }) {
  return (
    <section className="relative overflow-hidden pt-40 pb-28 md:pt-48">
      <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
      <div className="shell relative max-w-2xl text-center">
        <IconTile name="inbox" size="lg" className="mx-auto" />
        <Eyebrow center className="mt-8">
          Confirmation
        </Eyebrow>
        <h1 className="display mt-6 text-[2.3rem] leading-tight sm:text-[2.8rem]">
          {reference ? (
            <>
              Reference <span className="serif-accent text-gold">{reference}</span> is safely recorded.
            </>
          ) : (
            "Nothing to confirm here yet."
          )}
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed text-sand">
          {reference
            ? "The full confirmation is only shown in the browser tab where it was submitted. A copy has been sent to your inbox — or contact us and we'll resend it."
            : "Confirmations appear here after you send a project brief, book a call or make a payment."}
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button to="/contact" arrow>
            Send a project brief
          </Button>
          <Button to="/book" variant="line" icon="calendar">
            Book a call
          </Button>
          <Button to="/" variant="ghost">
            Back to home
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
export default function ConfirmationPage() {
  const { settings, collections } = useContent();
  const { query } = useRouter();
  const type = query.get("type");
  const ref = query.get("ref") ?? "";
  const founder = collections.team[0]?.name;

  const data = useMemo<Confirmation | null>(() => {
    const stored = readConfirmation();
    if (!stored || !isConfirmationKind(type) || stored.kind !== type) return null;
    if (ref && stored.reference !== ref) return null;
    return stored;
  }, [type, ref]);

  useEffect(() => {
    document.documentElement.classList.add("has-receipt");
    return () => document.documentElement.classList.remove("has-receipt");
  }, []);

  if (!data) return <MissingConfirmation reference={ref} />;

  const view = data.kind === "enquiry" ? enquiryView(data, settings) : data.kind === "booking" ? bookingView(data, settings, founder) : paymentView(data, settings);
  const rows = view.rows.filter((r) => r.value && String(r.value).trim());

  // Booking calendar links (computed in the studio's timezone)
  const calendar =
    data.kind === "booking"
      ? (() => {
          const start = zonedToUtc(data.date, data.time, settings.timezone);
          const title = `${settings.short} × ${firstName(data.name)} — strategy call`;
          const details = `Topic: ${data.topic}\nReference: ${data.reference}\nA ${settings.booking.meetingTool} link will be shared by email before the call.\nQuestions: ${settings.email}`;
          const local = (() => {
            const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const fmt = (timeZone: string) => start.toLocaleString("en-US", { timeZone, hour12: false });
            try {
              return fmt(visitorTz) === fmt(settings.timezone) ? "" : start.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
            } catch {
              return "";
            }
          })();
          return { start, title, details, local, minutes: settings.booking.durationMinutes };
        })()
      : null;

  const whatsappText =
    data.kind === "payment"
      ? `Hi ${settings.short}! I just paid ${money(data.amount, data.currency, 0)} for "${data.purpose}" (receipt ${data.reference}).`
      : data.kind === "booking"
        ? `Hi ${settings.short}! I just booked a call for ${longDate(data.date)} at ${data.time} ${settings.timezoneLabel} (ref ${data.reference}).`
        : `Hi ${settings.short}! I just sent a project brief (ref ${data.reference}).`;

  return (
    <section className="relative overflow-hidden pt-36 pb-24 md:pt-44 print:pt-0 print:pb-0">
      <div className="grid-lines absolute inset-0 opacity-60 print:hidden" aria-hidden />
      <Glow className="-top-32 left-1/2 h-[380px] w-[680px] -translate-x-1/2 print:hidden" color="rgba(212,173,102,0.18)" />

      <div className="shell relative max-w-[920px]">
        {/* ---------------- Hero ---------------- */}
        <header className="text-center print:hidden" aria-live="polite">
          <SuccessSeal />
          <Eyebrow center className="mt-9">
            {view.eyebrow}
          </Eyebrow>
          <h1 className="display mt-6 text-[2.45rem] leading-[1.05] sm:text-[3.1rem] md:text-[3.6rem]">
            {view.title} <span className="serif-accent text-gold block">{view.highlight}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15.5px] leading-relaxed text-sand md:text-[17px]">{view.lead}</p>
          {calendar?.local ? <p className="mt-2 text-[13px] text-mist">That's {calendar.local} in your timezone.</p> : null}

          {!data.offline ? (
            <p className="mx-auto mt-7 flex w-fit max-w-full items-start gap-2.5 rounded-2xl border border-gold-300/20 bg-gold-400/[0.06] px-4 py-2 text-left text-[12.5px] leading-relaxed text-gold-100 sm:items-center sm:rounded-full">
              <Icon name={data.mail ? "mail" : "shield"} className="mt-0.5 h-4 w-4 shrink-0 text-gold-300 sm:mt-0" />
              <span className="[overflow-wrap:anywhere]">{data.mail ? view.mailLine : "Please keep your reference number for your records."}</span>
            </p>
          ) : null}
          {data.kind === "payment" && data.testMode ? (
            <p className="mx-auto mt-3 w-fit rounded-full border border-ember/40 bg-ember/10 px-3.5 py-1.5 font-mono text-[10.5px] tracking-[0.16em] text-ember uppercase">
              Test mode · no real money was charged
            </p>
          ) : null}
        </header>

        {data.kind !== "payment" && data.offline ? <OfflineNotice c={data} settings={settings} /> : null}

        {/* ---------------- Official document ---------------- */}
        <article className="print-area lux-card gold-edge relative mt-14 overflow-hidden print:mt-0" aria-labelledby="doc-title">
          <div className="h-[3px] bg-[linear-gradient(90deg,#7c5c2e,#e3c88c_35%,#c3954a_65%,#7c5c2e)] print:hidden" aria-hidden />

          <header className="flex flex-wrap items-start justify-between gap-6 px-6 pt-7 pb-6 md:px-10 md:pt-9">
            <div className="flex items-center gap-3.5">
              <BrandMark size={44} />
              <div>
                <p className="font-display text-[18px] [font-weight:420] tracking-[-0.01em] text-ivory">{settings.legal}</p>
                <p className="mt-0.5 text-[12px] text-mist">{settings.location}</p>
              </div>
            </div>
            <div className="sm:text-right">
              <p id="doc-title" className="label print-gold text-gold-300">
                {view.docTitle}
              </p>
              {data.reference ? <p className="mt-2 font-mono text-[13px] text-parchment">No. {data.reference}</p> : null}
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/10 px-2.5 py-1 text-[10.5px] font-bold tracking-[0.14em] text-sage uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-sage print:hidden" aria-hidden />
                {view.status}
              </span>
            </div>
          </header>

          {view.hero ? (
            <div className="mx-6 rounded-2xl border border-gold-300/[0.12] bg-ink-950/60 px-6 py-6 md:mx-10 md:px-8">
              <p className="label">{view.hero.label}</p>
              <p className={cn("display mt-3 leading-[1.05] text-gold-100", data.kind === "payment" ? "text-[2.5rem] md:text-[3.2rem]" : "text-[1.75rem] md:text-[2.2rem]")}>
                {view.hero.value}
              </p>
              {view.hero.sub ? <p className="mt-3 text-[13.5px] text-mist">{view.hero.sub}</p> : null}
            </div>
          ) : null}

          <dl className="grid gap-x-10 px-6 pt-3 sm:grid-cols-2 md:px-10">
            {rows.map((r) => (
              <div key={r.label} className={cn("border-b border-gold-300/[0.08] py-4", r.wide && "sm:col-span-2")}>
                <dt className="label">{r.label}</dt>
                <dd className={cn("mt-1.5 text-[14.5px] [overflow-wrap:anywhere] text-parchment", r.mono && "font-mono text-[13.5px] text-gold-200")}>{r.value}</dd>
              </div>
            ))}
          </dl>

          {view.quote?.text.trim() ? (
            <div className="px-6 pt-6 md:px-10">
              <p className="label">{view.quote.label}</p>
              <blockquote className="mt-3 rounded-r-2xl border-l-2 border-gold-400 bg-ink-950/50 px-5 py-4 text-[14px] leading-relaxed whitespace-pre-wrap text-sand [overflow-wrap:anywhere]">
                {view.quote.text}
              </blockquote>
            </div>
          ) : null}

          <footer className="mt-8 flex flex-col gap-5 border-t border-gold-300/10 bg-ink-950/40 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-10">
            <div className="max-w-sm text-[12.5px] leading-relaxed text-smoke">
              <p>{view.docNote}</p>
              <p className="mt-1.5 text-mist">
                {settings.email} · {settings.phone}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 print:hidden">
              {calendar ? (
                <>
                  <a
                    href={googleCalendarUrl({ title: calendar.title, start: calendar.start, minutes: calendar.minutes, details: calendar.details })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-gold btn-sm shine"
                  >
                    <Icon name="calendar" className="h-4 w-4" /> Google Calendar
                  </a>
                  <button
                    type="button"
                    className="btn btn-line btn-sm"
                    onClick={() => downloadIcs({ title: calendar.title, start: calendar.start, minutes: calendar.minutes, details: calendar.details, uid: data.reference || String(Date.now()) })}
                  >
                    <Icon name="download" className="h-4 w-4" /> .ics
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => window.print()} className="btn btn-gold btn-sm shine">
                  <Icon name="download" className="h-4 w-4" /> {data.kind === "payment" ? "Download receipt" : "Save as PDF"}
                </button>
              )}
              <CopyButton value={data.reference} />
            </div>
          </footer>
        </article>

        {/* ---------------- What happens next ---------------- */}
        <div className="print:hidden">
          <p className="label mt-14 text-center">What happens next</p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {view.steps.map((s, i) => (
              <li key={s.title} className="lux-card p-6">
                <div className="flex items-center justify-between">
                  <IconTile name={s.icon} size="sm" />
                  <span className="font-mono text-[11px] tracking-[0.2em] text-gold-500">0{i + 1}</span>
                </div>
                <h2 className="mt-5 text-[15.5px] font-semibold text-ivory">{s.title}</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">{s.body}</p>
              </li>
            ))}
          </ol>

          {/* ---------------- Next actions ---------------- */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {data.kind === "enquiry" ? (
              <Button to="/book" arrow track="confirmation_book">
                Book a free 30-min call
              </Button>
            ) : (
              <Button to="/work" arrow track={`confirmation_${data.kind}_work`}>
                {data.kind === "booking" ? "Browse our work before the call" : "Explore our work"}
              </Button>
            )}
            <Button href={whatsappLink(settings, whatsappText)} variant="line" icon="whatsapp" track={`confirmation_${data.kind}_whatsapp`}>
              WhatsApp us
            </Button>
            <Button to="/" variant="ghost">
              Back to home
            </Button>
          </div>
          <p className="mt-8 text-center text-[13px] text-smoke">
            Questions? Write to{" "}
            <a href={`mailto:${settings.email}`} className="text-gold-200 underline-offset-4 hover:underline">
              {settings.email}
            </a>{" "}
            or call{" "}
            <a href={phoneHref(settings.phone)} className="text-gold-200 underline-offset-4 hover:underline">
              {settings.phone}
            </a>
            {data.reference ? (
              <>
                {" "}
                — quote <span className="font-mono text-gold-200">{data.reference}</span>.
              </>
            ) : (
              "."
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
