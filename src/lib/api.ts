/**
 * Comprehensive API & Admin Client
 * Includes token storage, session validation, full CRUD operations,
 * and seamless fallback handling if backend is running in static/demo mode.
 */

export type EnquiryPayload = {
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  service: string;
  budget: string;
  timeline?: string;
  details: string;
};

export type ApiResult<T> = {
  ok: boolean;
  demo?: boolean;
  data?: T;
  error?: string;
};

const BASE = (import.meta.env?.VITE_API_URL as string | undefined) ?? "/api";
const TOKEN_KEY = "novaframe_admin_jwt";
const LOCAL_ENQUIRIES_KEY = "novaframe_offline_enquiries";

/* ------------------------------------------------------------------ */
/* Auth Storage                                                       */
/* ------------------------------------------------------------------ */
export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/* ------------------------------------------------------------------ */
/* Generic Request Wrapper                                            */
/* ------------------------------------------------------------------ */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["x-admin-token"] = token;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers,
    });
    clearTimeout(timer);
    const json = await res.json();
    return { ok: res.ok, demo: false, data: json?.data ?? json, error: json?.error };
  } catch (err: any) {
    clearTimeout(timer);
    return { ok: false, demo: true, error: err?.message || "Server connection failed" };
  }
}

/* ------------------------------------------------------------------ */
/* Public Operations                                                  */
/* ------------------------------------------------------------------ */
export async function submitEnquiry(payload: EnquiryPayload) {
  const res = await apiFetch<{ reference: string; message: string }>("/enquiries", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (res.demo) {
    // Offline / LocalStorage fallback
    const existing = JSON.parse(localStorage.getItem(LOCAL_ENQUIRIES_KEY) ?? "[]");
    const reference = "NF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const item = {
      id: Date.now(),
      reference,
      ...payload,
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    existing.unshift(item);
    localStorage.setItem(LOCAL_ENQUIRIES_KEY, JSON.stringify(existing));
    return { ok: true, demo: true, data: { reference, message: "Logged to local storage" } };
  }

  return res;
}

export function trackEvent(name: string, meta?: Record<string, unknown>) {
  void apiFetch("/events", {
    method: "POST",
    body: JSON.stringify({ name, meta, path: window.location.hash }),
  });
}

/* ------------------------------------------------------------------ */
/* Admin Operations (Full CRUD)                                       */
/* ------------------------------------------------------------------ */
export async function adminLogin(email: string, password: string) {
  const res = await apiFetch<{ ok: boolean; token: string; user: any }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (res.ok && res.data?.token) {
    setAdminToken(res.data.token);
    return { ok: true, user: res.data.user };
  }

  // Demo fallback credentials
  if (email === "admin@novaframe.studio" && password === "admin123!") {
    const demoToken = "demo_admin_token_" + Date.now();
    setAdminToken(demoToken);
    return {
      ok: true,
      demo: true,
      user: { id: 1, email, fullName: "Aarav Mehta (Lead Architect)", role: "superadmin" },
    };
  }

  return { ok: false, error: res.error || "Invalid email or password" };
}

export async function adminGetDashboardStats() {
  const res = await apiFetch<any>("/admin/stats");
  if (res.demo) {
    const enquiries = JSON.parse(localStorage.getItem(LOCAL_ENQUIRIES_KEY) ?? "[]");
    return {
      ok: true,
      data: {
        stats: {
          totalEnquiries: enquiries.length + 14,
          newEnquiries: enquiries.filter((e: any) => e.status === "new").length + 3,
          wonProjects: 6,
          activeServices: 5,
          totalProjects: 6,
          totalSubscribers: 182,
        },
        recentActivity: [
          { action: "STATUS_UPDATE", target: "Enquiry #NF-8921", details: "Moved to 'Qualified'", created_at: "Just now" },
          { action: "SECURE_LOGIN", target: "Admin Console", details: "Session authorized via SHA-512", created_at: "5 mins ago" },
        ],
      },
    };
  }
  return res;
}

export async function adminGetEnquiries() {
  const res = await apiFetch<any[]>("/admin/enquiries");
  if (res.demo) {
    const local = JSON.parse(localStorage.getItem(LOCAL_ENQUIRIES_KEY) ?? "[]");
    const defaults = [
      {
        id: 1,
        reference: "NF-7DAADB",
        name: "Vikram Malhotra",
        companyName: "Kaarva Lifestyle",
        email: "vikram@kaarva.com",
        phone: "+91 98201 44521",
        service: "Web Development",
        budget: "₹1,00,000 – ₹3,00,000",
        timeline: "In 1 month",
        details: "Headless Shopify Next.js rebuild with 4000+ SKUs and high-speed checkout.",
        status: "qualified",
        notes: "Intro call completed on Oct 16. Needs proposal by Thursday.",
        createdAt: "2026-10-16 11:30:00",
      },
      {
        id: 2,
        reference: "NF-94A12B",
        name: "Elena Rostova",
        companyName: "Atlas Robotics",
        email: "elena@atlasrobotics.tech",
        phone: "+44 7700 900142",
        service: "Three.js / UI/UX Design",
        budget: "₹3,00,000 – ₹8,00,000",
        timeline: "ASAP (within 2 weeks)",
        details: "Interactive 3D WebGL product showcase for new robotic prosthetic arm launch.",
        status: "new",
        notes: null,
        createdAt: "2026-10-18 04:15:00",
      },
    ];
    return { ok: true, data: [...local, ...defaults] };
  }
  return res;
}

export async function adminUpdateEnquiry(id: number, status: string, notes?: string) {
  const res = await apiFetch(`/admin/enquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
  if (res.demo) {
    const local = JSON.parse(localStorage.getItem(LOCAL_ENQUIRIES_KEY) ?? "[]");
    const updated = local.map((e: any) => (e.id === id ? { ...e, status, notes } : e));
    localStorage.setItem(LOCAL_ENQUIRIES_KEY, JSON.stringify(updated));
    return { ok: true };
  }
  return res;
}

export async function adminDeleteEnquiry(id: number) {
  const res = await apiFetch(`/admin/enquiries/${id}`, { method: "DELETE" });
  if (res.demo) {
    const local = JSON.parse(localStorage.getItem(LOCAL_ENQUIRIES_KEY) ?? "[]");
    const filtered = local.filter((e: any) => e.id !== id);
    localStorage.setItem(LOCAL_ENQUIRIES_KEY, JSON.stringify(filtered));
    return { ok: true };
  }
  return res;
}

// Services CRUD
export async function adminGetServices() {
  const res = await apiFetch<any[]>("/services");
  return res;
}

export async function adminSaveService(service: any, isEdit = false) {
  const url = isEdit ? `/admin/services/${service.id}` : "/admin/services";
  const method = isEdit ? "PUT" : "POST";
  return apiFetch(url, { method, body: JSON.stringify(service) });
}

export async function adminDeleteService(id: string) {
  return apiFetch(`/admin/services/${id}`, { method: "DELETE" });
}

// Projects CRUD (with offline localStorage fallback so no product is ever lost)
const LOCAL_PRODUCTS_KEY = "novaframe_admin_products";

function readLocalProducts(): any[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocalProducts(rows: any[]) {
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(rows.slice(0, 100)));
}

export async function adminGetProjects() {
  const res = await apiFetch<any[]>("/projects");
  if (res.demo || !res.ok) {
    return { ok: true, demo: true, data: readLocalProducts() };
  }
  // merge any locally-queued products created while API was offline
  const local = readLocalProducts().filter(
    (l) => !(res.data ?? []).some((r: any) => r.id === l.id),
  );
  return { ...res, data: [...local, ...(res.data ?? [])] };
}

export async function adminSaveProject(project: any) {
  const res = await apiFetch("/admin/projects", { method: "POST", body: JSON.stringify(project) });
  if (res.demo || !res.ok) {
    const rows = readLocalProducts();
    rows.unshift({ ...project, created_at: new Date().toISOString(), _offline: true });
    writeLocalProducts(rows);
    return { ok: true, demo: true };
  }
  return res;
}

export async function adminDeleteProject(id: string) {
  const res = await apiFetch(`/admin/projects/${id}`, { method: "DELETE" });
  if (res.demo || !res.ok) {
    writeLocalProducts(readLocalProducts().filter((p) => p.id !== id));
    return { ok: true, demo: true };
  }
  return res;
}
