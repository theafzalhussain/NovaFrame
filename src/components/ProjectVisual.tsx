import { useState } from "react";
import type { Project } from "../data/types";
import { hostOf } from "../lib/site";
import { cn } from "../utils/cn";

function BrowserBar({ url, compact }: { url: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 border-b border-gold-300/10 bg-ink-900/95", compact ? "px-3 py-2" : "px-4 py-2.5")}>
      <div className="flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-gold-300/30" />
        <span className="h-2 w-2 rounded-full bg-gold-300/20" />
        <span className="h-2 w-2 rounded-full bg-gold-300/10" />
      </div>
      <div className="mx-auto flex max-w-[70%] min-w-0 items-center gap-1.5 rounded-full border border-gold-300/10 bg-ink-950/80 px-3 py-1">
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 shrink-0 text-sage" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <span className="truncate font-mono text-[9.5px] tracking-wide text-mist">{url}</span>
      </div>
      <span className="w-[34px]" />
    </div>
  );
}

function Terminal({ project, compact }: { project: Project; compact?: boolean }) {
  const lines = project.preview?.length ? project.preview : project.features.slice(0, 4).map((f) => `› ${f}`);
  return (
    <div className="flex h-full flex-col bg-[#0b0a08]">
      <div className={cn("flex items-center gap-3 border-b border-gold-300/10", compact ? "px-3 py-2" : "px-4 py-2.5")}>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gold-300/30" />
          <span className="h-2 w-2 rounded-full bg-gold-300/20" />
          <span className="h-2 w-2 rounded-full bg-gold-300/10" />
        </div>
        <span className="mx-auto font-mono text-[10px] tracking-[0.18em] text-smoke uppercase">{project.title.toLowerCase()} — terminal</span>
        <span className="w-[34px]" />
      </div>
      <div className={cn("relative flex-1 overflow-hidden font-mono", compact ? "p-4 text-[10.5px]" : "p-6 text-[12.5px] md:text-[13px]")}>
        <div className="grid-lines absolute inset-0 opacity-40" aria-hidden />
        <div className="relative space-y-2.5 leading-relaxed">
          {lines.map((line, i) => {
            const isAgent = /^saarthi|^agent|^ai/i.test(line.trim());
            return (
              <p key={i} className={cn("whitespace-pre-wrap", isAgent ? "text-gold-200" : "text-sand")} style={{ animation: `fade-up 0.6s ${0.15 * i}s both` }}>
                {line}
              </p>
            );
          })}
          <p className="text-gold-300">
            <span className="inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] animate-pulse bg-gold-300/80" />
          </p>
        </div>
      </div>
    </div>
  );
}

function Monogram({ project }: { project: Project }) {
  const initials = project.title
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="relative grid h-full place-items-center overflow-hidden bg-gradient-to-br from-ink-800 to-ink-950">
      <div className="grid-lines absolute inset-0" aria-hidden />
      <span className="display text-gold relative text-[5.5rem] leading-none">{initials}</span>
      <span className="label absolute bottom-5 left-1/2 -translate-x-1/2">{project.category}</span>
    </div>
  );
}

/**
 * Real screenshots inside a browser frame. Tall, full-page captures
 * auto-scroll on hover; wide ones gently zoom.
 */
export default function ProjectVisual({ project, compact = false, className }: { project: Project; compact?: boolean; className?: string }) {
  const [tall, setTall] = useState(true);
  const [broken, setBroken] = useState(false);

  if (project.visual === "terminal" || (!project.cover && project.preview?.length)) {
    return (
      <div className={cn("h-full w-full", className)}>
        <Terminal project={project} compact={compact} />
      </div>
    );
  }

  if (!project.cover || broken || project.visual === "monogram") {
    return (
      <div className={cn("h-full w-full", className)}>
        <Monogram project={project} />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full w-full flex-col bg-ink-900", className)}>
      <BrowserBar url={hostOf(project.liveUrl) || `${project.id}.app`} compact={compact} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img
          src={project.cover}
          alt={`${project.title} — ${project.subtitle || project.category} screenshot`}
          loading="lazy"
          decoding="async"
          onLoad={(e) => setTall(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth > 0.9)}
          onError={() => setBroken(true)}
          className={cn("shot absolute inset-0", tall ? "shot-scroll" : "shot-zoom shot-wide")}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/60 to-transparent" />
      </div>
    </div>
  );
}
