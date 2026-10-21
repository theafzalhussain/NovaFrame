import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { Link } from "../lib/router";
import { track } from "../lib/api";
import { usePauseOffscreen } from "../lib/onscreen";
import { Icon } from "./Icons";

/* ------------------------------------------------------------------ */
/* Scroll reveal                                                      */
/* ------------------------------------------------------------------ */
// One observer for every <Reveal> on the page instead of one each (pages have dozens).
const revealCallbacks = new WeakMap<Element, () => void>();
let revealObserver: IntersectionObserver | null = null;

function observeReveal(node: Element, onShow: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    onShow();
    return () => {};
  }
  revealObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        revealObserver?.unobserve(entry.target);
        revealCallbacks.get(entry.target)?.();
        revealCallbacks.delete(entry.target);
      }
    },
    { threshold: 0.06, rootMargin: "0px 0px -40px 0px" },
  );
  revealCallbacks.set(node, onShow);
  revealObserver.observe(node);
  return () => {
    revealCallbacks.delete(node);
    revealObserver?.unobserve(node);
  };
}

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return observeReveal(node, () => setShown(true));
  }, []);

  const Component = Tag as "div";
  return (
    <Component ref={ref} className={cn("reveal", shown && "reveal-in", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Component>
  );
}

/* ------------------------------------------------------------------ */
/* Spotlight card — pointer-tracked gold glow                         */
/* ------------------------------------------------------------------ */
export function SpotlightCard({
  children,
  className,
  ticks = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  ticks?: boolean;
  as?: "div" | "article" | "li";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const Component = Tag as "div";
  return (
    <Component
      ref={ref}
      onPointerMove={(e) => {
        // Mouse only: on touch this fired on every finger move and forced a layout read each time.
        if (e.pointerType !== "mouse") return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn("lux-card lux-hover group overflow-hidden", ticks && "ticks", className)}
    >
      <span className="spot" aria-hidden />
      <div className="relative z-[1] h-full">{children}</div>
    </Component>
  );
}

/* ------------------------------------------------------------------ */
/* Eyebrow & section heading                                          */
/* ------------------------------------------------------------------ */
export function Eyebrow({ children, center = false, className }: { children: ReactNode; center?: boolean; className?: string }) {
  return <span className={cn("eyebrow", center && "is-center", className)}>{children}</span>;
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  highlight,
  description,
  align = "center",
  className,
  size = "lg",
}: {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  highlight?: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
  size?: "lg" | "md";
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl text-left", className)}>
      {eyebrow ? (
        <Eyebrow center={align === "center"}>
          {index ? <span className="text-gold-500">{index}</span> : null}
          {index ? <span className="text-smoke">/</span> : null}
          {eyebrow}
        </Eyebrow>
      ) : null}
      <h2
        className={cn(
          "display mt-6",
          size === "lg" ? "text-[2.35rem] leading-[1.04] sm:text-5xl md:text-[3.6rem]" : "text-[2rem] leading-[1.08] sm:text-[2.6rem]",
        )}
      >
        {title} {highlight ? <span className="serif-accent text-gold">{highlight}</span> : null}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-5 text-[15.5px] leading-relaxed text-mist md:text-[17px]",
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
/* Buttons                                                            */
/* ------------------------------------------------------------------ */
type ButtonProps = {
  children: ReactNode;
  to?: string;
  href?: string;
  className?: string;
  type?: "button" | "submit";
  size?: "sm" | "md" | "lg";
  variant?: "gold" | "line" | "ghost";
  arrow?: boolean;
  icon?: string;
  disabled?: boolean;
  onClick?: () => void;
  /** Label recorded as an anonymous cta_click analytics event */
  track?: string;
  "aria-label"?: string;
};

const sizeClass = { sm: "btn-sm", md: "", lg: "btn-lg" } as const;
const variantClass = { gold: "btn-gold shine", line: "btn-line", ghost: "btn-ghost" } as const;

export function Button({
  children,
  to,
  href,
  className,
  type = "button",
  size = "md",
  variant = "gold",
  arrow = false,
  icon,
  disabled,
  onClick,
  track: trackLabel,
  ...rest
}: ButtonProps) {
  const classes = cn("btn group", variantClass[variant], sizeClass[size], className);
  const handle = () => {
    if (trackLabel) track("cta_click", { label: trackLabel });
    onClick?.();
  };
  const content = (
    <>
      {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      <span>{children}</span>
      {arrow ? (
        <Icon name="arrow" className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={2.2} />
      ) : null}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={classes} onClick={handle} aria-label={rest["aria-label"]}>
        {content}
      </Link>
    );
  }
  if (href) {
    const external = /^https?:/i.test(href);
    return (
      <a
        href={href}
        className={classes}
        onClick={handle}
        aria-label={rest["aria-label"]}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </a>
    );
  }
  return (
    <button type={type} onClick={handle} className={classes} disabled={disabled} aria-label={rest["aria-label"]}>
      {content}
    </button>
  );
}

export const PrimaryButton = (p: ButtonProps) => <Button arrow {...p} variant="gold" />;
export const GhostButton = (p: ButtonProps) => <Button {...p} variant="line" />;

/* ------------------------------------------------------------------ */
/* Surfaces & decoration                                              */
/* ------------------------------------------------------------------ */
export function Card({ children, className, hover = true }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={cn("lux-card p-6", hover && "lux-hover", className)}>{children}</div>;
}

export function Glow({ className, color = "rgba(212,173,102,0.22)" }: { className?: string; color?: string }) {
  return <div aria-hidden className={cn("glow-orb", className)} style={{ background: `radial-gradient(closest-side, ${color}, transparent)` }} />;
}

export function Diamond({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/40" />
      <span className="h-2 w-2 rotate-45 border border-gold-400/70" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/40" />
    </div>
  );
}

export function IconTile({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9 rounded-[11px]" : "h-12 w-12";
  const icon = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={cn("icon-tile shrink-0", dims, className)}>
      <Icon name={name} className={icon} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Count-up                                                           */
/* ------------------------------------------------------------------ */
export function CountUp({ value, suffix = "", decimals = 0, className }: { value: number; suffix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / 1600, 1);
          setDisplay(value * (1 - Math.pow(1 - p, 4)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function Stat({ value, suffix = "", label, className }: { value: number | string; suffix?: string; label: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="display text-[2.3rem] leading-none text-ivory md:text-[2.75rem]">
        {typeof value === "number" ? <CountUp value={value} suffix={suffix} /> : value}
      </div>
      <div className="mt-2.5 text-[12px] leading-snug font-medium tracking-[0.04em] text-mist">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee                                                            */
/* ------------------------------------------------------------------ */
export function Marquee({ items, reverse = false, className, gap = "gap-14" }: { items: ReactNode[]; reverse?: boolean; className?: string; gap?: string }) {
  const pauseOffscreen = usePauseOffscreen<HTMLDivElement>();
  return (
    <div ref={pauseOffscreen} className={cn("marquee-mask overflow-hidden", className)}>
      <div className={cn("marquee-track items-center", gap, reverse && "reverse")}>
        {[...items, ...items].map((item, i) => (
          <div key={i} className="shrink-0" aria-hidden={i >= items.length}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page hero (internal pages)                                         */
/* ------------------------------------------------------------------ */
export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  children,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  highlight?: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pt-40 pb-16 md:pt-48 md:pb-24">
      <div className="grid-lines absolute inset-0 opacity-70" aria-hidden />
      <Glow className="-top-40 left-[60%] h-[420px] w-[620px] -translate-x-1/2" color="rgba(212,173,102,0.16)" />
      <div className="shell relative">
        <div className={cn("grid items-end gap-12", aside && "lg:grid-cols-[1.35fr_0.65fr]")}>
          <div className="max-w-3xl">
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="display mt-7 text-[2.7rem] leading-[1.02] sm:text-6xl md:text-[4.6rem]">
                {title} {highlight ? <span className="serif-accent text-gold">{highlight}</span> : null}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-7 max-w-2xl text-[16px] leading-relaxed text-sand md:text-[18px]">{description}</p>
            </Reveal>
            {children ? (
              <Reveal delay={240}>
                <div className="mt-10 flex flex-wrap items-center gap-3.5">{children}</div>
              </Reveal>
            ) : null}
          </div>
          {aside ? <Reveal delay={200}>{aside}</Reveal> : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                    */
/* ------------------------------------------------------------------ */
export function Section({
  children,
  className,
  id,
  tone = "plain",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "plain" | "band";
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative py-24 md:py-32",
        tone === "band" && "border-y border-gold-300/[0.07] bg-ink-900/60",
        className,
      )}
    >
      {children}
    </section>
  );
}
