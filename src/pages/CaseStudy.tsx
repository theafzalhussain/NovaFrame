import { useEffect, useState } from "react";
import { Link } from "../lib/router";
import { projects, type Project } from "../data/content";
import ProjectVisual from "../components/ProjectVisual";
import { Icon } from "../components/Icons";
import {
  GhostButton,
  Glow,
  PrimaryButton,
  Reveal,
} from "../components/ui";
import { cn } from "../utils/cn";

/**
 * Cinematic Case Study Page
 * -------------------------
 * Full-bleed visual hero with parallax, animated scroll progress bar,
 * gradient metric counters, sticky sidebar with tech stack, and
 * premium prev/next navigation.
 */
export default function CaseStudyPage({ project }: { project: Project }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const related = projects.filter((p) => p.id !== project.id).slice(0, 3);
  const index = projects.findIndex((p) => p.id === project.id);
  const prev = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];

  return (
    <>
      {/* Scroll progress bar */}
      <div
        className="case-progress"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden
      />

      {/* ================= CINEMATIC HERO ================= */}
      <section className="cinematic-hero relative overflow-hidden pt-32 pb-14 md:pt-44 md:pb-20">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <Glow className="-top-32 left-1/2 h-[420px] w-[620px] -translate-x-1/2" color="rgba(79,70,229,0.3)" />
        <Glow className="top-1/3 -right-24 h-80 w-80" color="rgba(6,182,212,0.2)" />

        <div className="shell relative">
          {/* Breadcrumb */}
          <Link
            to="/portfolio"
            className="group inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 transition hover:text-white"
          >
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:-translate-x-1"
            >
              ←
            </span>
            All case studies
          </Link>

          {/* Badges */}
          <div className="mt-7 flex flex-wrap gap-2.5">
            <span className="rounded-full border border-brand-400/40 bg-brand-500/15 px-3.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-brand-200 uppercase backdrop-blur-md">
              {project.category}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.16em] text-slate-300 uppercase backdrop-blur-md">
              {project.client}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.16em] text-slate-300 uppercase backdrop-blur-md">
              {project.year}
            </span>
          </div>

          {/* Title */}
          <Reveal>
            <h1 className="font-display mt-6 max-w-4xl text-[2.4rem] leading-[1.05] font-extrabold tracking-[-0.035em] text-white sm:text-5xl md:text-[3.8rem]">
              {project.title}
            </h1>
          </Reveal>

          {/* Summary */}
          <Reveal delay={100}>
            <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-slate-300 md:text-[18px]">
              {project.summary}
            </p>
          </Reveal>

          {/* CTA row */}
          <Reveal delay={180}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <PrimaryButton to="/contact">Build something similar</PrimaryButton>
              <GhostButton to="/portfolio">Browse all work</GhostButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FULL-BLEED VISUAL ================= */}
      <section className="relative -mt-4 pb-14">
        <div className="shell">
          <Reveal>
            <div className={cn(
              "premium-card relative overflow-hidden rounded-[32px] border border-white/15 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]",
            )}>
              {/* Accent header band */}
              <div className={cn("h-2 w-full bg-gradient-to-r", project.accent)} />
              <div className="aspect-[16/8] w-full bg-[#0a0d1a]">
                <ProjectVisual project={project} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= METRICS ================= */}
      <section className="pb-16">
        <div className="shell grid gap-4 sm:grid-cols-3">
          {project.metrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 90}>
              <div className="premium-card glass-card rounded-3xl p-7 text-center">
                <div className="metric-value font-display text-4xl font-extrabold tracking-tight md:text-5xl">
                  {m.value}
                </div>
                <div className="mt-2 font-mono text-[11px] tracking-[0.16em] text-slate-400 uppercase">
                  {m.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="divider-glow" />

      {/* ================= NARRATIVE ================= */}
      <section className="py-16 md:py-20">
        <div className="shell">
          {/* Problem / Solution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="group h-full rounded-3xl border border-rose-400/25 bg-gradient-to-br from-rose-500/[0.08] to-transparent p-7 transition hover:border-rose-400/45">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-500/20 text-rose-300">
                    <Icon name="target" className="h-4 w-4" />
                  </span>
                  <p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-rose-300 uppercase">
                    The problem
                  </p>
                </div>
                <p className="mt-5 text-[15.5px] leading-relaxed text-slate-200">{project.problem}</p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="group h-full rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-7 transition hover:border-emerald-400/45">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/20 text-emerald-300">
                    <Icon name="bolt" className="h-4 w-4" />
                  </span>
                  <p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-emerald-300 uppercase">
                    Our solution
                  </p>
                </div>
                <p className="mt-5 text-[15.5px] leading-relaxed text-slate-200">{project.solution}</p>
              </div>
            </Reveal>
          </div>

          {/* Features / Challenges + Sidebar */}
          <div className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Left column */}
            <div className="space-y-10">
              {/* Features */}
              <Reveal>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-aqua-400" />
                    <h2 className="font-display text-sm font-bold tracking-[0.18em] text-brand-300 uppercase">
                      Key features delivered
                    </h2>
                  </div>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {project.features.map((f, i) => (
                      <li
                        key={f}
                        className="premium-card group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                        style={{ transitionDelay: `${i * 30}ms` }}
                      >
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-aqua-500 text-[11px] font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="text-[14px] leading-relaxed text-slate-300">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              {/* Challenges */}
              <Reveal delay={100}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-violet-400" />
                    <h2 className="font-display text-sm font-bold tracking-[0.18em] text-brand-300 uppercase">
                      Challenges solved
                    </h2>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {project.challenges.map((c, i) => (
                      <li
                        key={c}
                        className="glass-card group flex items-start gap-4 rounded-2xl border border-white/10 p-5 transition hover:border-violet-400/40"
                      >
                        <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-lg">
                          {i + 1}
                        </span>
                        <p className="text-[14.5px] leading-relaxed text-slate-300">{c}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            {/* Right sticky sidebar */}
            <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
              <Reveal delay={140}>
                <div className="glass-card rounded-3xl border border-white/10 p-6">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">
                    Tech stack
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.stack.map((t) => (
                      <span
                        key={t}
                        className="tech-tag rounded-lg border border-brand-400/30 bg-brand-500/10 px-3 py-1.5 font-mono text-[11px] text-brand-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={200}>
                <div className="glass-card rounded-3xl border border-white/10 p-6">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">
                    Our role
                  </p>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-slate-300">{project.role}</p>
                </div>
              </Reveal>

              <Reveal delay={260}>
                <div className="premium-card rounded-3xl border border-brand-400/30 bg-gradient-to-br from-brand-600/30 via-ink-850 to-aqua-500/15 p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-aqua-500 text-white">
                    <Icon name="sparkle" className="h-5 w-5" />
                  </span>
                  <p className="font-display mt-4 text-[16px] font-bold text-white">
                    Want a similar outcome?
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-300">
                    We will review your context and tell you honestly what is achievable and in what
                    timeframe.
                  </p>
                  <PrimaryButton to="/contact" className="mt-5 w-full">
                    Start a project
                  </PrimaryButton>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <div className="divider-glow" />

      {/* ================= PREV / NEXT ================= */}
      <section className="py-12">
        <div className="shell grid gap-4 sm:grid-cols-2">
          {[
            { p: prev, label: "Previous project" },
            { p: next, label: "Next project" },
          ].map(({ p, label }) => (
            <Reveal key={label}>
              <Link
                to={`/work/${p.id}`}
                className="premium-card group flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:bg-white/[0.06]"
              >
                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-slate-500 uppercase">
                    {label}
                  </p>
                  <p className="font-display mt-2 text-lg font-bold text-white transition group-hover:text-brand-300">
                    {p.title}
                  </p>
                  <p className="mt-1 text-[12.5px] text-slate-500">{p.client}</p>
                </div>
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400 transition-all duration-300 group-hover:border-brand-400/60 group-hover:text-white group-hover:bg-brand-500/15"
                >
                  →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= RELATED ================= */}
      <section className="border-t border-white/8 bg-ink-900/40 py-20">
        <div className="shell">
          <Reveal>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                More <span className="text-gradient">case studies</span>
              </h2>
              <GhostButton to="/portfolio">View all</GhostButton>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 80}>
                <Link to={`/work/${p.id}`} className="group block h-full">
                  <div className="premium-card h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <div className={cn("absolute inset-0 bg-gradient-to-br", p.accent)} />
                      <div className="project-visual absolute inset-0">
                        <ProjectVisual project={p} />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 font-mono text-[9px] tracking-widest text-white uppercase backdrop-blur">
                          {p.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="font-mono text-[10px] tracking-[0.18em] text-brand-300 uppercase">
                        {p.client}
                      </p>
                      <p className="font-display mt-1.5 text-[16px] font-bold text-white transition group-hover:text-brand-300">
                        {p.title}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-[13px] text-slate-400">{p.summary}</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
