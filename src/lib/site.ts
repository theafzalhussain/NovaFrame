import type { AdvancedSettings, SiteSettings } from "../data/types";

/* ------------------------------------------------------------------ */
/* Formatting                                                         */
/* ------------------------------------------------------------------ */
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatINR(value: number) {
  return inr.format(Math.round(value));
}

/** ₹2.4L / ₹1.2Cr style compact rupees for dashboards */
export function formatINRCompact(value: number) {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value}`;
}

/* ------------------------------------------------------------------ */
/* Contact links                                                      */
/* ------------------------------------------------------------------ */
export function whatsappLink(settings: SiteSettings, message = settings.whatsappMessage) {
  return `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function phoneHref(phone: string) {
  return `tel:+${phone.replace(/\D/g, "")}`;
}

export function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------ */
/* Availability                                                       */
/* ------------------------------------------------------------------ */
export function quarterLabel(date = new Date()) {
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

export function availabilityLabel(settings: SiteSettings, date = new Date()) {
  const slots = settings.availability.slotsOpen;
  if (slots <= 0) return `Fully booked · ${quarterLabel(date)}`;
  return `${slots} project ${slots === 1 ? "slot" : "slots"} open · ${quarterLabel(date)}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Live "is the studio working right now?" status in the studio's own timezone. */
export function studioStatus(settings: SiteSettings, date = new Date()) {
  const timeZone = settings.timezone;
  try {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(date));
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
    const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
    const { start, end, days } = settings.workingHours;
    const online = days.includes(WEEKDAYS.indexOf(weekday)) && hour >= start && hour < end;
    return { online, time, weekday };
  } catch {
    return { online: false, time: "", weekday: "" };
  }
}

/* ------------------------------------------------------------------ */
/* Dates                                                              */
/* ------------------------------------------------------------------ */
/** yyyy-mm-dd in the visitor's local timezone (avoids the UTC off-by-one of toISOString). */
export function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Next N working days (starting tomorrow, skipping days the studio is closed). */
export function upcomingWorkdays(settings: SiteSettings, count: number, from = new Date()) {
  const days: { key: string; day: string; date: string; month: string }[] = [];
  const cursor = new Date(from);
  let guard = 0;
  while (days.length < count && guard++ < 60) {
    cursor.setDate(cursor.getDate() + 1);
    if (!settings.workingHours.days.includes(cursor.getDay())) continue;
    days.push({
      key: localDateKey(cursor),
      day: cursor.toLocaleDateString("en-US", { weekday: "short" }),
      date: cursor.toLocaleDateString("en-US", { day: "numeric" }),
      month: cursor.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  return days;
}

export function prettyDate(value: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", opts);
}

export function timeAgo(value: string) {
  const d = new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (Number.isNaN(s)) return value;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86_400 * 30) return `${Math.floor(s / 86_400)}d ago`;
  return prettyDate(value);
}

/* ------------------------------------------------------------------ */
/* Budget helpers                                                     */
/* ------------------------------------------------------------------ */
export function budgetForAmount(advanced: AdvancedSettings, amount: number) {
  const ranges = advanced.budgetRanges;
  const hit = ranges.find((b) => amount >= b.min && (b.max === null || amount < b.max));
  return (hit ?? ranges[ranges.length - 1])?.label ?? advanced.budgetUnsure;
}

/* ------------------------------------------------------------------ */
/* Brief draft hand-off (estimator → contact form)                    */
/* ------------------------------------------------------------------ */
const BRIEF_KEY = "nf_brief_draft";

export type BriefDraft = { service?: string; budget?: string; timeline?: string; details?: string; source?: string };

export function saveBriefDraft(draft: BriefDraft) {
  try {
    sessionStorage.setItem(BRIEF_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable */
  }
}

export function readBriefDraft(): BriefDraft | null {
  try {
    const raw = sessionStorage.getItem(BRIEF_KEY);
    return raw ? (JSON.parse(raw) as BriefDraft) : null;
  } catch {
    return null;
  }
}

export function clearBriefDraft() {
  try {
    sessionStorage.removeItem(BRIEF_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Navigation                                                         */
/* ------------------------------------------------------------------ */
export const navLinks = [
  { label: "Services", to: "/services" },
  { label: "Work", to: "/work" },
  { label: "Pricing", to: "/pricing" },
  { label: "Studio", to: "/studio" },
  { label: "Insights", to: "/insights" },
  { label: "Contact", to: "/contact" },
];

const ALIASES: Record<string, string> = {
  "/portfolio": "/work",
  "/about": "/studio",
  "/capabilities": "/services",
};

function section(path: string) {
  const first = "/" + (path.split("/").filter(Boolean)[0] ?? "");
  return ALIASES[first] ?? first;
}

/** True when `current` is inside the section `to` points at (aliases aware). */
export function isActivePath(current: string, to: string) {
  if (to === "/") return current === "/";
  return section(current) === section(to);
}
