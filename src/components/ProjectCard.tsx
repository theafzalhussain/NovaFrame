import type { Project } from "../data/content";
import ProjectVisual from "./ProjectVisual";
import { cn } from "../utils/cn";

/**
 * Premium Project Card
 * --------------------
 * Cinematic hover experience: animated gradient border, image zoom + saturate,
 * metric counters with gradient text, tech-tag shimmer, and an arrow that
 * slides on hover. Designed to feel like a top agency portfolio card.
 */
export default function ProjectCard({
  project,
  onOpen,
  className,
  featured = false,
}: {
  project: Project;
  onOpen?: (p: Project) => void;
  className?: string;
  featured?: boolean;
}) {
  const interactive = Boolean(onOpen);

  return (
    <article
      onClick={() => onOpen?.(project)}
      className={cn(
        "premium-card group relative flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] transition-all duration-500",
        interactive && "cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_30px_70px_-20px_rgba(79,70,229,0.45)]",
        className,
      )}
    >
      {/* ================= Visual Header ================= */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0a0d1a]">
        {/* Accent gradient wash */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", project.accent)} />

        {/* Visual */}
        <div className="project-visual absolute inset-0">
          <ProjectVisual project={project} />
        </div>

        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0d1a] to-transparent" />

        {/* Top-left badges */}
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-md">
            {project.category}
          </span>
          <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-slate-300 backdrop-blur-md">
            {project.year}
          </span>
        </div>

        {/* Featured ribbon */}
        {featured && (
          <div className="animate-float-badge absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 backdrop-blur-md">
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-amber-300">
              <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
            </svg>
            <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-amber-200 uppercase">
              Featured
            </span>
          </div>
        )}

        {/* Hover overlay CTA */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-500 group-hover:bg-black/25 group-hover:opacity-100">
          <span className="translate-y-3 scale-95 rounded-full bg-white/95 px-5 py-2.5 font-display text-xs font-bold text-slate-900 shadow-2xl transition-all duration-500 group-hover:translate-y-0 group-hover:scale-100">
            View Case Study →
          </span>
        </div>
      </div>

      {/* ================= Content Body ================= */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
        <div>
          {/* Client + status */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-brand-300 uppercase">
              {project.client}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>

          {/* Title */}
          <h3 className="font-display mt-2.5 text-xl font-bold tracking-tight text-white transition-colors duration-300 group-hover:text-brand-200 sm:text-[22px]">
            {project.title}
          </h3>

          {/* Summary */}
          <p className="mt-2.5 line-clamp-3 text-[14px] leading-relaxed text-slate-400">
            {project.summary}
          </p>

          {/* Tech tags */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {project.stack.slice(0, 4).map((t) => (
              <span
                key={t}
                className="tech-tag group rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 font-mono text-[10.5px] text-slate-300 transition-colors duration-300 group-hover:border-brand-400/40"
              >
                {t}
              </span>
            ))}
            {project.stack.length > 4 && (
              <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 font-mono text-[10.5px] text-slate-400">
                +{project.stack.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* ================= Metrics Strip ================= */}
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="grid grid-cols-3 gap-2">
            {project.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl bg-white/[0.03] px-2 py-2.5 text-center transition-colors duration-300 group-hover:bg-white/[0.06]"
              >
                <div className="metric-value font-display text-[17px] font-extrabold tracking-tight">
                  {m.value}
                </div>
                <div className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-slate-500 uppercase">
                  {m.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-300 transition-all duration-300 group-hover:gap-2.5 group-hover:text-aqua-300">
              Inspect Case Study
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </span>
            <span className="font-mono text-[10px] text-slate-600">SQL · Live</span>
          </div>
        </div>
      </div>
    </article>
  );
}
