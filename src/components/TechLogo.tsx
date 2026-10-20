import { useState } from "react";
import { cn } from "../utils/cn";

const CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons";

/** Logos drawn in black that need inverting on a dark surface */
const INVERT = new Set(["Next.js", "Vercel", "Git & GitHub", "GitHub", "Express", "Three.js", "Socket.IO"]);

function monogram(name: string) {
  const cleaned = name.replace(/[^A-Za-z0-9 ]/g, " ").trim();
  const parts = cleaned.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : cleaned.slice(0, 2)).toUpperCase();
}

/**
 * Monochrome-by-default tech logo that blooms into full colour on hover —
 * keeps the palette calm while staying recognisable.
 */
export function TechLogo({ name, icon, size = "md", className }: { name: string; icon: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const [failed, setFailed] = useState(false);
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-gold-300/12 bg-ink-850", dims, className)}>
      {icon && !failed ? (
        <img
          src={`${CDN}/${icon}.svg`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn(
            "h-[54%] w-[54%] object-contain opacity-80 grayscale transition duration-500 group-hover:opacity-100 group-hover:grayscale-0",
            INVERT.has(name) && "invert",
          )}
        />
      ) : (
        <span className="display text-gold text-[0.95rem] leading-none">{monogram(name)}</span>
      )}
    </span>
  );
}
