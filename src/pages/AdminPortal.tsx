import { useCallback, useEffect, useState } from "react";
import { BrandMark, Seal } from "../components/Brand";
import { Icon } from "../components/Icons";
import { ConfirmProvider, LoadingBlock, Spinner, ToastProvider, useToast } from "../components/admin/AdminUI";
import Analytics from "../components/admin/Analytics";
import Bookings from "../components/admin/Bookings";
import CollectionManager from "../components/admin/CollectionManager";
import Dashboard from "../components/admin/Dashboard";
import Leads from "../components/admin/Leads";
import { ActivityLog, SecurityPanel } from "../components/admin/Security";
import { AdvancedPanel, SiteSettingsPanel } from "../components/admin/SettingsPanel";
import Subscribers from "../components/admin/Subscribers";
import { CONTENT_NAV, schemas } from "../components/admin/schemas";
import type { AdminRole, CollectionName } from "../data/types";
import { admin, api, clearAdminToken, getAdminToken, isDemoSession, type AdminUser } from "../lib/api";
import { useContent } from "../lib/content";
import { useRouter } from "../lib/router";
import { cn } from "../utils/cn";

type Section = "dashboard" | "analytics" | "leads" | "bookings" | "subscribers" | "content" | "settings" | "advanced" | "security" | "activity";

const RANK: Record<AdminRole, number> = { editor: 1, admin: 2, owner: 3 };
const SECTION_ROLE: Record<Section, AdminRole> = {
  dashboard: "admin",
  analytics: "admin",
  leads: "admin",
  bookings: "admin",
  subscribers: "admin",
  content: "editor",
  settings: "admin",
  advanced: "admin",
  security: "editor",
  activity: "admin",
};

