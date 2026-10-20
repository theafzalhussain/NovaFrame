/**
 * In-browser API adapter
 * ----------------------
 * Mirrors the server contract against localStorage. It is used when the
 * API can't be reached (public forms never lose a lead) and powers the
 * admin "demo workspace". Nothing here leaves the visitor's browser.
 */
import { COLLECTION_NAMES, type CollectionName, type SiteContent } from "../data/types";
import { cloneDefaults, defaultContent } from "../data/defaults";
import type { ApiResult, Booking, ContentEntry, Lead, LeadActivity } from "./api";

const KEYS = {
  content: "nf_local_content_v2",
  leads: "nf_local_leads_v2",
  notes: "nf_local_lead_notes_v2",
  bookings: "nf_local_bookings_v2",
  subscribers: "nf_local_subscribers_v2",
  events: "nf_local_events_v2",
  audit: "nf_local_audit_v2",
};

type LocalStore = {
  modified: boolean;
  settings: { site: SiteContent["settings"]; advanced: SiteContent["advanced"] };
  collections: Record<CollectionName, ContentEntry[]>;
};

type LocalEvent = { name: string; path: string; sid: string; referrer?: string; meta?: Record<string, unknown>; at: string };
type LocalAudit = { id: number; action: string; target: string; details: string; created_at: string };

/* ------------------------------------------------------------------ */
/* Storage helpers                                                    */
/* ------------------------------------------------------------------ */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or privacy mode — ignore */
  }
}

const nowSql = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const ref = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function freshStore(): LocalStore {
  const defaults = cloneDefaults();
  const collections = {} as Record<CollectionName, ContentEntry[]>;
  for (const name of COLLECTION_NAMES) {
    collections[name] = (defaults.collections[name] as unknown as { id: string }[]).map((item, i) => ({
      id: item.id,
      data: item as ContentEntry["data"],
      published: true,
      sortOrder: (i + 1) * 10,
      createdAt: nowSql(),
      updatedAt: nowSql(),
    }));
  }
  return { modified: false, settings: { site: defaults.settings, advanced: defaults.advanced }, collections };
}

function store(): LocalStore {
  const s = read<LocalStore | null>(KEYS.content, null);
  if (!s || !s.collections) return freshStore();
  // New collections added in later versions get their defaults.
  for (const name of COLLECTION_NAMES) {
    if (!Array.isArray(s.collections[name])) s.collections[name] = freshStore().collections[name];
  }
  s.settings = {
    site: { ...defaultContent.settings, ...s.settings?.site },
    advanced: { ...defaultContent.advanced, ...s.settings?.advanced },
  };
  return s;
}
function saveStore(s: LocalStore) {
  s.modified = true;
  write(KEYS.content, s);
}

function audit(action: string, target: string, details = "") {
  const log = read<LocalAudit[]>(KEYS.audit, []);
  log.unshift({ id: Date.now(), action, target, details, created_at: nowSql() });
  write(KEYS.audit, log.slice(0, 200));
}

function estimate(budget: string) {
  const r = store().settings.advanced.budgetRanges.find((b) => b.label === budget);
  if (!r) return null;
  return r.max === null ? Math.round(r.min * 1.25) : Math.round((r.min + r.max) / 2);
}

const okR = <T>(data?: T, status = 200): ApiResult<T> => ({ ok: true, data, status, offline: true });
const failR = <T>(status: number, error: string): ApiResult<T> => ({ ok: false, error, status, offline: true });

/** True when the visitor (or the demo admin) has edited local content. */
export function localContentModified() {
  return read<LocalStore | null>(KEYS.content, null)?.modified === true;
}

export function localContentSnapshot(): SiteContent {
  const s = store();
  const collections = {} as SiteContent["collections"];
  for (const name of COLLECTION_NAMES) {
    (collections as Record<string, unknown>)[name] = [...s.collections[name]]
      .filter((e) => e.published)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((e) => ({ ...e.data, id: e.id }));
  }
  return { settings: s.settings.site, advanced: s.settings.advanced, collections };
}

