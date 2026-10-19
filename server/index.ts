/**
 * Novaframe Studio — Production API Server with Secure Admin Controls
 * Includes:
 * - Public API: Enquiries, Booking, Newsletter, Catalogue
 * - Admin Auth: Secure Token Sessions with PBKDF2 Hashing
 * - Admin CRUD:
 *     - Enquiries: view, filter, update status, add notes, delete
 *     - Services: create, edit, toggle active, delete
 *     - Projects: add, update, delete
 *     - Subscribers: view, delete
 *     - Audit Logs & Security Metrics
 */

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import crypto from "node:crypto";
import { db, queries, verifyPassword } from "./db.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

/* ------------------------------------------------------------------ */
/* Auth Middleware & Helpers                                          */
/* ------------------------------------------------------------------ */
type AuthenticatedRequest = Request & {
  adminUser?: {
    id: number;
    email: string;
    full_name: string;
    role: string;
  };
};

function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : req.headers["x-admin-token"];

  if (!token || typeof token !== "string") {
    return res.status(401).json({ ok: false, error: "Authentication token missing or invalid." });
  }

  // Check database session
  try {
    const session = queries.getSession.get(token) as {
      user_id: number;
      email: string;
      full_name: string;
      role: string;
    } | undefined;

    if (!session) {
      return res.status(401).json({ ok: false, error: "Session expired or invalid. Please login again." });
    }

    req.adminUser = {
      id: session.user_id,
      email: session.email,
      full_name: session.full_name,
      role: session.role,
    };
    next();
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Database error verifying session" });
  }
}

/* ------------------------------------------------------------------ */
/* Public Health & Services                                           */
/* ------------------------------------------------------------------ */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "novaframe-api",
    database: "sqlite3",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/services", (_req, res) => {
  try {
    const all = queries.getAllServices.all();
    res.json({ ok: true, data: all });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/projects", (_req, res) => {
  try {
    const projs = queries.getAllProjects.all();
    res.json({ ok: true, data: projs });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/enquiries", (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.name || !b.email) {
      return res.status(422).json({ ok: false, error: "Name and email are required" });
    }

    const reference = "NF-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    queries.insertEnquiry.run({
      reference,
      name: String(b.name).slice(0, 120),
      companyName: String(b.companyName ?? "").slice(0, 160),
      email: String(b.email).slice(0, 160).toLowerCase(),
      phone: String(b.phone ?? "").slice(0, 40),
      service: String(b.service ?? "General Enquiry").slice(0, 80),
      budget: String(b.budget ?? "Not specified").slice(0, 80),
      timeline: String(b.timeline ?? "Immediate").slice(0, 80),
      details: String(b.details ?? "").slice(0, 4000),
      source: String(b.source ?? "website").slice(0, 60),
      ip: req.ip ?? "",
      userAgent: String(req.headers["user-agent"] ?? "").slice(0, 300),
    });

    res.status(201).json({
      ok: true,
      reference,
      message: "Enquiry successfully logged to database.",
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/subscribe", (req, res) => {
  try {
    const email = String(req.body?.email ?? "").toLowerCase().trim();
    if (!email || !email.includes("@")) {
      return res.status(422).json({ ok: false, error: "Valid email is required" });
    }
    db.prepare("INSERT OR IGNORE INTO subscribers (email) VALUES (?)").run(email);
    res.json({ ok: true, message: "Subscribed to updates" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Admin Auth Endpoints                                               */
/* ------------------------------------------------------------------ */
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email and password required" });
  }

  const user = queries.getAdminByEmail.get(String(email).toLowerCase().trim()) as any;
  if (!user) {
    return res.status(401).json({ ok: false, error: "Invalid credentials." });
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    return res.status(401).json({ ok: false, error: "Invalid credentials." });
  }

  // Create 30-day session
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  queries.createSession.run(token, user.id, req.ip ?? "", String(req.headers["user-agent"] ?? ""), expiresAt);
  queries.updateLastLogin.run(user.id);
  queries.logAudit.run(user.id, "LOGIN", "AUTH", "Successful admin login", req.ip ?? "");

  res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    },
  });
});

app.get("/api/admin/me", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  res.json({ ok: true, user: req.adminUser });
});

