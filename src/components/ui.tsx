import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { Link } from "../lib/router";

/* ------------------------------------------------------------------ */
/* Scroll reveal observer                                             */
/* ------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", shown && "reveal-in", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dynamic Spotlight Card                                             */
/* ------------------------------------------------------------------ */
export function SpotlightCard({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const Tag = as as "div";

  return (
    <Tag
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn("glass-card glass-hover spotlight rounded-3xl", className)}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Professional Badge / Eyebrow                                       */
/* ------------------------------------------------------------------ */
export function Eyebrow({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "aqua" | "emerald";
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-[0.16em] text-slate-300 uppercase shadow-inner backdrop-blur-md">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full animate-pulse-ring",
          tone === "brand" && "bg-brand-400",
          tone === "aqua" && "bg-aqua-400",
          tone === "emerald" && "bg-emerald-400",
        )}
      />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Section Heading                                                    */
/* ------------------------------------------------------------------ */
export function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "text-left", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="font-display mt-5 text-[2rem] leading-[1.12] font-bold tracking-tight text-white sm:text-4xl md:text-[2.85rem]">
        {title} {highlight ? <span className="text-gradient">{highlight}</span> : null}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-[15px] leading-relaxed text-slate-400 md:text-[16.5px]",
            align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Action Buttons                                                     */
/* ------------------------------------------------------------------ */
const baseButton =
  "group relative inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 font-display text-[13.5px] font-semibold tracking-wide transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950";

export function PrimaryButton({
  children,
  to,
  href,
  className,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  to?: string;
  href?: string;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  const classes = cn(
    baseButton,
    "shine bg-gradient-to-r from-brand-500 via-indigo-500 to-aqua-500 text-white shadow-[0_12px_36px_-12px_rgba(79,70,229,0.85)] hover:shadow-[0_18px_48px_-10px_rgba(34,211,238,0.7)] hover:brightness-110 active:scale-[0.98]",
    className,
  );
  const content = (
    <>
      <span>{children}</span>
      <svg
        className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

export function GhostButton({
  children,
  to,
  href,
  className,
  onClick,
}: {
  children: ReactNode;
  to?: string;
  href?: string;
  className?: string;
  onClick?: () => void;
}) {
  const classes = cn(
    baseButton,
    "border border-white/12 bg-white/[0.04] text-slate-200 hover:border-brand-400/50 hover:bg-white/[0.08] hover:text-white backdrop-blur-md",
    className,
  );
  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Card Primitive                                                     */
/* ------------------------------------------------------------------ */
export function Card({
  children,
  className,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={cn("glass-card rounded-3xl p-6", hover && "glass-hover", className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ambient Glow                                                       */
/* ------------------------------------------------------------------ */
export function Glow({
  className,
  color = "rgba(99,102,241,0.28)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("glow-orb", className)}
      style={{ background: color }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Counter Animation                                                  */
/* ------------------------------------------------------------------ */
export function CountUp({
  value,
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        const duration = 1500;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          setDisplay(value * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Stat Block                                                         */
/* ------------------------------------------------------------------ */
export function Stat({
  value,
  suffix = "",
  label,
  decimals = 0,
}: {
  value: number | string;
  suffix?: string;
  label: string;
  decimals?: number;
}) {
  return (
    <div className="group rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-4 transition-all duration-300 hover:border-brand-400/40 hover:bg-white/[0.05] hover:shadow-[0_10px_30px_-15px_rgba(79,70,229,0.3)]">
      <div className="font-display text-2xl font-extrabold tracking-tight text-white md:text-[28px]">
        {typeof value === "number" ? <CountUp value={value} suffix={suffix} decimals={decimals} /> : value}
      </div>
      <div className="mt-1 text-[11px] font-medium tracking-[0.14em] text-slate-400 uppercase">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page Hero (Internal Pages)                                         */
/* ------------------------------------------------------------------ */
export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/8 pt-36 pb-16 md:pt-44 md:pb-20">
      <div className="grid-bg absolute inset-0" aria-hidden />
      <Glow className="-top-36 left-1/2 h-[420px] w-[620px] -translate-x-1/2" />
      <Glow className="top-28 -right-20 h-72 w-72" color="rgba(6,182,212,0.18)" />
      <div className="shell relative">
        <div className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="font-display mt-5 text-[2.4rem] leading-[1.06] font-extrabold tracking-tight text-white sm:text-5xl md:text-[3.6rem]">
            {title} {highlight ? <span className="text-gradient">{highlight}</span> : null}
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-slate-300/90 md:text-[17.5px]">
            {description}
          </p>
          {children ? <div className="mt-9 flex flex-wrap gap-3.5">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
