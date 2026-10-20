import { useId } from "react";
import { Link } from "../lib/router";
import { cn } from "../utils/cn";

/** The Novaframe "N" monogram in champagne gold on obsidian. */
export function BrandMark({ size = 38, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-[11px]", className)}
      style={{ width: size, height: size, boxShadow: "0 10px 26px -14px rgba(212,173,102,0.9)" }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`nf-g-${id}`} x1="10" y1="8" x2="90" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f6edd8" />
            <stop offset="0.45" stopColor="#d4ad66" />
            <stop offset="1" stopColor="#9c7134" />
          </linearGradient>
          <radialGradient id={`nf-r-${id}`} cx="30%" cy="20%" r="90%">
            <stop offset="0" stopColor="#2a241c" />
            <stop offset="1" stopColor="#0d0c0a" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill={`url(#nf-r-${id})`} />
        <rect x="8.5" y="8.5" width="83" height="83" rx="19" fill="none" stroke={`url(#nf-g-${id})`} strokeWidth="3" />
        <path fill={`url(#nf-g-${id})`} d="M24 34.5 32.5 43V78H24Z" />
        <path fill={`url(#nf-g-${id})`} d="M24 22h8.6L76 66.3V78h-6.6L24 31.6Z" />
        <path fill={`url(#nf-g-${id})`} d="M67.5 22H76v42.4l-8.5-8.6Z" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-3", className)} aria-label="Novaframe Studio — home">
      <BrandMark size={38} className="transition-transform duration-700 group-hover:rotate-[-6deg]" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[19px] [font-weight:420] tracking-[-0.02em] text-ivory">
            Novaframe<span className="text-gold-400">.</span>
          </span>
          <span className="mt-[5px] font-mono text-[8.5px] tracking-[0.42em] text-mist uppercase">Studio</span>
        </span>
      )}
    </Link>
  );
}

/**
 * Rotating circular seal — a luxury-house emblem with the monogram at
 * its centre. Pure SVG, no images.
 */
export function Seal({ size = 132, className, text = "NOVAFRAME STUDIO · EST. 2026 · NEW DELHI · " }: { size?: number; className?: string; text?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="animate-spin-slow absolute inset-0 h-full w-full">
        <defs>
          <path id={`seal-${id}`} d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
        </defs>
        <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(227,200,140,0.28)" strokeWidth="1" />
        <circle cx="100" cy="100" r="58" fill="none" stroke="rgba(227,200,140,0.22)" strokeWidth="1" />
        <text fill="#e3c88c" fontFamily="JetBrains Mono, monospace" fontSize="12.5" letterSpacing="4.2">
          <textPath href={`#seal-${id}`}>{text.repeat(2)}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <BrandMark size={size * 0.34} />
      </div>
    </div>
  );
}
