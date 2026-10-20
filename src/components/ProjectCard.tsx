import type { Project } from "../data/types";
import { Link } from "../lib/router";
import { track } from "../lib/api";
import { Icon } from "./Icons";
import ProjectVisual from "./ProjectVisual";
import { cn } from "../utils/cn";

export function StatusPill({ status }: { status: string }) {
  const live = /live/i.test(status);
  // Solid backing so the pill stays legible over bright screenshots.
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-ink-950/90 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase shadow-lg backdrop-blur-md",
        live ? "border-sage/40 text-[#d6f0de]" : "border-gold-300/40 text-gold-100",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-sage animate-pulse-dot" : "bg-gold-300")} />
      {status}
    </span>
  );
}

export function ProjectLinks({ project, className }: { project: Project; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {project.liveUrl ? (
        <a
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            track("cta_click", { label: `live_${project.id}` });
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/20 px-3 py-1.5 text-[12px] font-semibold text-parchment transition hover:border-gold-300/60 hover:text-gold-200"
        >
          <Icon name="globe" className="h-3.5 w-3.5" /> Live site
          <Icon name="arrow-up-right" className="h-3 w-3" />
        </a>
      ) : null}
      {project.repoUrl ? (
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            track("cta_click", { label: `repo_${project.id}` });
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/20 px-3 py-1.5 text-[12px] font-semibold text-parchment transition hover:border-gold-300/60 hover:text-gold-200"
        >
          <Icon name="github" className="h-3.5 w-3.5" /> Source
          <Icon name="arrow-up-right" className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
}

export default function ProjectCard({ project, className }: { project: Project; className?: string }) {
  return (
    <article className={cn("lux-card lux-hover group flex h-full flex-col overflow-hidden", className)}>
      <Link to={`/work/${project.id}`} className="block" aria-label={`${project.title} case study`}>
        <div className="relative aspect-[16/11] overflow-hidden border-b border-gold-300/10">
          <ProjectVisual project={project} compact />
          <div className="absolute bottom-3 left-3 flex gap-2">
            <StatusPill status={project.status} />
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="label text-gold-400/90">{project.category}</span>
          <span className="font-mono text-[11px] text-smoke">{project.year}</span>
        </div>
        <Link to={`/work/${project.id}`} className="mt-3 block">
          <h3 className="display text-[1.7rem] leading-tight transition-colors group-hover:text-gold-100">{project.title}</h3>
          <p className="mt-1 text-[13.5px] font-medium text-gold-300/80">{project.subtitle}</p>
        </Link>
        <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-mist">{project.summary}</p>

        {project.metrics.length ? (
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-gold-300/10 pt-5">
            {project.metrics.slice(0, 3).map((m) => (
              <div key={m.label}>
                <div className="display text-gold text-[1.35rem] leading-none">{m.value}</div>
                <div className="mt-1.5 text-[10.5px] leading-tight text-smoke">{m.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <ProjectLinks project={project} />
          <Link
            to={`/work/${project.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-gold-200 transition-all hover:gap-2.5"
          >
            Case study <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
