import { useId } from "react";
import { Link } from "../lib/router";
import { cn } from "../utils/cn";

/**
 * The WebXstudio "X" monogram — champagne gold on obsidian, inside the gold
 * hairline frame the brand uses everywhere.
 *
 * The two diagonals carry the same thick/thin stroke contrast as Fraunces, the
 * display face, so the mark and the wordmark read as one family. Pure SVG, so it
 * stays crisp from a 16px favicon to a billboard.
 */
export function BrandMark({ size = 38, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-[11px]", className)}
      style={{ width: size, height: size, boxShadow: "0 10px 26px -14px rgba(212,173,102,0.9)" }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`wx-g-${id}`} x1="10" y1="8" x2="90" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f6edd8" />
            <stop offset="0.45" stopColor="#d4ad66" />
            <stop offset="1" stopColor="#9c7134" />
          </linearGradient>
          <radialGradient id={`wx-r-${id}`} cx="30%" cy="20%" r="90%">
            <stop offset="0" stopColor="#2a241c" />
            <stop offset="1" stopColor="#0d0c0a" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill={`url(#wx-r-${id})`} />
        <rect x="8.5" y="8.5" width="83" height="83" rx="19" fill="none" stroke={`url(#wx-g-${id})`} strokeWidth="3" />
        {/* Thick diagonal (top-left → bottom-right), slightly flared at the foot. */}
        <path fill={`url(#wx-g-${id})`} d="M24 24h11.5L76 76H63Z" />
        {/* Thin counter-diagonal — the high-contrast pair that makes the X typographic. */}
        <path fill={`url(#wx-g-${id})`} d="M69.5 24H76L31 76h-7Z" />
      </svg>
    </span>
  );
}

/**
 * Full lockup: monogram + two-line wordmark. The gold X ties the wordmark to the
 * mark, and the letterspaced "STUDIO" completes the name — WebX + studio.
 */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-3", className)} aria-label="WebXstudio — home">
      <BrandMark size={38} className="transition-transform duration-700 group-hover:rotate-[-6deg]" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[20px] [font-weight:420] tracking-[-0.01em] text-ivory">
            Web<span className="text-gold-300">X</span>
            <span className="text-gold-400">.</span>
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
 *
 * The ring text comes from editable settings on some pages, so the tracking is
 * computed rather than fixed: the text is repeated to roughly fill the circle and
 * then spaced to close it exactly, which keeps any length from doubling a letter
 * at the wrap point or leaving a gap.
 */
const SEAL_RADIUS = 76;
const SEAL_FONT = 12.5;
/** JetBrains Mono advance width is 0.6em. */
const SEAL_ADVANCE = SEAL_FONT * 0.6;
const SEAL_TRACKING = 5.4; // the look we tune towards
const SEAL_RING = 2 * Math.PI * SEAL_RADIUS;

export function Seal({ size = 132, className, text = "WEBXSTUDIO · EST. 2026 · NEW DELHI · " }: { size?: number; className?: string; text?: string }) {
  const id = useId().replace(/:/g, "");
  const label = text.length ? text : " ";
  const copies = Math.max(1, Math.round(SEAL_RING / (label.length * (SEAL_ADVANCE + SEAL_TRACKING))));
  const ring = label.repeat(copies);
  const tracking = SEAL_RING / ring.length - SEAL_ADVANCE;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="animate-spin-slow absolute inset-0 h-full w-full">
        <defs>
          <path
            id={`seal-${id}`}
            d={`M100,100 m-${SEAL_RADIUS},0 a${SEAL_RADIUS},${SEAL_RADIUS} 0 1,1 ${SEAL_RADIUS * 2},0 a${SEAL_RADIUS},${SEAL_RADIUS} 0 1,1 -${SEAL_RADIUS * 2},0`}
          />
        </defs>
        <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(227,200,140,0.28)" strokeWidth="1" />
        <circle cx="100" cy="100" r="58" fill="none" stroke="rgba(227,200,140,0.22)" strokeWidth="1" />
        <text fill="#e3c88c" fontFamily="JetBrains Mono, monospace" fontSize={SEAL_FONT} letterSpacing={tracking.toFixed(2)}>
          <textPath href={`#seal-${id}`}>{ring}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <BrandMark size={size * 0.34} />
      </div>
    </div>
  );
}