app.post("/api/admin/logout", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) queries.deleteSession.run(token);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Admin Dashboard & CRUD Operations                                  */
/* ------------------------------------------------------------------ */
app.get("/api/admin/stats", requireAdminAuth, (_req, res) => {
  try {
    const stats = queries.getDashboardStats.get();
    const audits = queries.getRecentAudits.all();
    res.json({ ok: true, stats, recentActivity: audits });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Enquiries CRUD
app.get("/api/admin/enquiries", requireAdminAuth, (_req, res) => {
  try {
    const rows = queries.getAllEnquiries.all();
    res.json({ ok: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.patch("/api/admin/enquiries/:id", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status, notes } = req.body ?? {};
    queries.updateEnquiryStatus.run(status, notes ?? null, id);
    queries.logAudit.run(req.adminUser?.id ?? 0, "UPDATE", `ENQUIRY_${id}`, `Status changed to ${status}`, req.ip ?? "");
    res.json({ ok: true, message: "Enquiry updated" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/admin/enquiries/:id", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    queries.deleteEnquiry.run(id);
    queries.logAudit.run(req.adminUser?.id ?? 0, "DELETE", `ENQUIRY_${id}`, "Deleted enquiry record", req.ip ?? "");
    res.json({ ok: true, message: "Enquiry deleted" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Services CRUD
app.post("/api/admin/services", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { id, title, category, tagline, short_desc, deliverable, sort_order } = req.body;
    queries.insertService.run(id, title, category, tagline ?? "", short_desc ?? "", deliverable ?? "", 1, sort_order ?? 0);
    queries.logAudit.run(req.adminUser?.id ?? 0, "CREATE", `SERVICE_${id}`, `Created service ${title}`, req.ip ?? "");
    res.status(201).json({ ok: true, message: "Service added successfully" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put("/api/admin/services/:id", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    const { title, category, tagline, short_desc, deliverable, active, sort_order } = req.body;
    queries.updateService.run(title, category, tagline, short_desc, deliverable, active ? 1 : 0, sort_order, id);
    queries.logAudit.run(req.adminUser?.id ?? 0, "UPDATE", `SERVICE_${id}`, `Updated service ${title}`, req.ip ?? "");
    res.json({ ok: true, message: "Service updated" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/admin/services/:id", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    queries.deleteService.run(id);
    queries.logAudit.run(req.adminUser?.id ?? 0, "DELETE", `SERVICE_${id}`, `Deleted service ${id}`, req.ip ?? "");
    res.json({ ok: true, message: "Service deleted" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Projects CRUD
app.post("/api/admin/projects", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { id, title, client, category, year, summary, problem, solution, tech_stack, metrics_json, featured, features, challenges, accent, live_url } = req.body;
    queries.insertProject.run(
      id,
      title,
      client,
      category,
      year,
      summary,
      problem ?? "",
      solution ?? "",
      tech_stack ?? "",
      typeof metrics_json === "string" ? metrics_json : JSON.stringify(metrics_json ?? []),
      featured ? 1 : 0,
      JSON.stringify(features ?? []),
      JSON.stringify(challenges ?? []),
      accent ?? "from-indigo-500/30 to-cyan-500/20",
      live_url ?? ""
    );
    queries.logAudit.run(req.adminUser?.id ?? 0, "CREATE", `PROJECT_${id}`, `Created project ${title}`, req.ip ?? "");
    res.status(201).json({ ok: true, message: "Project added successfully" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/admin/projects/:id", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    queries.deleteProject.run(id);
    queries.logAudit.run(req.adminUser?.id ?? 0, "DELETE", `PROJECT_${id}`, `Deleted project ${id}`, req.ip ?? "");
    res.json({ ok: true, message: "Project deleted" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Subscribers
app.get("/api/admin/subscribers", requireAdminAuth, (_req, res) => {
  try {
    const rows = queries.getAllSubscribers.all();
    res.json({ ok: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/admin/subscribers/:id", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    queries.deleteSubscriber.run(id);
    res.json({ ok: true, message: "Subscriber removed" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Novaframe Studio Production API ready at http://localhost:${PORT}`);
  console.log(`  Admin Dashboard backend connected via SQLite WAL engine.\n`);
});

export default app;