/* ------------------------------------------------------------------ */
/* Router                                                             */
/* ------------------------------------------------------------------ */
async function handle<T>(method: string, fullPath: string, body?: unknown): Promise<ApiResult<T>> {
  const [path, query = ""] = fullPath.split("?");
  const params = new URLSearchParams(query);
  const b = (body ?? {}) as Record<string, unknown>;
  const s = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  let m: RegExpMatchArray | null;

  /* ---------------- public ---------------- */
  if (path === "/content" && method === "GET") return okR(localContentSnapshot() as T);

  if (path === "/enquiries" && method === "POST") {
    if (s(b.website)) return okR({ reference: ref("NF") } as T, 201);
    const leads = read<Lead[]>(KEYS.leads, []);
    const reference = ref("NF");
    const budget = s(b.budget, 80) || "Not specified";
    leads.unshift({
      id: Date.now(),
      reference,
      name: s(b.name, 120),
      companyName: s(b.companyName, 160),
      email: s(b.email, 160).toLowerCase(),
      phone: s(b.phone, 40),
      service: s(b.service, 100) || "General enquiry",
      budget,
      timeline: s(b.timeline, 80),
      details: s(b.details, 5000),
      status: "new",
      priority: "normal",
      valueEstimate: estimate(budget),
      notes: "",
      source: s(b.source, 30) || "contact",
      createdAt: nowSql(),
      updatedAt: nowSql(),
    });
    write(KEYS.leads, leads.slice(0, 300));
    return okR({ reference, message: "Saved in this browser" } as T, 201);
  }

  if (path === "/bookings/availability" && method === "GET") {
    const taken: Record<string, string[]> = {};
    for (const bk of read<Booking[]>(KEYS.bookings, [])) {
      if (bk.status === "scheduled" || bk.status === "confirmed") (taken[bk.date] ??= []).push(bk.time);
    }
    return okR({ taken } as T);
  }

  if (path === "/bookings" && method === "POST") {
    const bookings = read<Booking[]>(KEYS.bookings, []);
    const date = s(b.date, 10);
    const time = s(b.time, 12);
    if (bookings.some((x) => x.date === date && x.time === time && (x.status === "scheduled" || x.status === "confirmed"))) {
      return failR(409, "That slot was just taken — please pick another time.");
    }
    const reference = ref("NFC");
    const leadId = Date.now();
    const site = store().settings.site;
    const leads = read<Lead[]>(KEYS.leads, []);
    leads.unshift({
      id: leadId,
      reference: ref("NF"),
      name: s(b.name, 120),
      companyName: s(b.companyName, 160),
      email: s(b.email, 160).toLowerCase(),
      phone: s(b.phone, 40),
      service: `Discovery call — ${s(b.topic, 100) || "General"}`,
      budget: s(b.budget, 80) || "To discuss on call",
      timeline: `Call booked for ${date} · ${time} ${site.timezoneLabel}`,
      details: s(b.notes, 2000) || "Discovery call requested.",
      status: "new",
      priority: "normal",
      valueEstimate: estimate(s(b.budget, 80)),
      notes: "",
      source: "booking",
      createdAt: nowSql(),
      updatedAt: nowSql(),
    });
    write(KEYS.leads, leads.slice(0, 300));
    bookings.unshift({
      id: leadId + 1,
      reference,
      name: s(b.name, 120),
      email: s(b.email, 160).toLowerCase(),
      phone: s(b.phone, 40),
      companyName: s(b.companyName, 160),
      topic: s(b.topic, 100) || "Discovery call",
      budget: s(b.budget, 80),
      notes: s(b.notes, 2000),
      date,
      time,
      timezone: site.timezone,
      status: "scheduled",
      meetingLink: "",
      internalNotes: "",
      enquiryId: leadId,
      createdAt: nowSql(),
    });
    write(KEYS.bookings, bookings.slice(0, 300));
    return okR({ reference, date, time, timezone: site.timezoneLabel, durationMinutes: site.booking.durationMinutes } as T, 201);
  }

  if (path === "/subscribe" && method === "POST") {
    const list = read<{ id: number; email: string; source: string; createdAt: string }[]>(KEYS.subscribers, []);
    const email = s(b.email, 160).toLowerCase();
    const existing = list.some((x) => x.email === email);
    if (!existing) list.unshift({ id: Date.now(), email, source: s(b.source, 40) || "footer", createdAt: nowSql() });
    write(KEYS.subscribers, list);
    return okR({ subscribed: true, existing } as T);
  }

  if (path === "/events" && method === "POST") {
    const events = read<LocalEvent[]>(KEYS.events, []);
    events.push({ name: s(b.name, 40), path: s(b.path, 200), sid: s(b.sid, 64), referrer: s(b.referrer, 300), meta: b.meta as Record<string, unknown>, at: new Date().toISOString() });
    write(KEYS.events, events.slice(-1500));
    return okR(null as T, 202);
  }

  if (!path.startsWith("/admin")) return failR(503, "The API server is offline.");

  /* ---------------- admin (demo workspace) ---------------- */
  if (path === "/admin/me") return okR({ user: { id: 0, email: "demo@local", fullName: "Demo workspace", role: "owner" } } as T);
  if (path === "/admin/logout") return okR(null as T);
  if (path === "/admin/password") return failR(400, "Passwords can't be changed in the demo workspace.");
  if (path === "/admin/sessions") {
    return okR([{ id: 1, ip_address: "this browser", user_agent: navigator.userAgent, created_at: nowSql(), last_seen_at: nowSql(), expires_at: "—", current: true }] as T);
  }

  if (path === "/admin/overview") return okR(overview() as T);
  if (path === "/admin/analytics") return okR(analytics(Number(params.get("days")) || 30) as T);

  // Leads
  if (path === "/admin/enquiries" && method === "GET") return okR(read<Lead[]>(KEYS.leads, []) as T);
  if ((m = path.match(/^\/admin\/enquiries\/(\d+)$/))) {
    const id = Number(m[1]);
    const leads = read<Lead[]>(KEYS.leads, []);
    const lead = leads.find((l) => l.id === id);
    if (!lead) return failR(404, "Lead not found.");
    const notes = read<Record<string, LeadActivity[]>>(KEYS.notes, {});
    if (method === "GET") {
      const booking = read<Booking[]>(KEYS.bookings, []).find((x) => x.enquiryId === id) ?? null;
      return okR({ ...lead, activity: notes[id] ?? [], booking } as T);
    }
    if (method === "PATCH") {
      const log = notes[id] ?? [];
      if (b.status !== undefined && b.status !== lead.status) {
        log.unshift({ id: Date.now(), kind: "status", body: `Status changed from ${lead.status} to ${String(b.status)}`, author: "Demo", createdAt: nowSql() });
      }
      if (b.priority !== undefined && b.priority !== lead.priority) {
        log.unshift({ id: Date.now() + 1, kind: "priority", body: `Priority set to ${String(b.priority)}`, author: "Demo", createdAt: nowSql() });
      }
      notes[id] = log;
      write(KEYS.notes, notes);
      Object.assign(lead, b, { updatedAt: nowSql() });
      write(KEYS.leads, leads);
      audit("LEAD_UPDATED", `LEAD_${id}`);
      return okR(lead as T);
    }
    if (method === "DELETE") {
      write(KEYS.leads, leads.filter((l) => l.id !== id));
      audit("LEAD_DELETED", `LEAD_${id}`);
      return okR(null as T);
    }
  }
  if ((m = path.match(/^\/admin\/enquiries\/(\d+)\/notes$/)) && method === "POST") {
    const id = Number(m[1]);
    const notes = read<Record<string, LeadActivity[]>>(KEYS.notes, {});
    const note = { id: Date.now(), kind: "note", body: s(b.body, 4000), author: "Demo", createdAt: nowSql() };
    notes[id] = [note, ...(notes[id] ?? [])];
    write(KEYS.notes, notes);
    return okR(note as T, 201);
  }

  // Bookings
  if (path === "/admin/bookings" && method === "GET") return okR(read<Booking[]>(KEYS.bookings, []) as T);
  if ((m = path.match(/^\/admin\/bookings\/(\d+)$/))) {
    const id = Number(m[1]);
    const list = read<Booking[]>(KEYS.bookings, []);
    const item = list.find((x) => x.id === id);
    if (!item) return failR(404, "Booking not found.");
    if (method === "PATCH") {
      Object.assign(item, b);
      write(KEYS.bookings, list);
      audit("BOOKING_UPDATED", `BOOKING_${id}`);
      return okR(item as T);
    }
    if (method === "DELETE") {
      write(KEYS.bookings, list.filter((x) => x.id !== id));
      audit("BOOKING_DELETED", `BOOKING_${id}`);
      return okR(null as T);
    }
  }

  // Subscribers
  if (path === "/admin/subscribers" && method === "GET") return okR(read(KEYS.subscribers, []) as T);
  if ((m = path.match(/^\/admin\/subscribers\/(\d+)$/)) && method === "DELETE") {
    const id = Number(m[1]);
    write(KEYS.subscribers, read<{ id: number }[]>(KEYS.subscribers, []).filter((x) => x.id !== id));
    return okR(null as T);
  }

  // Content collections
  if ((m = path.match(/^\/admin\/content\/([A-Za-z]+)(?:\/([^/]+))?(?:\/(reorder|reset))?$/))) {
    const name = m[1] as CollectionName;
    if (!COLLECTION_NAMES.includes(name)) return failR(404, "Unknown collection.");
    const st = store();
    const list = st.collections[name];
    const action = m[3] ?? (m[2] === "reorder" || m[2] === "reset" ? m[2] : undefined);
    const id = m[2] && !["reorder", "reset"].includes(m[2]) ? decodeURIComponent(m[2]) : undefined;

    if (action === "reorder" && method === "POST") {
      const ids = (b.ids as string[]) ?? [];
      ids.forEach((eid, i) => {
        const e = list.find((x) => x.id === eid);
        if (e) e.sortOrder = (i + 1) * 10;
      });
      saveStore(st);
      return okR([...list].sort((a, c) => a.sortOrder - c.sortOrder) as T);
    }
    if (action === "reset" && method === "POST") {
      st.collections[name] = freshStore().collections[name];
      saveStore(st);
      audit("CONTENT_RESET", name);
      return okR(st.collections[name] as T);
    }
    if (!id && method === "GET") return okR([...list].sort((a, c) => a.sortOrder - c.sortOrder) as T);
    if (!id && method === "POST") {
      const data = (b.data ?? {}) as Record<string, unknown>;
      const base = slug(String(b.id ?? data.id ?? data.title ?? data.name ?? data.q ?? "item")) || `item-${Date.now().toString(36)}`;
      let newId = base;
      while (list.some((x) => x.id === newId)) newId = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const entry: ContentEntry = {
        id: newId,
        data: { ...data, id: newId } as ContentEntry["data"],
        published: b.published !== false,
        sortOrder: Math.max(0, ...list.map((x) => x.sortOrder)) + 10,
        createdAt: nowSql(),
        updatedAt: nowSql(),
      };
      list.push(entry);
      saveStore(st);
      audit("CONTENT_CREATED", `${name}/${newId}`);
      return okR(entry as T, 201);
    }
    if (id) {
      const entry = list.find((x) => x.id === id);
      if (!entry) return failR(404, "Entry not found.");
      if (method === "PUT") {
        const newId = s(b.newId, 80);
        if (newId && newId !== id) {
          if (list.some((x) => x.id === newId)) return failR(409, "Another entry already uses that ID.");
          entry.id = newId;
        }
        entry.data = { ...(b.data as object), id: entry.id } as ContentEntry["data"];
        if (b.published !== undefined) entry.published = Boolean(b.published);
        entry.updatedAt = nowSql();
        saveStore(st);
        audit("CONTENT_UPDATED", `${name}/${entry.id}`);
        return okR(entry as T);
      }
      if (method === "DELETE") {
        st.collections[name] = list.filter((x) => x.id !== id);
        saveStore(st);
        audit("CONTENT_DELETED", `${name}/${id}`);
        return okR(null as T);
      }
    }
  }

  // Settings
  if (path === "/admin/settings" && method === "GET") {
    const st = store();
    return okR({ site: st.settings.site, advanced: st.settings.advanced } as T);
  }
  if ((m = path.match(/^\/admin\/settings\/(site|advanced)$/)) && method === "PUT") {
    const st = store();
    const key = m[1] as "site" | "advanced";
    st.settings[key] = { ...st.settings[key], ...(b.value as object) } as never;
    saveStore(st);
    audit("SETTINGS_UPDATED", `SETTINGS_${key.toUpperCase()}`);
    return okR(st.settings[key] as T);
  }

  if (path === "/admin/audit") {
    return okR(read<LocalAudit[]>(KEYS.audit, []).map((a) => ({ ...a, admin_id: 0, admin_email: "demo@local", ip_address: "browser" })) as T);
  }
  if (path === "/admin/users" && method === "GET") {
    return okR([{ id: 0, email: "demo@local", fullName: "Demo workspace", role: "owner", active: true, createdAt: nowSql(), lastLoginAt: nowSql() }] as T);
  }
  if (path.startsWith("/admin/users")) return failR(400, "Team management needs the live API server.");
  if (path === "/admin/export") return okR({ exportedAt: new Date().toISOString(), scope: "content", ...localContentSnapshot() } as T);

  return failR(404, "Not available in the demo workspace.");
}

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
}

