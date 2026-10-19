import { useMemo, useState } from "react";
import { cn } from "../../utils/cn";

/**
 * Enterprise Product / Case-Study Publisher
 * -----------------------------------------
 * A 4-step guided wizard exactly like a company-grade CMS:
 *   Step 1 — Product Basics   (title, auto-slug, client, category, year, live URL)
 *   Step 2 — Story & Narrative (summary, problem, solution)
 *   Step 3 — Tech, Metrics & Highlights (stack tags, dynamic KPI rows, features, challenges)
 *   Step 4 — Review & Publish  (full preview card + featured toggle + accent theme)
 *
 * Everything is saved to the SQL database through POST /api/admin/projects,
 * with an automatic offline queue if the API is unreachable.
 */

export type ProductPayload = {
  id: string;
  title: string;
  client: string;
  category: string;
  year: string;
  live_url: string;
  summary: string;
  problem: string;
  solution: string;
  tech_stack: string;
  metrics_json: { label: string; value: string }[];
  features: string[];
  challenges: string[];
  featured: boolean;
  accent: string;
};

const CATEGORIES = ["Web", "App", "Design", "Video", "SaaS", "E-commerce", "AI/ML"];

const ACCENTS = [
  { id: "from-indigo-500/30 to-cyan-500/20", label: "Indigo Cyan", dot: "bg-gradient-to-r from-indigo-500 to-cyan-400" },
  { id: "from-fuchsia-500/25 to-indigo-500/20", label: "Fuchsia Indigo", dot: "bg-gradient-to-r from-fuchsia-500 to-indigo-400" },
  { id: "from-emerald-500/25 to-cyan-500/20", label: "Emerald Cyan", dot: "bg-gradient-to-r from-emerald-500 to-cyan-400" },
  { id: "from-amber-500/25 to-rose-500/20", label: "Amber Rose", dot: "bg-gradient-to-r from-amber-500 to-rose-400" },
  { id: "from-sky-500/25 to-violet-500/20", label: "Sky Violet", dot: "bg-gradient-to-r from-sky-500 to-violet-400" },
];

const STEPS = [
  { n: 1, title: "Product Basics", sub: "Identity & classification" },
  { n: 2, title: "Story & Narrative", sub: "Problem → Solution" },
  { n: 3, title: "Tech & Highlights", sub: "Stack, KPIs, features" },
  { n: 4, title: "Review & Publish", sub: "Final preview" },
];