/* ------------------------------------------------------------------ */
/* Login                                                              */
/* ------------------------------------------------------------------ */
function Login({ onAuthed }: { onAuthed: (u: AdminUser) => void }) {
  const { settings } = useContent();
  const [apiState, setApiState] = useState<"checking" | "live" | "offline">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    setApiState("checking");
    const res = await api.health();
    setApiState(res.ok ? "live" : "offline");
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    const res = await admin.login(email.trim(), password);
    setBusy(false);
    if (res.ok && res.data) onAuthed(res.data.user);
    else {
      setError(res.offline ? "Can't reach the API server. Start it with `npm run server`, or explore the demo workspace." : res.error ?? "Sign-in failed.");
      if (res.offline) setApiState("offline");
    }
  };

  return (
    <div className="relative grid min-h-screen bg-ink-950 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="nf-backdrop" aria-hidden>
        <div className="nf-glow nf-glow-a" />
        <div className="nf-grain" />
      </div>

      <aside className="relative hidden overflow-hidden border-r border-gold-300/10 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="grid-lines absolute inset-0 opacity-70" aria-hidden />
        <div className="relative flex items-center gap-3">
          <BrandMark size={40} />
          <div>
            <p className="display text-[1.2rem] leading-none">{settings.short}</p>
            <p className="mt-1 font-mono text-[9px] tracking-[0.4em] text-mist uppercase">Console</p>
          </div>
        </div>
        <div className="relative">
          <Seal size={150} />
          <h1 className="display mt-10 text-[3.2rem] leading-[1.02]">
            Run the studio <br />
            <span className="serif-accent text-gold">from one place.</span>
          </h1>
          <ul className="mt-10 grid max-w-md grid-cols-2 gap-4 text-[13.5px] text-sand">
            {[
              ["inbox", "Leads CRM & pipeline"],
              ["calendar", "Call bookings"],
              ["layers", "Every website section"],
              ["chart", "First-party analytics"],
              ["users", "Team roles & audit log"],
              ["download", "Exports & backups"],
            ].map(([icon, label]) => (
              <li key={label} className="flex items-center gap-2.5">
                <Icon name={icon} className="h-4 w-4 text-gold-300" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12px] text-smoke">PBKDF2-SHA512 password hashing · hashed, expiring sessions · role-based access</p>
      </aside>

      <main className="relative flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandMark size={38} />
            <p className="display text-[1.2rem]">{settings.short} Console</p>
          </div>
          <p className="eyebrow">Secure sign-in</p>
          <h2 className="display mt-5 text-[2.5rem] leading-tight">Welcome back.</h2>
          <p className="mt-2 text-[14px] text-mist">Sign in to manage leads, content and settings.</p>

          <div className={cn("mt-7 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[12.5px]", apiState === "offline" ? "border-ember/40 bg-ember/10 text-parchment" : "border-gold-300/12 bg-ink-900/70 text-sand")}>
            {apiState === "checking" ? <Spinner className="h-3.5 w-3.5" /> : <span className={cn("h-2 w-2 rounded-full", apiState === "live" ? "bg-sage animate-pulse-dot" : "bg-ember")} />}
            {apiState === "checking" ? "Checking the API…" : apiState === "live" ? "Connected to the live database" : "API server unreachable"}
            {apiState === "offline" ? (
              <button type="button" onClick={check} className="ml-auto font-semibold text-gold-200">
                Retry
              </button>
            ) : null}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="a-email" className="field-label">
                Email
              </label>
              <input id="a-email" type="email" autoComplete="username" required className="field mt-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <label htmlFor="a-pass" className="field-label">
                Password
              </label>
              <div className="relative mt-2">
                <input id="a-pass" type={show ? "text" : "password"} autoComplete="current-password" required className="field pr-12" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-3 -translate-y-1/2 text-smoke hover:text-gold-200" aria-label={show ? "Hide password" : "Show password"}>
                  <Icon name={show ? "eye-off" : "eye"} className="h-4 w-4" />
                </button>
              </div>
            </div>
            {error ? (
              <p className="rounded-xl border border-ember/40 bg-ember/10 px-4 py-3 text-[13px] text-parchment" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy || apiState === "offline"} className="btn btn-gold btn-lg shine w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {apiState === "offline" ? (
            <div className="lux-card mt-6 p-5">
              <p className="text-[14px] font-semibold text-ivory">Explore the demo workspace</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-mist">
                The full console, running on this browser's storage. Edits preview on this device only — connect the API to go live.
              </p>
              <button
                type="button"
                className="btn btn-line btn-sm mt-4"
                onClick={() => {
                  admin.enterDemo();
                  onAuthed({ id: 0, email: "demo@local", fullName: "Demo workspace", role: "owner" });
                }}
              >
                <Icon name="wand" className="h-4 w-4" /> Open demo workspace
              </button>
            </div>
          ) : null}

          <p className="mt-10 text-center text-[12px] text-smoke">
            <a href="#/" className="hover:text-gold-200">
              ← Back to {settings.short}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Console                                                            */
/* ------------------------------------------------------------------ */
function Console({ user, onLogout }: { user: AdminUser; onLogout: () => void }) {
  const { query, navigate } = useRouter();
  const { settings } = useContent();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [newLeads, setNewLeads] = useState(0);
  const demo = isDemoSession();
  const role = user.role;
  const can = (s: Section) => RANK[role] >= RANK[SECTION_ROLE[s]];

  const requested = (query.get("s") as Section | null) ?? (can("dashboard") ? "dashboard" : "content");
  const section: Section = SECTION_ROLE[requested] && can(requested) ? requested : can("dashboard") ? "dashboard" : "content";
  const collection = (CONTENT_NAV.includes(query.get("c") as CollectionName) ? query.get("c") : "projects") as CollectionName;
  const focusId = Number(query.get("id")) || null;

  const go = useCallback(
    (s: string, extra?: string) => {
      const params = new URLSearchParams({ s });
      if (s === "content" && extra) params.set("c", extra);
      if (s === "leads" && extra) params.set("id", extra);
      navigate(`/admin?${params.toString()}`);
      setMenuOpen(false);
      window.scrollTo({ top: 0 });
    },
    [navigate],
  );

  useEffect(() => {
    if (!can("leads")) return;
    void admin.leads().then((res) => res.ok && setNewLeads((res.data ?? []).filter((l) => l.status === "new").length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    const expired = () => {
      toast("Your session expired — please sign in again.", "error");
      onLogout();
    };
    window.addEventListener("nf:auth-expired", expired);
    return () => window.removeEventListener("nf:auth-expired", expired);
  }, [onLogout, toast]);

  const groups: { title: string; items: { s: Section; c?: CollectionName; label: string; icon: string; badge?: number }[] }[] = [
    {
      title: "Overview",
      items: [
        { s: "dashboard", label: "Dashboard", icon: "home" },
        { s: "analytics", label: "Analytics", icon: "chart" },
      ],
    },
    {
      title: "Sales",
      items: [
        { s: "leads", label: "Leads", icon: "inbox", badge: newLeads },
        { s: "bookings", label: "Call bookings", icon: "calendar" },
        { s: "subscribers", label: "Subscribers", icon: "mail" },
      ],
    },
    {
      title: "Website content",
      items: CONTENT_NAV.map((c) => ({ s: "content" as Section, c, label: schemas[c].label, icon: schemas[c].icon })),
    },
    {
      title: "System",
      items: [
        { s: "settings", label: "Site settings", icon: "settings" },
        { s: "advanced", label: "Advanced", icon: "sliders" },
        { s: "security", label: "Security & team", icon: "lock" },
        { s: "activity", label: "Activity log", icon: "history" },
      ],
    },
  ];

  const title = section === "content" ? schemas[collection].label : groups.flatMap((g) => g.items).find((i) => i.s === section)?.label ?? "Dashboard";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <BrandMark size={36} />
        <div className="min-w-0">
          <p className="display truncate text-[1.1rem] leading-none">{settings.short}</p>
          <p className="mt-1 font-mono text-[9px] tracking-[0.4em] text-mist uppercase">Console</p>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Console">
        {groups.map((g) => {
          const items = g.items.filter((i) => can(i.s));
          if (!items.length) return null;
          return (
            <div key={g.title}>
              <p className="label px-3 pb-2 text-[9.5px]">{g.title}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = item.s === section && (item.s !== "content" || item.c === collection);
                  return (
                    <li key={`${item.s}-${item.c ?? ""}`}>
                      <button
                        type="button"
                        onClick={() => go(item.s, item.c)}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] transition",
                          active ? "bg-gold-400/12 font-semibold text-gold-100" : "text-sand hover:bg-gold-300/[0.05] hover:text-ivory",
                        )}
                      >
                        {active ? <span className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-gold-300" /> : null}
                        <Icon name={item.icon} className={cn("h-4 w-4 shrink-0", active ? "text-gold-300" : "text-smoke")} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge ? <span className="rounded-full bg-gold-400 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-950">{item.badge}</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-gold-300/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-ink-950/60 p-3">
          <span className="icon-tile h-10 w-10 shrink-0 rounded-full font-display text-[15px]">{user.fullName.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ivory">{user.fullName}</p>
            <p className="truncate text-[11.5px] text-smoke capitalize">{user.role}</p>
          </div>
          <button type="button" onClick={onLogout} className="btn btn-ghost btn-icon h-9 w-9" aria-label="Sign out" title="Sign out">
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950 text-sand">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-gold-300/10 bg-ink-900 lg:block">{sidebar}</aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink-950/80" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-[285px] border-r border-gold-300/10 bg-ink-900">{sidebar}</aside>
        </div>
      ) : null}

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-gold-300/10 bg-ink-950/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setMenuOpen(true)} className="btn btn-ghost btn-icon h-10 w-10 lg:hidden" aria-label="Open menu">
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <p className="truncate text-[14px] font-semibold text-ivory">{title}</p>
            <div className="ml-auto flex items-center gap-2">
              <span
                className={cn(
                  "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold sm:inline-flex",
                  demo ? "border-gold-300/40 bg-gold-400/10 text-gold-100" : "border-sage/40 bg-sage/10 text-[#dff3e6]",
                )}
                title={demo ? "Changes are saved in this browser only" : "Connected to the API and database"}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", demo ? "bg-gold-300" : "bg-sage animate-pulse-dot")} />
                {demo ? "Demo workspace" : "Live database"}
              </span>
              <a href="#/" target="_blank" rel="noreferrer" className="btn btn-line btn-sm">
                <Icon name="external" className="h-4 w-4" /> <span className="hidden sm:inline">View site</span>
              </a>
            </div>
          </div>
          {demo ? (
            <div className="border-t border-gold-300/10 bg-gold-400/[0.06] px-4 py-2 text-center text-[12px] text-gold-100 sm:px-6">
              Demo workspace — everything works, but data lives in this browser. Start the API (<span className="font-mono">npm run server</span>) and sign in to go live.
            </div>
          ) : null}
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {section === "dashboard" ? <Dashboard user={user} go={go} /> : null}
          {section === "analytics" ? <Analytics /> : null}
          {section === "leads" ? <Leads focusId={focusId} /> : null}
          {section === "bookings" ? <Bookings openLead={(id) => go("leads", String(id))} /> : null}
          {section === "subscribers" ? <Subscribers /> : null}
          {section === "content" ? <CollectionManager key={collection} name={collection} canReset={RANK[role] >= RANK.admin} /> : null}
          {section === "settings" ? <SiteSettingsPanel /> : null}
          {section === "advanced" ? <AdvancedPanel canEdit={RANK[role] >= RANK.admin} /> : null}
          {section === "security" ? <SecurityPanel user={user} /> : null}
          {section === "activity" ? <ActivityLog /> : null}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Entry                                                              */
/* ------------------------------------------------------------------ */
function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(() => Boolean(getAdminToken()));

  useEffect(() => {
    if (!getAdminToken()) return;
    void admin.me().then((res) => {
      if (res.ok && res.data) setUser(res.data.user);
      else if (!res.offline) clearAdminToken();
      setChecking(false);
    });
  }, []);

  const logout = useCallback(() => {
    void admin.logout();
    setUser(null);
  }, []);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950">
        <LoadingBlock label="Restoring your session…" />
      </div>
    );
  }
  if (!user) return <Login onAuthed={setUser} />;
  return <Console user={user} onLogout={logout} />;
}

export default function AdminPortal() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminApp />
      </ConfirmProvider>
    </ToastProvider>
  );
}