/* ------------------------------------------------------------------ */
/* Demo dashboard aggregates                                          */
/* ------------------------------------------------------------------ */
function lastDays(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return localDate(d);
  });
}
const dayOf = (sqlOrIso: string) => {
  const d = new Date(sqlOrIso.includes("T") ? sqlOrIso : sqlOrIso.replace(" ", "T") + "Z");
  return localDate(d);
};

function overview() {
  const leads = read<Lead[]>(KEYS.leads, []);
  const bookings = read<Booking[]>(KEYS.bookings, []);
  const subs = read<{ createdAt: string }[]>(KEYS.subscribers, []);
  const events = read<LocalEvent[]>(KEYS.events, []);
  const week = Date.now() - 7 * 86_400_000;
  const twoWeeks = Date.now() - 14 * 86_400_000;
  const ts = (x: string) => new Date(x.includes("T") ? x : x.replace(" ", "T") + "Z").getTime();
  const open = ["new", "contacted", "qualified", "proposal"];
  const won = leads.filter((l) => l.status === "won");
  const lost = leads.filter((l) => l.status === "lost");
  const today = localDate(new Date());
  const views = events.filter((e) => e.name === "page_view");
  const recentViews = views.filter((e) => ts(e.at) >= week);
  const days = lastDays(30);
  const count = <T>(arr: T[], key: (x: T) => string) =>
    Object.entries(arr.reduce<Record<string, number>>((acc, x) => ((acc[key(x)] = (acc[key(x)] ?? 0) + 1), acc), {}));

  return {
    kpis: {
      leadsTotal: leads.length,
      leadsNew: leads.filter((l) => l.status === "new").length,
      leads7d: leads.filter((l) => ts(l.createdAt) >= week).length,
      leadsPrev7d: leads.filter((l) => ts(l.createdAt) < week && ts(l.createdAt) >= twoWeeks).length,
      won: won.length,
      winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
      pipelineValue: leads.filter((l) => open.includes(l.status)).reduce((s, l) => s + (l.valueEstimate ?? 0), 0),
      wonValue: won.reduce((s, l) => s + (l.valueEstimate ?? 0), 0),
      bookingsUpcoming: bookings.filter((x) => x.date >= today && ["scheduled", "confirmed"].includes(x.status)).length,
      subscribers: subs.length,
      subscribers7d: subs.filter((x) => ts(x.createdAt) >= week).length,
      views7d: recentViews.length,
      visitors7d: new Set(recentViews.map((e) => e.sid)).size,
    },
    leadsSeries: days.map((date) => ({ date, count: leads.filter((l) => dayOf(l.createdAt) === date).length })),
    viewsSeries: days.map((date) => ({ date, count: views.filter((e) => dayOf(e.at) === date).length })),
    pipeline: count(leads, (l) => l.status).map(([status, c]) => ({
      status,
      count: c,
      value: leads.filter((l) => l.status === status).reduce((s, l) => s + (l.valueEstimate ?? 0), 0),
    })),
    sources: count(leads, (l) => l.source).map(([source, c]) => ({ source, count: c })),
    services: count(leads, (l) => l.service).map(([service, c]) => ({ service, count: c })).slice(0, 6),
    upcomingBookings: bookings
      .filter((x) => x.date >= today && ["scheduled", "confirmed"].includes(x.status))
      .sort((a, c) => (a.date + a.time).localeCompare(c.date + c.time))
      .slice(0, 6),
    recentLeads: leads.slice(0, 6),
    recentActivity: read<LocalAudit[]>(KEYS.audit, []).slice(0, 8).map((a) => ({ ...a, admin_id: 0, admin_email: "demo@local", ip_address: "browser" })),
    content: COLLECTION_NAMES.map((name) => {
      const list = store().collections[name];
      return { collection: name, published: list.filter((e) => e.published).length, total: list.length };
    }),
  };
}

