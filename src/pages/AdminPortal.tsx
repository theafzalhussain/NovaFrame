import { useState, useEffect } from "react";
import {
  adminLogin,
  adminGetDashboardStats,
  adminGetEnquiries,
  adminUpdateEnquiry,
  adminDeleteEnquiry,
  adminGetServices,
  adminSaveService,
  adminDeleteService,
  adminGetProjects,
  adminSaveProject,
  adminDeleteProject,
  getAdminToken,
  removeAdminToken,
} from "../lib/api";
import { Icon } from "../components/Icons";
import { Eyebrow, PrimaryButton, GhostButton, Glow } from "../components/ui";
import ProductForm, { type ProductPayload } from "../components/admin/ProductForm";

type Tab = "overview" | "enquiries" | "services" | "projects" | "security";

export default function AdminPortal() {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Login form state
  const [email, setEmail] = useState("admin@novaframe.studio");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard Data State
  const [stats, setStats] = useState<any>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [, setLoading] = useState(false);
  const [notification, setNotification] = useState("");

  // Modals & Forms
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [newServiceModal, setNewServiceModal] = useState(false);
  const [newProjectModal, setNewProjectModal] = useState(false);

  // New Service Form
  const [serviceForm, setServiceForm] = useState({
    id: "",
    title: "",
    category: "Engineering",
    tagline: "",
    short_desc: "",
    deliverable: "",
  });

  const [publishing, setPublishing] = useState(false);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const res = await adminLogin(email, password);
    setLoginLoading(false);

    if (res.ok) {
      setToken(getAdminToken());
      showToast("Access Granted — Welcome, Administrator.");
    } else {
      setLoginError(res.error || "Invalid administrator credentials");
    }
  };

  const handleLogout = () => {
    removeAdminToken();
    setToken(null);
    showToast("Session terminated.");
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sRes, eRes, srvRes, prRes] = await Promise.all([
        adminGetDashboardStats(),
        adminGetEnquiries(),
        adminGetServices(),
        adminGetProjects(),
      ]);

      if (sRes.ok) setStats(sRes.data?.stats);
      if (eRes.ok) setEnquiries(eRes.data || []);
      if (srvRes.ok) setServicesList(srvRes.data || []);
      if (prRes.ok) setProjectsList(prRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Enquiry status change handler
  const handleUpdateStatus = async (id: number, newStatus: string, notes?: string) => {
    const res = await adminUpdateEnquiry(id, newStatus, notes);
    if (res.ok) {
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: newStatus, notes: notes ?? e.notes } : e))
      );
      showToast(`Enquiry #${id} updated to ${newStatus}`);
      if (selectedEnquiry && selectedEnquiry.id === id) {
        setSelectedEnquiry((prev: any) => ({ ...prev, status: newStatus, notes: notes ?? prev.notes }));
      }
    }
  };

  const handleDeleteEnquiry = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this enquiry?")) return;
    const res = await adminDeleteEnquiry(id);
    if (res.ok) {
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      if (selectedEnquiry?.id === id) setSelectedEnquiry(null);
      showToast("Enquiry deleted from database.");
    }
  };

  // Add Service Handler
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.id || !serviceForm.title) return;
    const res = await adminSaveService(serviceForm, false);
    if (res.ok) {
      setServicesList((prev) => [...prev, { ...serviceForm, active: 1 }]);
      setNewServiceModal(false);
      setServiceForm({ id: "", title: "", category: "Engineering", tagline: "", short_desc: "", deliverable: "" });
      showToast("Service added to SQL database.");
    }
  };

  // Delete Service Handler
  const handleDeleteService = async (id: string) => {
    if (!confirm(`Delete service '${id}'? This will remove it from the live site.`)) return;
    const res = await adminDeleteService(id);
    if (res.ok) {
      setServicesList((prev) => prev.filter((s) => s.id !== id));
      showToast(`Service '${id}' deleted.`);
    }
  };

  // Publish Product Handler (wired to the enterprise ProductForm wizard)
  const handlePublishProduct = async (payload: ProductPayload) => {
    setPublishing(true);
    const res = await adminSaveProject({
      ...payload,
      metrics_json: JSON.stringify(payload.metrics_json),
      featured: payload.featured ? 1 : 0,
    });
    setPublishing(false);
    if (res.ok) {
      setProjectsList((prev) => [
        { ...payload, tech_stack: payload.tech_stack, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setNewProjectModal(false);
      showToast(
        res.demo
          ? `Product "${payload.title}" queued locally (API offline) — will sync on reconnect.`
          : `Product "${payload.title}" published to the live website! 🚀`,
      );
    }
  };

  // Delete Project Handler
  const handleDeleteProject = async (id: string) => {
    if (!confirm(`Delete project '${id}'?`)) return;
    const res = await adminDeleteProject(id);
    if (res.ok) {
      setProjectsList((prev) => prev.filter((p) => p.id !== id));
      showToast(`Project '${id}' removed.`);
    }
  };

  /* ------------------------------------------------------------------ */
  /* If not authenticated: High-Security Login Screen                   */
  /* ------------------------------------------------------------------ */
  if (!token) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#030408] overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-40 pointer-events-none" />
        <Glow className="-top-32 left-1/2 h-[450px] w-[600px] -translate-x-1/2" color="rgba(99,102,241,0.25)" />
        <Glow className="bottom-0 right-0 h-80 w-80" color="rgba(6,182,212,0.15)" />

        <div className="relative w-full max-w-md">
          <div className="glass-card grad-border rounded-[32px] p-8 sm:p-10 shadow-2xl border border-white/10 backdrop-blur-2xl">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-aqua-500 text-white shadow-lg">
                <Icon name="shield" className="h-7 w-7" />
              </div>
              <Eyebrow tone="brand">Restricted Studio Console</Eyebrow>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                Novaframe Admin
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                SECURE AUTHENTICATION · SHA-512 PASSWORD HASHING
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {loginError}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  ADMINISTRATOR EMAIL
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@novaframe.studio"
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 font-mono">
                    MASTER PASSWORD
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">Default: admin123!</span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <div className="pt-2">
                <PrimaryButton type="submit" className="w-full">
                  {loginLoading ? "Authorizing Token..." : "Access Control Center"}
                </PrimaryButton>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-white/8 text-center">
              <span className="text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                SQLite WAL DB Active · RBAC Superadmin
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Main Authenticated Admin Portal                                    */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-[#04050b] text-slate-200">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-[99999] rounded-2xl border border-aqua-400/40 bg-[#0d122b] px-5 py-3 text-sm text-aqua-300 shadow-2xl flex items-center gap-2 animate-fadeIn">
          <span className="h-2 w-2 rounded-full bg-aqua-400 animate-pulse" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Admin Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070914]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-aqua-500 flex items-center justify-center font-display font-extrabold text-white text-base">
              N
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-white text-sm tracking-tight">
                  Novaframe
                </span>
                <span className="rounded bg-brand-500/20 border border-brand-400/30 px-1.5 py-0.2 text-[9px] font-mono text-brand-300 uppercase">
                  Studio Root
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">Database & CMS Console</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition"
            >
              <span>View Live Website</span>
              <span className="text-[10px]">↗</span>
            </a>

            <button
              onClick={handleLogout}
              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
            >
              Terminate Session
            </button>
          </div>
        </div>
      </header>

      {/* Admin Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4 mb-8">
          {[
            { key: "overview", label: "Dashboard Overview", count: null },
            { key: "enquiries", label: "Enquiries & Calls", count: enquiries.length },
            { key: "services", label: "Manage Services", count: servicesList.length },
            { key: "projects", label: "Portfolio Works", count: projectsList.length },
            { key: "security", label: "Security & Database", count: null },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === tab.key
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                  : "bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/8"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================== */}
        {/* TAB 1: OVERVIEW METRICS                                      */}
        {/* ========================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <span className="text-xs font-mono uppercase text-slate-400">Total Client Leads</span>
                <div className="text-3xl font-extrabold text-white mt-2">
                  {stats?.totalEnquiries ?? enquiries.length}
                </div>
                <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <span>●</span> Database synced
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <span className="text-xs font-mono uppercase text-slate-400">New Actions Needed</span>
                <div className="text-3xl font-extrabold text-brand-300 mt-2">
                  {enquiries.filter((e) => e.status === "new").length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Requires follow-up</div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <span className="text-xs font-mono uppercase text-slate-400">Published Services</span>
                <div className="text-3xl font-extrabold text-aqua-300 mt-2">
                  {servicesList.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Live in catalogue</div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <span className="text-xs font-mono uppercase text-slate-400">Published Works</span>
                <div className="text-3xl font-extrabold text-lime-glow mt-2">
                  {projectsList.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Case studies live</div>
              </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/8">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-display text-base font-bold text-white">
                    Recent Inquiries & Discovery Bookings
                  </h3>
                  <button
                    onClick={() => setActiveTab("enquiries")}
                    className="text-xs text-brand-300 hover:underline"
                  >
                    View All ({enquiries.length}) →
                  </button>
                </div>

                <div className="space-y-3">
                  {enquiries.slice(0, 4).map((enq) => (
                    <div
                      key={enq.id}
                      onClick={() => {
                        setSelectedEnquiry(enq);
                        setActiveTab("enquiries");
                      }}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/6 hover:border-brand-400/40 hover:bg-white/[0.04] transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{enq.name}</span>
                          <span className="font-mono text-xs text-slate-400">({enq.email})</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <span className="text-aqua-300">{enq.service}</span>
                          <span>·</span>
                          <span className="font-mono text-slate-400">{enq.budget}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                            enq.status === "new"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : enq.status === "qualified"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                          }`}
                        >
                          {enq.status}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          Ref: {enq.reference}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="glass-card rounded-3xl p-6 border border-white/8 space-y-4">
                <h3 className="font-display text-base font-bold text-white">Database Shortcuts</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Manage the public website directly from this control panel. Changes take effect immediately.
                </p>

                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => {
                      setActiveTab("services");
                      setNewServiceModal(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-xs font-semibold text-white flex items-center justify-between transition"
                  >
                    <span>+ Add New Service Category</span>
                    <span>→</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("projects");
                      setNewProjectModal(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-xs font-semibold text-white flex items-center justify-between transition"
                  >
                    <span>+ Add New Product (Wizard)</span>
                    <span>→</span>
                  </button>

                  <button
                    onClick={loadData}
                    className="w-full py-2.5 px-4 rounded-xl border border-aqua-400/30 bg-aqua-500/10 hover:bg-aqua-500/20 text-xs font-semibold text-aqua-300 flex items-center justify-between transition"
                  >
                    <span>↻ Refresh SQLite WAL Sync</span>
                    <span>SQL</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: ENQUIRIES & CALL LEADS (FULL CRUD)                  */}
        {/* ========================================================== */}
        {activeTab === "enquiries" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Client Inquiries & Booked Calls
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full leads received through the Contact Form and 30-Min Discovery Scheduler.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadData}
                  className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300 hover:text-white"
                >
                  Reload Table
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Enquiries List Table */}
              <div className="lg:col-span-2 glass-card rounded-3xl p-5 border border-white/8 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 font-mono text-[10px] text-slate-400 uppercase">
                      <th className="pb-3 pl-2">Lead / Email</th>
                      <th className="pb-3">Service</th>
                      <th className="pb-3">Budget</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {enquiries.map((enq) => (
                      <tr
                        key={enq.id}
                        onClick={() => setSelectedEnquiry(enq)}
                        className={`hover:bg-white/[0.04] transition cursor-pointer ${
                          selectedEnquiry?.id === enq.id ? "bg-white/[0.06]" : ""
                        }`}
                      >
                        <td className="py-3.5 pl-2">
                          <div className="font-bold text-white">{enq.name}</div>
                          <div className="text-[11px] text-slate-400">{enq.email}</div>
                          {enq.companyName && (
                            <div className="text-[10px] text-slate-500 font-mono">{enq.companyName}</div>
                          )}
                        </td>
                        <td className="py-3.5 text-aqua-300 font-medium">{enq.service}</td>
                        <td className="py-3.5 font-mono text-slate-300">{enq.budget}</td>
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${
                              enq.status === "new"
                                ? "bg-rose-500/20 text-rose-300"
                                : enq.status === "won"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-brand-500/20 text-brand-300"
                            }`}
                          >
                            {enq.status}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 text-right space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEnquiry(enq.id);
                            }}
                            className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded bg-rose-500/10"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detail View Panel */}
              <div className="glass-card rounded-3xl p-6 border border-white/8 space-y-5">
                {selectedEnquiry ? (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 uppercase">
                          Reference: {selectedEnquiry.reference}
                        </span>
                        <h3 className="font-display text-lg font-bold text-white mt-1">
                          {selectedEnquiry.name}
                        </h3>
                        <p className="text-xs text-brand-300">{selectedEnquiry.email}</p>
                        {selectedEnquiry.phone && (
                          <p className="text-xs text-slate-400">{selectedEnquiry.phone}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {selectedEnquiry.createdAt}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/6">
                        <span className="text-slate-400 font-mono uppercase text-[10px]">
                          Target Timeline & Budget
                        </span>
                        <div className="font-semibold text-white mt-0.5">
                          {selectedEnquiry.budget} · {selectedEnquiry.timeline || "N/A"}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/6">
                        <span className="text-slate-400 font-mono uppercase text-[10px]">
                          Project Scope & Details
                        </span>
                        <p className="text-slate-300 mt-1.5 whitespace-pre-line leading-relaxed font-sans">
                          {selectedEnquiry.details || selectedEnquiry.project_details}
                        </p>
                      </div>

                      {/* Status Selector */}
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">
                          Update Pipeline Status
                        </label>
                        <select
                          value={selectedEnquiry.status}
                          onChange={(e) => handleUpdateStatus(selectedEnquiry.id, e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#0d1024] p-2.5 text-xs text-white focus:border-brand-400 focus:outline-none"
                        >
                          <option value="new">New (Needs Initial Triage)</option>
                          <option value="contacted">Contacted (Email Sent)</option>
                          <option value="qualified">Qualified (Discovery Held)</option>
                          <option value="proposal">Proposal (Scope Prepared)</option>
                          <option value="won">Won (Contract Signed)</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      {/* Internal Notes */}
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">
                          Internal Notes
                        </label>
                        <textarea
                          rows={3}
                          defaultValue={selectedEnquiry.notes || ""}
                          onBlur={(e) =>
                            handleUpdateStatus(selectedEnquiry.id, selectedEnquiry.status, e.target.value)
                          }
                          placeholder="Add team notes (auto-saves on blur)..."
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    Select any client enquiry from the left to view project details, add notes, or change pipeline status.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: SERVICES MANAGEMENT (FULL CRUD)                     */}
        {/* ========================================================== */}
        {activeTab === "services" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Service Capabilities</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update, add or remove services shown across the capabilities menu and pages.
                </p>
              </div>
              <PrimaryButton onClick={() => setNewServiceModal(true)}>+ Add New Service</PrimaryButton>
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {servicesList.map((srv) => (
                <div key={srv.id} className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-aqua-400 uppercase tracking-widest">
                        {srv.category}
                      </span>
                      <h3 className="font-display text-base font-bold text-white mt-1">
                        {srv.title}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-500">/{srv.id}</span>
                  </div>

                  <p className="text-xs text-brand-300 font-medium">{srv.tagline}</p>
                  <p className="text-xs text-slate-400 line-clamp-2">{srv.short_desc || srv.short}</p>

                  <div className="pt-3 border-t border-white/8 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Status: <span className="text-emerald-400">Active</span>
                    </span>
                    <button
                      onClick={() => handleDeleteService(srv.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal to Add Service */}
            {newServiceModal && (
              <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="w-full max-w-lg glass-card rounded-3xl p-6 border border-white/15 bg-[#090c1f] space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display text-lg font-bold text-white">Add New Service</h3>
                    <button
                      onClick={() => setNewServiceModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateService} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-mono mb-1">SERVICE ID (SLUG)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ai-integration"
                        value={serviceForm.id}
                        onChange={(e) => setServiceForm({ ...serviceForm, id: e.target.value.toLowerCase().trim() })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-mono mb-1">SERVICE TITLE</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AI & Machine Learning Integration"
                        value={serviceForm.title}
                        onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-mono mb-1">CATEGORY</label>
                      <select
                        value={serviceForm.category}
                        onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#0d1024] p-2.5 text-white"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="Design">Design</option>
                        <option value="Growth">Growth</option>
                        <option value="Creative">Creative</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-mono mb-1">TAGLINE</label>
                      <input
                        type="text"
                        placeholder="e.g. Enterprise LLMs and Automated Pipelines"
                        value={serviceForm.tagline}
                        onChange={(e) => setServiceForm({ ...serviceForm, tagline: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-mono mb-1">SHORT DESCRIPTION</label>
                      <textarea
                        rows={2}
                        placeholder="Brief summary shown on cards..."
                        value={serviceForm.short_desc}
                        onChange={(e) => setServiceForm({ ...serviceForm, short_desc: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <GhostButton onClick={() => setNewServiceModal(false)}>Cancel</GhostButton>
                      <PrimaryButton type="submit">Save to Database</PrimaryButton>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: PROJECTS / CASE STUDIES (FULL CRUD)                 */}
        {/* ========================================================== */}
        {activeTab === "projects" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Portfolio Products & Case Studies</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Publish products with the guided 4-step wizard — metrics, features, tech stack and live preview included.
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={loadData}
                  className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300 hover:text-white transition"
                >
                  ↻ Sync
                </button>
                <PrimaryButton onClick={() => setNewProjectModal(true)}>+ Add Product</PrimaryButton>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projectsList.map((prj) => (
                <div key={prj.id} className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-brand-300 uppercase">
                        {prj.client} · {prj.year}
                      </span>
                      <h3 className="font-display text-base font-bold text-white mt-1">{prj.title}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-400">
                      {prj.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">{prj.summary}</p>
                  <div className="text-[11px] font-mono text-slate-500 truncate">{prj.tech_stack || (prj.stack && prj.stack.join(", "))}</div>

                  <div className="pt-3 border-t border-white/8 flex items-center justify-between text-xs">
                    <a
                      href={`#/work/${prj.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-aqua-300 hover:underline"
                    >
                      View Live Case Study ↗
                    </a>
                    <button
                      onClick={() => handleDeleteProject(prj.id)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Enterprise Product Publisher (4-step wizard) */}
            <ProductForm
              isOpen={newProjectModal}
              onClose={() => setNewProjectModal(false)}
              onPublish={handlePublishProduct}
              saving={publishing}
            />
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 5: SECURITY & DATABASE ENGINE                          */}
        {/* ========================================================== */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="font-display text-xl font-bold text-white">Database & Security Posture</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl p-6 border border-white/8 space-y-4">
                <h3 className="font-display font-bold text-white text-base">Backend & DB Status</h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-white/6">
                    <span className="text-slate-400">Database Engine</span>
                    <span className="text-emerald-400">SQLite (WAL Mode)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/6">
                    <span className="text-slate-400">Alternative Adapter</span>
                    <span className="text-aqua-300">PHP 8 + MySQL PDO Active</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/6">
                    <span className="text-slate-400">Password Encryption</span>
                    <span className="text-brand-300">PBKDF2 with SHA-512 (100k rounds)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Access Control</span>
                    <span className="text-white">Role-Based (superadmin)</span>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/8 space-y-4">
                <h3 className="font-display font-bold text-white text-base">Security Audit Instructions</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The admin portal URL is hidden from public view. Keep your credentials private:
                </p>
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-300 space-y-1">
                  <div>Access URL: <span className="text-aqua-300">#/admin</span> (or /portal)</div>
                  <div>Default Superadmin: <span className="text-brand-300">admin@novaframe.studio</span></div>
                  <div>Default Secret: <span className="text-brand-300">admin123!</span></div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Password changes can be made directly in the database or via the user manager.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