const emptyProduct: ProductPayload = {
  id: "",
  title: "",
  client: "",
  category: "Web",
  year: String(new Date().getFullYear()),
  live_url: "",
  summary: "",
  problem: "",
  solution: "",
  tech_stack: "",
  metrics_json: [
    { label: "Performance", value: "" },
    { label: "Conversion", value: "" },
    { label: "Users", value: "" },
  ],
  features: ["", "", ""],
  challenges: ["", ""],
  featured: true,
  accent: ACCENTS[0].id,
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-brand-400 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-brand-400";

const labelCls = "block text-[11px] font-mono font-semibold tracking-[0.14em] text-slate-400 uppercase mb-1.5";

function slugify(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export default function ProductForm({
  isOpen,
  onClose,
  onPublish,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (payload: ProductPayload) => Promise<void> | void;
  saving?: boolean;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProductPayload>(emptyProduct);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stackTags = useMemo(
    () => form.tech_stack.split(",").map((t) => t.trim()).filter(Boolean),
    [form.tech_stack],
  );

  if (!isOpen) return null;

  /* ---------------- validation per step ---------------- */
  const validateStep = (s: number): string => {
    if (s === 1) {
      if (form.title.trim().length < 3) return "Product title is required (min 3 characters).";
      if (form.id.trim().length < 3) return "URL slug is required.";
      if (form.client.trim().length < 2) return "Client / brand name is required.";
    }
    if (s === 2) {
      if (form.summary.trim().length < 20) return "Summary should be at least 20 characters — it appears on the portfolio card.";
    }
    if (s === 3) {
      if (stackTags.length === 0) return "Add at least one technology to the stack.";
    }
    return "";
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const handlePublish = async () => {
    for (const s of [1, 2, 3]) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    setError("");
    await onPublish({
      ...form,
      metrics_json: form.metrics_json.filter((m) => m.label.trim() && m.value.trim()),
      features: form.features.map((f) => f.trim()).filter(Boolean),
      challenges: form.challenges.map((c) => c.trim()).filter(Boolean),
    });
    setForm(emptyProduct);
    setStep(1);
    setSlugTouched(false);
  };

  /* ---------------- dynamic list helpers ---------------- */
  const setMetric = (i: number, key: "label" | "value", v: string) => {
    const rows = [...form.metrics_json];
    rows[i] = { ...rows[i], [key]: v };
    set("metrics_json", rows);
  };

  const setListItem = (key: "features" | "challenges", i: number, v: string) => {
    const rows = [...form[key]];
    rows[i] = v;
    set(key, rows);
  };

  const addListItem = (key: "features" | "challenges") => set(key, [...form[key], ""]);
  const removeListItem = (key: "features" | "challenges", i: number) =>
    set(key, form[key].filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-[99998] flex items-stretch justify-end bg-black/75 backdrop-blur-md">
      {/* click-away area */}
      <button type="button" aria-label="Close" onClick={onClose} className="hidden flex-1 cursor-default sm:block" />

      {/* slide-over panel */}
      <div className="flex w-full max-w-3xl flex-col border-l border-white/12 bg-[#070912] shadow-[-30px_0_90px_rgba(0,0,0,0.9)]">
        {/* ------------ Header ------------ */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-aqua-500 font-display text-sm font-extrabold text-white">
              +
            </span>
            <div>
              <h2 className="font-display text-base font-extrabold text-white">Add New Product</h2>
              <p className="font-mono text-[10px] tracking-[0.18em] text-slate-500 uppercase">
                Portfolio Publisher · Saves to SQL Database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* ------------ Step indicator ------------ */}
        <div className="border-b border-white/8 bg-white/[0.02] px-6 py-4 sm:px-8">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => s.n < step && setStep(s.n)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition",
                    s.n === step ? "bg-brand-500/15" : s.n < step ? "cursor-pointer opacity-90 hover:bg-white/5" : "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      s.n < step
                        ? "bg-emerald-500/25 text-emerald-300"
                        : s.n === step
                          ? "bg-gradient-to-br from-brand-500 to-aqua-500 text-white"
                          : "border border-white/15 text-slate-500",
                    )}
                  >
                    {s.n < step ? "✓" : s.n}
                  </span>
                  <span className="hidden text-left md:block">
                    <span className={cn("block text-[11.5px] font-bold", s.n === step ? "text-white" : "text-slate-400")}>
                      {s.title}
                    </span>
                    <span className="block text-[9.5px] text-slate-500">{s.sub}</span>
                  </span>
                </button>
                {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-white/10 md:block" />}
              </div>
            ))}
          </div>
        </div>

        {/* ------------ Error banner ------------ */}
        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300 sm:mx-8">
            ⚠ {error}
          </div>
        )}

        {/* ------------ Body (scrollable) ------------ */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {/* ============ STEP 1: BASICS ============ */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Product / Project Title *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. FinStream Realtime Trading Engine"
                  value={form.title}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (!slugTouched) set("id", slugify(e.target.value));
                  }}
                />
              </div>

              <div>
                <label className={labelCls}>URL Slug (auto-generated) *</label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 font-mono text-xs text-slate-500">
                    /work/
                  </span>
                  <input
                    className={cn(inputCls, "font-mono text-xs")}
                    placeholder="finstream-trading-engine"
                    value={form.id}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("id", slugify(e.target.value));
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[10.5px] text-slate-500">
                  This becomes the public case-study URL. Lowercase letters, numbers and hyphens only.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Client / Brand Name *</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. FinStream Labs"
                    value={form.client}
                    onChange={(e) => set("client", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Delivery Year</label>
                  <input
                    className={inputCls}
                    placeholder="2026"
                    value={form.year}
                    onChange={(e) => set("year", e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("category", c)}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-xs font-semibold transition",
                        form.category === c
                          ? "border-brand-400 bg-brand-500/20 text-white shadow-md shadow-brand-500/20"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Live URL (optional)</label>
                <input
                  className={inputCls}
                  placeholder="https://client-product.com"
                  value={form.live_url}
                  onChange={(e) => set("live_url", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ============ STEP 2: STORY ============ */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-baseline justify-between">
                  <label className={labelCls}>Card Summary *</label>
                  <span className={cn("font-mono text-[10px]", form.summary.length < 20 ? "text-rose-400" : "text-emerald-400")}>
                    {form.summary.length}/160
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={160}
                  className={cn(inputCls, "resize-none")}
                  placeholder="One powerful sentence shown on the portfolio card — what was built and the headline result."
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.05] p-5">
                <label className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.14em] text-rose-300 uppercase">
                  The Problem (client's pain point)
                </label>
                <textarea
                  rows={3}
                  className={cn(inputCls, "resize-none border-rose-400/20 bg-transparent")}
                  placeholder="e.g. Legacy dashboard loading at 12 seconds with 40k+ active users and no monitoring..."
                  value={form.problem}
                  onChange={(e) => set("problem", e.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-5">
                <label className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.14em] text-emerald-300 uppercase">
                  Our Solution (what we engineered)
                </label>
                <textarea
                  rows={3}
                  className={cn(inputCls, "resize-none border-emerald-400/20 bg-transparent")}
                  placeholder="e.g. Rebuilt on Next.js App Router with Redis caching and BullMQ queues, cutting p95 to 1.1s..."
                  value={form.solution}
                  onChange={(e) => set("solution", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ============ STEP 3: TECH & HIGHLIGHTS ============ */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className={labelCls}>Tech Stack * (comma separated)</label>
                <input
                  className={cn(inputCls, "font-mono text-xs")}
                  placeholder="Next.js, TypeScript, Node.js, PostgreSQL, Redis"
                  value={form.tech_stack}
                  onChange={(e) => set("tech_stack", e.target.value)}
                />
                {stackTags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {stackTags.map((t) => (
                      <span key={t} className="rounded-md border border-brand-400/30 bg-brand-500/15 px-2.5 py-1 font-mono text-[10.5px] text-brand-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* KPI Metrics */}
              <div>
                <label className={labelCls}>Result Metrics (shown on card — max 3 recommended)</label>
                <div className="space-y-2">
                  {form.metrics_json.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className={cn(inputCls, "flex-1")}
                        placeholder="Label e.g. p95 load"
                        value={m.label}
                        onChange={(e) => setMetric(i, "label", e.target.value)}
                      />
                      <input
                        className={cn(inputCls, "w-32 font-mono")}
                        placeholder="e.g. 1.1s"
                        value={m.value}
                        onChange={(e) => setMetric(i, "value", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => set("metrics_json", form.metrics_json.filter((_, idx) => idx !== i))}
                        className="shrink-0 rounded-xl border border-white/10 px-3 text-rose-400 transition hover:bg-rose-500/10"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => set("metrics_json", [...form.metrics_json, { label: "", value: "" }])}
                  className="mt-2 rounded-xl border border-dashed border-white/15 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-brand-400/50 hover:text-white"
                >
                  + Add Metric Row
                </button>
              </div>

              {/* Key Features */}
              <div>
                <label className={labelCls}>Key Features Delivered</label>
                <div className="space-y-2">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="grid h-11 w-8 shrink-0 place-items-center font-mono text-[10px] text-aqua-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <input
                        className={cn(inputCls, "flex-1")}
                        placeholder="e.g. Role-based access control with audit log"
                        value={f}
                        onChange={(e) => setListItem("features", i, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem("features", i)}
                        className="shrink-0 rounded-xl border border-white/10 px-3 text-rose-400 transition hover:bg-rose-500/10"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addListItem("features")}
                  className="mt-2 rounded-xl border border-dashed border-white/15 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-brand-400/50 hover:text-white"
                >
                  + Add Feature
                </button>
              </div>

              {/* Challenges Solved */}
              <div>
                <label className={labelCls}>Challenges Solved (engineering proof)</label>
                <div className="space-y-2">
                  {form.challenges.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className={cn(inputCls, "flex-1")}
                        placeholder="e.g. Zero-downtime migration using dual writes behind feature flags"
                        value={c}
                        onChange={(e) => setListItem("challenges", i, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem("challenges", i)}
                        className="shrink-0 rounded-xl border border-white/10 px-3 text-rose-400 transition hover:bg-rose-500/10"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addListItem("challenges")}
                  className="mt-2 rounded-xl border border-dashed border-white/15 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-brand-400/50 hover:text-white"
                >
                  + Add Challenge
                </button>
              </div>
            </div>
          )}

          {/* ============ STEP 4: REVIEW & PUBLISH ============ */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Live Preview Card */}
              <div>
                <label className={labelCls}>Live Preview — how it appears on the website</label>
                <div className="overflow-hidden rounded-3xl border border-white/12 bg-[#0a0d1a]">
                  <div className={cn("relative h-36 bg-gradient-to-br", form.accent)}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d1a] to-transparent" />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 font-mono text-[10px] text-white uppercase backdrop-blur">
                        {form.category}
                      </span>
                      <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 font-mono text-[10px] text-slate-300 uppercase backdrop-blur">
                        {form.year}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <span className="font-mono text-[10px] tracking-widest text-brand-300 uppercase">{form.client || "Client"}</span>
                    <h3 className="font-display mt-1 text-lg font-bold text-white">{form.title || "Product Title"}</h3>
                    <p className="mt-2 line-clamp-2 text-[13px] text-slate-400">{form.summary || "Card summary preview..."}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {stackTags.slice(0, 4).map((t) => (
                        <span key={t} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>
                    {form.metrics_json.filter((m) => m.label && m.value).length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/8 pt-3 text-center">
                        {form.metrics_json
                          .filter((m) => m.label && m.value)
                          .slice(0, 3)
                          .map((m) => (
                            <div key={m.label}>
                              <div className="font-display text-sm font-bold text-white">{m.value}</div>
                              <div className="text-[9px] tracking-wide text-slate-500 uppercase">{m.label}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Accent theme picker */}
              <div>
                <label className={labelCls}>Card Accent Theme</label>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => set("accent", a.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition",
                        form.accent === a.id
                          ? "border-brand-400 bg-brand-500/15 text-white"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
                      )}
                    >
                      <span className={cn("h-3.5 w-3.5 rounded-full", a.dot)} />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured toggle */}
              <button
                type="button"
                onClick={() => set("featured", !form.featured)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border p-4 transition",
                  form.featured ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]",
                )}
              >
                <span className="text-left">
                  <span className="font-display block text-sm font-bold text-white">Feature on Homepage</span>
                  <span className="mt-0.5 block text-[11.5px] text-slate-400">
                    Featured products appear in the "Selected Work" section on the home page.
                  </span>
                </span>
                <span
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition",
                    form.featured ? "bg-emerald-500" : "bg-white/15",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      form.featured ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </span>
              </button>

              {/* Publish summary */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-[11px] leading-relaxed text-slate-400">
                <p>→ Will be saved to <span className="text-aqua-300">projects</span> table (SQL)</p>
                <p>→ Public URL: <span className="text-brand-300">#/work/{form.id || "…"}</span></p>
                <p>→ {form.features.filter(Boolean).length} features · {form.challenges.filter(Boolean).length} challenges · {form.metrics_json.filter((m) => m.label && m.value).length} metrics</p>
              </div>
            </div>
          )}
        </div>

        {/* ------------ Footer actions ------------ */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={step === 1 ? onClose : goBack}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[10px] text-slate-500 sm:block">
              Step {step} of {STEPS.length}
            </span>
            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                className="shine rounded-full bg-gradient-to-r from-brand-500 to-aqua-500 px-6 py-2.5 font-display text-xs font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="shine rounded-full bg-gradient-to-r from-emerald-500 to-aqua-500 px-6 py-2.5 font-display text-xs font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? "Publishing…" : "🚀 Publish to Website"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
