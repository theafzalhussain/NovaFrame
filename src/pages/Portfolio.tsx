import { useEffect, useMemo, useState } from "react";
import ProjectCard from "../components/ProjectCard";
import ProjectVisual from "../components/ProjectVisual";
import { Icon } from "../components/Icons";
import {
  Eyebrow,
  GhostButton,
  Glow,
  PageHero,
  PrimaryButton,
  Reveal,
  SectionHeading,
} from "../components/ui";
import { projects as staticProjects, projectFilters, type Project } from "../data/content";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ */
/* Local Project Store (browser persistence)                          */
/* ------------------------------------------------------------------ */
const LOCAL_PROJECTS_KEY = "novaframe_custom_projects";

type StoredProject = Project & { id: string };

function getStoredProjects(): StoredProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredProjects(projects: StoredProject[]) {
  try {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    /* storage unavailable — ignore */
  }
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Web: "from-indigo-500/30 to-cyan-500/20",
  App: "from-emerald-500/25 to-cyan-500/20",
  Design: "from-sky-500/25 to-violet-500/20",
  Video: "from-violet-500/25 to-pink-500/20",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/* ------------------------------------------------------------------ */
/* Staggered grid item (scroll reveal per card)                       */
/* ------------------------------------------------------------------ */
function StaggerItem({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return <div className={cn("stagger-item", shown && "stagger-in", className)}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Add Product Modal                                                  */
/* ------------------------------------------------------------------ */
const emptyNewProject: Omit<Project, "id" | "year" | "category"> = {
  title: "",
  client: "",
  accent: "from-indigo-500/30 to-cyan-500/20",
  summary: "",
  problem: "",
  solution: "",
  role: "",
  stack: [],
  features: [],
  challenges: [],
  metrics: [],
};

function AddProductModal({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (p: Project) => void;
}) {
  const [form, setForm] = useState<Omit<Project, "id" | "year">>({ ...emptyNewProject, category: "Web" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Project>(key: K, value: Project[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  const parseList = (text: string): string[] =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.client.trim()) {
      setError("Please provide at least Project Title and Client Name.");
      return;
    }
    if (!form.summary.trim()) {
      setError("Please provide a short project summary.");
      return;
    }

    setSaving(true);
    const newProject: Project = {
      ...form,
      id: slugify(form.title) + "-" + Math.random().toString(36).slice(2, 6),
      year: String(new Date().getFullYear()),
      accent: CATEGORY_GRADIENTS[form.category] ?? "from-indigo-500/30 to-cyan-500/20",
      stack: parseList(form.stack.join("\n")),
      features: parseList(form.features.join("\n")),
      challenges: parseList(form.challenges.join("\n")),
      metrics: form.metrics.filter((m) => m.value && m.label),
    };

    const stored = getStoredProjects();
    stored.unshift(newProject);
    saveStoredProjects(stored);

    onPublish(newProject);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-ink-950/85 backdrop-blur-2xl p-4 sm:p-8">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-white/12 bg-[#080b18] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)]">
        <div className="flex items-start justify-between border-b border-white/8 p-6 sm:p-8">
          <div>
            <Eyebrow tone="brand">Content Management System</Eyebrow>
            <h2 className="font-display mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Add New Product / Case Study
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Fill in the project details below — it will appear instantly in the portfolio grid and its own
              dedicated case study page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Section 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-500/20 text-brand-300 text-[10px]">1</span>
              Basic Information
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Project Title <span className="text-brand-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Finstream Trading Engine"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Client Name <span className="text-brand-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.client}
                  onChange={(e) => set("client", e.target.value)}
                  placeholder="e.g. Finstream Labs"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value as Project["category"])}
                  className="w-full rounded-xl border border-white/10 bg-[#0d1024] px-4 py-3 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  <option value="Web">Web</option>
                  <option value="App">App</option>
                  <option value="Design">Design</option>
                  <option value="Video">Video</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Our Role</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => set("role", e.target.value)}
                  placeholder="e.g. Full-stack build, UX research, DevOps"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Short Summary <span className="text-brand-400">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="One or two sentences describing the project for portfolio cards..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
              />
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-500/20 text-brand-300 text-[10px]">2</span>
              Problem &amp; Solution
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-rose-300 mb-1.5">The Problem</label>
                <textarea
                  rows={3}
                  value={form.problem}
                  onChange={(e) => set("problem", e.target.value)}
                  placeholder="What challenge was the client facing before us?"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-300 mb-1.5">Our Solution</label>
                <textarea
                  rows={3}
                  value={form.solution}
                  onChange={(e) => set("solution", e.target.value)}
                  placeholder="How did we solve it technically and strategically?"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-500/20 text-brand-300 text-[10px]">3</span>
              Tech Stack &amp; Features
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tech Stack <span className="text-slate-500">(one per line)</span>
              </label>
              <textarea
                rows={3}
                value={form.stack.join("\n")}
                onChange={(e) => set("stack", parseList(e.target.value))}
                placeholder={"Next.js\nTypeScript\nNode.js\nPostgreSQL"}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none font-mono"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Key Features <span className="text-slate-500">(one per line)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.features.join("\n")}
                  onChange={(e) => set("features", parseList(e.target.value))}
                  placeholder="Real-time dashboards&#10;Role-based access"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Challenges Solved <span className="text-slate-500">(one per line)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.challenges.join("\n")}
                  onChange={(e) => set("challenges", parseList(e.target.value))}
                  placeholder="Cut p95 latency from 12s to 1.1s&#10;Zero-downtime migration"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-500/20 text-brand-300 text-[10px]">4</span>
              Results &amp; Metrics
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-slate-500">Metric {idx + 1}</label>
                  <input
                    type="text"
                    placeholder="Value (e.g. 2.1×)"
                    value={form.metrics[idx]?.value ?? ""}
                    onChange={(e) => {
                      const next = [...form.metrics];
                      next[idx] = { ...(next[idx] || { label: "" }), value: e.target.value };
                      set("metrics", next);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g. Conversion)"
                    value={form.metrics[idx]?.label ?? ""}
                    onChange={(e) => {
                      const next = [...form.metrics];
                      next[idx] = { ...(next[idx] || { value: "" }), label: e.target.value };
                      set("metrics", next);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/8">
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton type="submit">
              {saving ? "Publishing..." : "Publish to Website"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Case Study Modal                                                   */
/* ------------------------------------------------------------------ */
function CaseStudy({ project, onClose }: { project: Project; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-ink-950/88 backdrop-blur-md">
      <div className="mx-auto my-6 w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-[28px] border border-white/12 bg-ink-900 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] md:my-12">
        <div className="relative aspect-[16/7] w-full overflow-hidden">
          <div className={cn("absolute inset-0 bg-gradient-to-br", project.accent)} />
          <div className="absolute inset-0">
            <ProjectVisual project={project} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close case study"
            className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-ink-950/70 text-white backdrop-blur transition hover:bg-ink-950"
          >
            ✕
          </button>
          <div className="absolute bottom-0 left-0 p-6 md:p-9">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-ink-950/70 px-3 py-1 font-mono text-[10px] tracking-[0.16em] text-white uppercase backdrop-blur">
                {project.category}
              </span>
              <span className="rounded-full border border-white/15 bg-ink-950/70 px-3 py-1 font-mono text-[10px] tracking-[0.16em] text-slate-300 uppercase backdrop-blur">
                {project.client} · {project.year}
              </span>
            </div>
            <h2 className="font-display mt-3 text-2xl font-extrabold tracking-[-0.02em] text-white md:text-4xl">
              {project.title}
            </h2>
          </div>
        </div>

        <div className="p-6 md:p-9">
          <div className="grid grid-cols-3 gap-3">
            {project.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center"
              >
                <div className="metric-value font-display text-xl font-extrabold md:text-2xl">{m.value}</div>
                <div className="mt-1 text-[10px] tracking-wide text-slate-500 uppercase">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-9 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-5">
              <p className="font-mono text-[10px] tracking-[0.2em] text-rose-300 uppercase">The problem</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{project.problem}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
              <p className="font-mono text-[10px] tracking-[0.2em] text-emerald-300 uppercase">
                Our solution
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{project.solution}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <div>
                <h3 className="font-display text-[12px] font-bold tracking-[0.18em] text-brand-300 uppercase">
                  Key features
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {project.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-display text-[12px] font-bold tracking-[0.18em] text-brand-300 uppercase">
                  Challenges solved
                </h3>
                <ul className="mt-4 space-y-3">
                  {project.challenges.map((c, i) => (
                    <li key={c} className="glass rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="font-display grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-aqua-500 text-[10px] font-bold text-white">
                          {i + 1}
                        </span>
                        <p className="text-[13.5px] leading-relaxed text-slate-300">{c}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass rounded-2xl p-5">
                <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">Tech stack</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.stack.map((t) => (
                    <span
                      key={t}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10.5px] text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="glass rounded-2xl p-5">
                <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">Our role</p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-slate-300">{project.role}</p>
              </div>
              <PrimaryButton to="/contact" className="w-full">
                Build something like this
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Portfolio Page                                                */
/* ------------------------------------------------------------------ */
export default function Portfolio() {
  const [filter, setFilter] = useState<string>("All");
  const [active, setActive] = useState<Project | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Merge custom + static projects
  const customProjects = getStoredProjects();
  const projects = [...customProjects, ...staticProjects];

  const visible = useMemo(
    () => (filter === "All" ? projects : projects.filter((p) => p.category === filter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, customProjects.length],
  );

  return (
    <>
      {/* ================= HERO ================= */}
      <PageHero
        eyebrow="Our work"
        title="Case studies, not"
        highlight="just screenshots."
        description="Every project documents the client's problem, our solution, the exact technology stack and the production-level challenges we solved — so you know precisely what working with us delivers."
      >
        <PrimaryButton to="/contact">Start your project</PrimaryButton>
        <GhostButton to="/tech-stack">Review our tech stack</GhostButton>
      </PageHero>

      {/* ================= FILTERS + GRID ================= */}
      <section className="relative py-14 md:py-20">
        {/* Ambient glows */}
        <Glow className="top-0 left-1/4 h-72 w-72" color="rgba(99,102,241,0.14)" />
        <Glow className="top-40 right-1/4 h-64 w-64" color="rgba(6,182,212,0.12)" />

        <div className="shell relative">
          {/* Toolbar */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Animated filter pills */}
            <div className="flex flex-wrap gap-2">
              {projectFilters.map((f) => {
                const count =
                  f === "All" ? projects.length : projects.filter((p) => p.category === f).length;
                const isActive = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "group relative rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-all duration-300",
                      isActive
                        ? "filter-pill-active border-brand-400/70 bg-brand-500/20 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white",
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {f}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                          isActive ? "bg-white/15 text-white" : "bg-white/5 text-slate-500",
                        )}
                      >
                        {count}
                      </span>
                    </span>
                    {isActive && (
                      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-500/20 to-aqua-500/20 blur-sm" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <p className="hidden font-mono text-[10.5px] tracking-[0.18em] text-slate-500 uppercase sm:block">
                {visible.length} {visible.length === 1 ? "project" : "projects"} · click for full case study
              </p>
              <PrimaryButton onClick={() => setAddModalOpen(true)} className="px-5 py-2.5">
                <span className="mr-1.5 text-base leading-none">+</span> Add Product
              </PrimaryButton>
            </div>
          </div>

          {/* ================= BENTO GRID ================= */}
          {visible.length > 0 ? (
            <div className="masonry-grid mt-12">
              {visible.map((p, i) => (
                <StaggerItem key={p.id} delay={i * 60}>
                  <ProjectCard
                    project={p}
                    onOpen={setActive}
                    className="h-full"
                    featured={i === 0 && filter === "All"}
                  />
                </StaggerItem>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="mt-16 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-500">
                <Icon name="search" className="h-6 w-6" />
              </span>
              <h3 className="font-display mt-4 text-lg font-bold text-white">No projects in this category</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                Try a different filter, or add a new product using the button above.
              </p>
              <div className="mt-6 flex gap-3">
                <GhostButton onClick={() => setFilter("All")}>Show all projects</GhostButton>
                <PrimaryButton onClick={() => setAddModalOpen(true)}>+ Add Product</PrimaryButton>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= PRODUCTION PROOF ================= */}
      <section className="relative border-t border-white/8 bg-ink-900/40 py-20 md:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Production-ready by default"
              title="Monitoring goes live on"
              highlight="every project we ship."
              description="We keep watching the system after launch, which is why our clients usually hear about a problem from us first."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Datadog", d: "APM, logs and uptime alerts — p95 latency tracked on every endpoint." },
              { t: "Sentry", d: "Release tracking and error grouping, so issues surface before users report them." },
              { t: "Playwright", d: "An end-to-end regression suite that runs on every deployment." },
              { t: "Lighthouse CI", d: "Performance budgets fail the build if a score drops below target." },
            ].map((x, i) => (
              <Reveal key={x.t} delay={i * 80}>
                <div className="premium-card group glass-card h-full rounded-2xl p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-gradient-to-br from-brand-500/25 to-aqua-500/15 text-aqua-400 transition-transform duration-300 group-hover:scale-110">
                    <Icon name="shield" className="h-5 w-5" />
                  </span>
                  <p className="font-display mt-4 text-base font-bold text-white">{x.t}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{x.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Eyebrow>Want the same setup?</Eyebrow>
              <PrimaryButton to="/contact">Let's talk</PrimaryButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= CTA BAND ================= */}
      <section className="py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <div className="premium-card relative overflow-hidden rounded-[32px] border border-white/12 bg-gradient-to-br from-brand-600/30 via-ink-850 to-aqua-500/18 p-8 md:p-14">
              <div className="grid-bg absolute inset-0 opacity-40" aria-hidden />
              <Glow className="-bottom-24 -right-10 h-72 w-72" color="rgba(34,211,238,0.22)" />
              <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <Eyebrow tone="aqua">Your project could be next</Eyebrow>
                  <h2 className="font-display mt-4 text-3xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl">
                    Let's build something worth a case study.
                  </h2>
                  <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
                    Every product we ship is documented, monitored and measured. Tell us what you are
                    building and we will show you how it would look here.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                  <PrimaryButton to="/contact">Start a project</PrimaryButton>
                  <GhostButton to="/pricing">See pricing</GhostButton>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= MODALS ================= */}
      {active ? <CaseStudy project={active} onClose={() => setActive(null)} /> : null}
      {addModalOpen ? (
        <AddProductModal
          onClose={() => setAddModalOpen(false)}
          onPublish={(p) => {
            setAddModalOpen(false);
            setActive(p);
          }}
        />
      ) : null}
    </>
  );
}
