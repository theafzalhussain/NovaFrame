/**
 * API client
 * ----------
 * Talks to the Express/PHP API. If the API can't be reached (static
 * hosting, server not started) public calls fall back to an in-browser
 * adapter so the site keeps working, and the admin offers a clearly
 * labelled demo workspace stored in this browser only.
 */
import type { AdminRole, CollectionName, SiteContent } from "../data/types";
import { localApi } from "./localApi";

export type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
  status?: number;
  /** true when the request was served by the in-browser fallback */
  offline?: boolean;
};

const API_BASE = ((import.meta.env?.VITE_API_URL as string | undefined) || "/api").replace(/\/+$/, "");
const BASE = API_BASE;
const TOKEN_KEY = "nf_admin_token";
const DEMO_TOKEN = "demo-workspace";

export { API_BASE };

/* ------------------------------------------------------------------ */
/* Session storage                                                    */
/* ------------------------------------------------------------------ */
export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function isDemoSession() {
  return getAdminToken() === DEMO_TOKEN;
}

/* ------------------------------------------------------------------ */
/* Core request                                                       */
/* ------------------------------------------------------------------ */
type RequestOptions = { fallback?: boolean; timeoutMs?: number };

export async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<ApiResult<T>> {
  const isAdmin = path.startsWith("/admin");
  if (isAdmin && isDemoSession()) return localApi.handle<T>(method, path, body);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getAdminToken();
  if (isAdmin && token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
      throw new Error("API unavailable");
    }
    const json = (await res.json()) as { ok?: boolean; data?: T; error?: string; errors?: Record<string, string> };
    if (res.status === 401 && isAdmin && token) {
      clearAdminToken();
      window.dispatchEvent(new Event("nf:auth-expired"));
    }
    return {
      ok: res.ok && json.ok !== false,
      data: json.data,
      error: json.error ?? (res.ok ? undefined : `Request failed (${res.status})`),
      errors: json.errors,
      status: res.status,
    };
  } catch (err) {
    clearTimeout(timer);
    if (opts.fallback === false || isAdmin) {
      return { ok: false, offline: true, error: "Can't reach the API server.", status: 0 };
    }
    const local = await localApi.handle<T>(method, path, body);
    return { ...local, offline: true };
  }
}

/* ------------------------------------------------------------------ */
/* Public endpoints                                                   */
/* ------------------------------------------------------------------ */
export type EnquiryPayload = {
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  service: string;
  budget: string;
  timeline?: string;
  details: string;
  source?: string;
  website?: string; // honeypot
};

export type BookingPayload = {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  topic: string;
  budget?: string;
  notes?: string;
  date: string;
  time: string;
  website?: string; // honeypot
};

export type PaymentOrderPayload = {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  purpose: string;
  amount: number; // in rupees (major unit)
  website?: string; // honeypot
};

export type PaymentOrder = {
  reference: string;
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  name: string;
  email: string;
  phone?: string;
  testMode?: boolean;
};

export type PaymentVerifyPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type PaymentReceipt = {
  reference: string;
  paymentId: string;
  orderId: string;
  amount: number; // rupees
  currency: string;
  purpose: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  /** e.g. "UPI" or "Net banking · HDFC" (null if Razorpay didn't report it in time) */
  method?: string | null;
  paidAt: string; // ISO
  testMode?: boolean;
  /** true when the server has email configured (a receipt is on its way) */
  mail?: boolean;
};

export type PaymentConfig = { enabled: boolean; keyId: string; currency: string; testMode?: boolean };

export const api = {
  health: () => request<{ service: string }>("GET", "/health", undefined, { fallback: false, timeoutMs: 4000 }),
  content: () => request<SiteContent & { version?: string }>("GET", "/content"),
  submitEnquiry: (payload: EnquiryPayload) =>
    request<{ reference: string; message: string; mail?: boolean }>("POST", "/enquiries", payload),
  availability: (from: string, to: string) =>
    request<{ taken: Record<string, string[]> }>("GET", `/bookings/availability?from=${from}&to=${to}`),
  book: (payload: BookingPayload) =>
    request<{ reference: string; date: string; time: string; timezone: string; durationMinutes: number; mail?: boolean }>("POST", "/bookings", payload),
  subscribe: (email: string, source = "footer") =>
    request<{ subscribed: boolean; existing: boolean }>("POST", "/subscribe", { email, source }),
  paymentConfig: () => request<PaymentConfig>("GET", "/payments/config", undefined, { fallback: false, timeoutMs: 6000 }),
  createPaymentOrder: (payload: PaymentOrderPayload) =>
    request<PaymentOrder>("POST", "/payments/order", payload, { fallback: false, timeoutMs: 15000 }),
  verifyPayment: (payload: PaymentVerifyPayload) =>
    request<PaymentReceipt>("POST", "/payments/verify", payload, { fallback: false, timeoutMs: 20000 }),
};