function analytics(days: number) {
  const events = read<LocalEvent[]>(KEYS.events, []);
  const since = Date.now() - days * 86_400_000;
  const recent = events.filter((e) => new Date(e.at).getTime() >= since);
  const views = recent.filter((e) => e.name === "page_view");
  const leads = read<Lead[]>(KEYS.leads, []).filter((l) => new Date(l.createdAt.replace(" ", "T") + "Z").getTime() >= since).length;
  const visitors = new Set(views.map((e) => e.sid)).size;
  const tally = (list: LocalEvent[], key: (e: LocalEvent) => string) =>
    Object.entries(list.reduce<Record<string, number>>((acc, e) => ((acc[key(e)] = (acc[key(e)] ?? 0) + 1), acc), {})).sort((a, c) => c[1] - a[1]);
  return {
    days,
    totals: { views: views.length, visitors, leads, conversion: visitors ? +((leads / visitors) * 100).toFixed(2) : 0 },
    series: lastDays(days).map((date) => {
      const v = views.filter((e) => dayOf(e.at) === date);
      return { date, views: v.length, visitors: new Set(v.map((e) => e.sid)).size };
    }),
    topPages: tally(views, (e) => e.path || "/").slice(0, 10).map(([path, c]) => ({ path, views: c })),
    topEvents: tally(recent.filter((e) => e.name !== "page_view"), (e) => e.name).slice(0, 10).map(([name, c]) => ({ name, count: c })),
    ctas: tally(recent.filter((e) => e.name === "cta_click"), (e) => String(e.meta?.label ?? "unknown")).slice(0, 10).map(([label, c]) => ({ label, count: c })),
    referrers: tally(views.filter((e) => e.referrer), (e) => e.referrer ?? "").slice(0, 8).map(([referrer, c]) => ({ referrer, count: c })),
  };
}

export const localApi = { handle };
