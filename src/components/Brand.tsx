import { Link } from "../lib/router";
import { company } from "../data/content";
import { cn } from "../utils/cn";

/**
 * Bulletproof SVG Brand Logo:
 * Self-contained vector graphic with metallic indigo-to-cyan gradient,
 * zero external image dependency, zero missing file risks in Vite.
 */
export function BrandMark({ size = 38, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[11px] border border-white/15 bg-ink-950 shadow-[0_10px_26px_-12px_rgba(79,70,229,0.95)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full p-1.5"
      >
        <defs>
          <linearGradient id="nf-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="nf-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a5b4ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Ambient background glow */}
        <rect width="100" height="100" rx="18" fill="url(#nf-glow-grad)" />

        {/* Outer Tech Frame */}
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          rx="18"
          stroke="url(#nf-logo-grad)"
          strokeWidth="3.5"
          strokeOpacity="0.8"
        />

        {/* Geometric 'N' & Prism Monogram */}
        <path
          d="M26 74V26L52 60V26"
          stroke="url(#nf-logo-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M74 26V74"
          stroke="#22d3ee"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Energy dot */}
        <circle cx="74" cy="26" r="4.5" fill="#a3e635" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false, stacked = false }: { compact?: boolean; stacked?: boolean }) {
  if (stacked) {
    return (
      <Link to="/" className="group inline-flex flex-col items-center gap-3" aria-label={company.name}>
        <BrandMark size={46} className="transition-transform duration-500 group-hover:scale-105" />
        <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-white">
          Novaframe<span className="text-brand-400">.</span>
        </span>
      </Link>
    );
  }

  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label={company.name}>
      <BrandMark size={36} className="transition-transform duration-500 group-hover:rotate-[-4deg]" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[16.5px] font-extrabold tracking-[-0.02em] text-white">
            Novaframe<span className="text-brand-400">.</span>
          </span>
          <span className="mt-[3px] font-mono text-[8.5px] tracking-[0.3em] text-slate-400 uppercase">
            Studio
          </span>
        </span>
      )}
    </Link>
  );
}

/** Text-only client logo lockup for the trust strip */
export function ClientWordmark({ name }: { name: string }) {
  return (
    <span className="font-display text-[13px] font-bold tracking-[0.18em] whitespace-nowrap text-slate-400 transition-colors duration-300 hover:text-white">
      {name}
    </span>
  );
}