/* ------------------------------------------------------------------ */
/* First-party analytics (anonymous, no cookies)                      */
/* ------------------------------------------------------------------ */
function sessionId() {
  try {
    let sid = sessionStorage.getItem("nf_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("nf_sid", sid);
    }
    return sid;
  } catch {
    return "";
  }
}

export function track(name: string, meta?: Record<string, unknown>) {
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
  const path = window.location.hash.replace(/^#/, "") || "/";
  if (path.startsWith("/admin") || path.startsWith("/portal")) return;
  let referrer = "";
  try {
    if (document.referrer && new URL(document.referrer).host !== window.location.host) referrer = new URL(document.referrer).host;
  } catch {
    /* ignore */
  }
  void request("POST", "/events", { name, meta, path, sid: sessionId(), referrer });
}

/* ------------------------------------------------------------------ */
/* Admin endpoints                                                    */
/* ------------------------------------------------------------------ */
export type AdminUser = { id: number; email: string; fullName: string; role: AdminRole; lastLoginAt?: string | null };

export type Lead = {
  id: number;
  reference: string;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  service: string;
  budget: string;
  timeline?: string;
  details: string;
  status: string;
  priority: string;
  valueEstimate: number | null;
  notes?: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadActivity = { id: number; kind: string; body: string; author?: string; createdAt: string };

export type Booking = {
  id: number;
  reference: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  topic: string;
  budget?: string;
  notes?: string;
  date: string;
  time: string;
  timezone: string;
  status: string;
  meetingLink?: string;
  internalNotes?: string;
  enquiryId?: number | null;
  createdAt: string;
};

export type ContentEntry<T = Record<string, unknown>> = {
  id: string;
  data: T & { id: string };
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Overview = {
  kpis: {
    leadsTotal: number;
    leadsNew: number;
    leads7d: number;
    leadsPrev7d: number;
    won: number;
    winRate: number | null;
    pipelineValue: number;
    wonValue: number;
    bookingsUpcoming: number;
    subscribers: number;
    subscribers7d: number;
    views7d: number;
    visitors7d: number;
  };
  leadsSeries: { date: string; count: number }[];
  viewsSeries: { date: string; count: number }[];
  pipeline: { status: string; count: number; value: number }[];
  sources: { source: string; count: number }[];
  services: { service: string; count: number }[];
  upcomingBookings: Pick<Booking, "id" | "reference" | "name" | "companyName" | "topic" | "date" | "time" | "status" | "meetingLink">[];
  recentLeads: Pick<Lead, "id" | "reference" | "name" | "companyName" | "service" | "budget" | "status" | "priority" | "createdAt">[];
  recentActivity: AuditEntry[];
  content: { collection: string; published: number; total: number }[];
};

export type Analytics = {
  days: number;
  totals: { views: number; visitors: number; leads: number; conversion: number };
  series: { date: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  topEvents: { name: string; count: number }[];
  ctas: { label: string; count: number }[];
  referrers: { referrer: string; count: number }[];
};

export type AuditEntry = {
  id: number;
  admin_id: number | null;
  admin_email: string | null;
  action: string;
  target: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
};

export type Subscriber = { id: number; email: string; source: string; createdAt: string };
export type SessionInfo = { id: number; ip_address: string; user_agent: string; created_at: string; last_seen_at: string; expires_at: string; current: boolean };
export type TeamUser = AdminUser & { active: boolean; createdAt: string };

export const admin = {
  async login(email: string, password: string) {
    const res = await request<{ token: string; user: AdminUser }>("POST", "/admin/login", { email, password });
    if (res.ok && res.data?.token) setAdminToken(res.data.token);
    return res;
  },
  enterDemo() {
    setAdminToken(DEMO_TOKEN);
  },
  async logout() {
    if (!isDemoSession()) await request("POST", "/admin/logout");
    clearAdminToken();
  },
  me: () => request<{ user: AdminUser }>("GET", "/admin/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    request("POST", "/admin/password", { currentPassword, newPassword }),
  sessions: () => request<SessionInfo[]>("GET", "/admin/sessions"),
  revokeSession: (id: number) => request("DELETE", `/admin/sessions/${id}`),

  overview: () => request<Overview>("GET", "/admin/overview"),
  analytics: (days = 30) => request<Analytics>("GET", `/admin/analytics?days=${days}`),

  leads: () => request<Lead[]>("GET", "/admin/enquiries"),
  lead: (id: number) => request<Lead & { activity: LeadActivity[]; booking: { id: number; reference: string; date: string; time: string; status: string } | null }>("GET", `/admin/enquiries/${id}`),
  updateLead: (id: number, patch: Partial<Pick<Lead, "status" | "priority" | "valueEstimate" | "notes">>) =>
    request<Lead>("PATCH", `/admin/enquiries/${id}`, patch),
  addLeadNote: (id: number, body: string) => request<LeadActivity>("POST", `/admin/enquiries/${id}/notes`, { body }),
  deleteLead: (id: number) => request("DELETE", `/admin/enquiries/${id}`),

  bookings: () => request<Booking[]>("GET", "/admin/bookings"),
  updateBooking: (id: number, patch: Partial<Pick<Booking, "status" | "meetingLink" | "internalNotes" | "date" | "time">>) =>
    request<Booking>("PATCH", `/admin/bookings/${id}`, patch),
  deleteBooking: (id: number) => request("DELETE", `/admin/bookings/${id}`),

  subscribers: () => request<Subscriber[]>("GET", "/admin/subscribers"),
  deleteSubscriber: (id: number) => request("DELETE", `/admin/subscribers/${id}`),

  list: <T>(collection: CollectionName) => request<ContentEntry<T>[]>("GET", `/admin/content/${collection}`),
  create: <T>(collection: CollectionName, data: T, published = true) =>
    request<ContentEntry<T>>("POST", `/admin/content/${collection}`, { data, published }),
  update: <T>(collection: CollectionName, id: string, data: T, extra: { published?: boolean; newId?: string } = {}) =>
    request<ContentEntry<T>>("PUT", `/admin/content/${collection}/${encodeURIComponent(id)}`, { data, ...extra }),
  remove: (collection: CollectionName, id: string) => request("DELETE", `/admin/content/${collection}/${encodeURIComponent(id)}`),
  reorder: <T>(collection: CollectionName, ids: string[]) =>
    request<ContentEntry<T>[]>("POST", `/admin/content/${collection}/reorder`, { ids }),
  reset: <T>(collection: CollectionName) => request<ContentEntry<T>[]>("POST", `/admin/content/${collection}/reset`),

  settings: () => request<{ site: SiteContent["settings"]; advanced: SiteContent["advanced"] }>("GET", "/admin/settings"),
  saveSettings: <T>(key: "site" | "advanced", value: T) => request<T>("PUT", `/admin/settings/${key}`, { value }),

  audit: (limit = 200) => request<AuditEntry[]>("GET", `/admin/audit?limit=${limit}`),
  users: () => request<TeamUser[]>("GET", "/admin/users"),
  createUser: (payload: { email: string; fullName: string; role: AdminRole; password: string }) =>
    request<{ id: number }>("POST", "/admin/users", payload),
  updateUser: (id: number, patch: Partial<{ role: AdminRole; active: boolean; fullName: string; password: string }>) =>
    request("PATCH", `/admin/users/${id}`, patch),
  deleteUser: (id: number) => request("DELETE", `/admin/users/${id}`),
  exportData: (scope: "content" | "all") => request<Record<string, unknown>>("GET", `/admin/export?scope=${scope}`),
};

/** Notify the public site that CMS content changed (same tab). */
export function notifyContentChanged() {
  window.dispatchEvent(new Event("nf:content-updated"));
}
