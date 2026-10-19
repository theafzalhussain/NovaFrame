import { useState } from "react";
import { cn } from "../utils/cn";

const CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons";

/** Logos jo dark-coloured artwork ke saath aate hain — dark theme par invert karte hain */
const INVERT = new Set([
  "Next.js",
  "Vercel",
  "GitHub",
  "Express",
  "Prisma",
  "Three.js",
  "Git",
  "Storybook",
]);

const ACCENTS = [
  "from-brand-500 to-aqua-500",
  "from-fuchsia-500 to-brand-500",
  "from-cyan-400 to-brand-400",
  "from-amber-400 to-rose-500",
  "from-emerald-400 to-cyan-500",
  "from-indigo-400 to-violet-500",
];

function monogram(name: string) {
  const cleaned = name.replace(/[^A-Za-z0-9 ]/g, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

export function TechLogo({
  name,
  icon,
  size = "md",
  className,
}: {
  name: string;
  icon: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const accent = ACCENTS[name.length % ACCENTS.length];
  const dims = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-xs";

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] overflow-hidden",
        dims,
        className,
      )}
    >
      {icon && !failed ? (
        <img
          src={`${CDN}/${icon}.svg`}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("h-[58%] w-[58%] object-contain", INVERT.has(name) && "invert")}
        />
      ) : (
        <span
          className={cn(
            "font-display bg-gradient-to-br bg-clip-text font-bold text-transparent",
            accent,
          )}
        >
          {monogram(name)}
        </span>
      )}
    </div>
  );
}
