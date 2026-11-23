import { useEffect, useRef, useState } from "react";
import HeroCanvas from "../components/HeroCanvas";
import Comparison from "../components/Comparison";
import Estimator from "../components/Estimator";
import Faq from "../components/Faq";
import FoundingProgram from "../components/FoundingProgram";
import ProjectCard, { ProjectLinks, StatusPill } from "../components/ProjectCard";
import ProjectVisual from "../components/ProjectVisual";
import Picture from "../components/Picture";
import Testimonials from "../components/Testimonials";
import { Seal } from "../components/Brand";
import { Icon } from "../components/Icons";
import { StatusDot, useStudioStatus } from "../components/StudioStatus";
import { Button, Eyebrow, IconTile, Marquee, Reveal, SectionHeading, SpotlightCard, Stat } from "../components/ui";
import type { Project } from "../data/types";
import { useContent } from "../lib/content";
import { usePauseOffscreen } from "../lib/onscreen";
import { Link, scrollToId } from "../lib/router";
import { availabilityLabel, hostOf, whatsappLink } from "../lib/site";
import { track } from "../lib/api";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ */
/* Rotating headline word                                             */
/* ------------------------------------------------------------------ */
function Rotator({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only cycles while the headline is on screen and the tab is visible.
    let id = 0;
    let onScreen = true;
    const sync = () => {
      const run = onScreen && !document.hidden;
      if (run && !id) id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), 2800);
      if (!run && id) {
        window.clearInterval(id);
        id = 0;
      }
    };
    const io = new IntersectionObserver((entries) => {
      onScreen = Boolean(entries[0]?.isIntersecting);
      sync();
    });
    if (ref.current) io.observe(ref.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.clearInterval(id);
    };
  }, [words.length]);
  if (!words.length) return null;
  // The gold gradient is applied per word: background-clip:text on the parent
  // would paint through every (hidden) child's glyphs.
  return (
    <span ref={ref} className="rotator serif-accent">
      {words.map((word, i) => {
        const state = i === index ? "active" : (i + 1) % words.length === index ? "prev" : "next";
        return (
          <span key={word + i} data-state={state} aria-hidden={state !== "active"} className="text-gold-shine">
            {word}
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                               */
/* ------------------------------------------------------------------ */
/** Flagship products pinned to the hero, in this order. Missing ones are back-filled from other live projects. */
const HERO_PROJECT_IDS = ["eshopper", "moviezone", "parikshio"];

function heroProjects(projects: Project[]) {
  const isLive = (p: Project) => /^https?:\/\//.test(p.liveUrl ?? "");
  const pinned = HERO_PROJECT_IDS.map((id) => projects.find((p) => p.id === id)).filter((p): p is Project => Boolean(p && isLive(p)));
  const rest = projects.filter((p) => isLive(p) && !pinned.includes(p));
  return [...pinned, ...rest].slice(0, 3);
}

/** "Parikshio - Online Examination Platform" → "Parikshio" (the host line already says what it is). */
const shortTitle = (title: string) => title.split(/\s+[-–—|:]\s+/)[0].trim();

/** Soft gold light that follows the mouse across the hero. Mouse only; no React re-renders. */
function useHeroSpotlight() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = el.parentElement;
    if (!host) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = host.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty("--hx", `${x}px`);
          el.style.setProperty("--hy", `${y}px`);
          el.style.opacity = "1";
        });
    };
    const onLeave = () => (el.style.opacity = "0");
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return ref;
}

function Hero() {
  const spotlight = useHeroSpotlight();
  const { settings, collections } = useContent();
  const status = useStudioStatus();
  const live = heroProjects(collections.projects);
  const pauseOffscreen = usePauseOffscreen(); // headline shimmer, floating cards and pulses stop once scrolled away

  return (
    <section ref={pauseOffscreen} className="relative flex min-h-[100svh] items-center overflow-hidden pt-36 pb-24 lg:pt-32 lg:pb-28">
      {/* Cursor spotlight (desktop mouse only) */}
      <div
        ref={spotlight}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-700"
        style={{ background: "radial-gradient(520px circle at var(--hx, 50%) var(--hy, 50%), rgb(227 200 140 / 0.07), transparent 65%)" }}
      />
      <div className="pointer-events-none absolute inset-0 lg:left-[36%]">
        <HeroCanvas className="hero-canvas h-full w-full opacity-45 lg:opacity-100" />
      </div>
      {/* Atmosphere: warm aura behind the instrument and a fine gold hairline grid that fades out */}
      <div
        className="pointer-events-none absolute inset-0 lg:left-[30%]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 52% 58% at 62% 46%, rgb(212 173 102 / 0.14), transparent 70%), radial-gradient(ellipse 30% 30% at 80% 20%, rgb(227 200 140 / 0.06), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_70%_60%_at_65%_45%,#000,transparent_75%)]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgb(227 200 140 / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(227 200 140 / 0.05) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/75 to-transparent lg:via-ink-950/30" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink-950 to-transparent" aria-hidden />

      <div className="shell relative w-full">
        <div className="max-w-[47rem]">
          <Reveal immediate>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Eyebrow>{settings.hero.eyebrow}</Eyebrow>
              {/* Studio coordinates: a quiet nod to the instrument in the scene */}
              <span className="hidden items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] text-smoke md:inline-flex" aria-hidden>
                <span className="h-1 w-1 rotate-45 bg-gold-400/70" />
                {"28.61\u00b0N \u00b7 77.21\u00b0E"}
              </span>
            </div>
          </Reveal>
          <Reveal immediate delay={90}>
            <h1 className="display mt-8 text-[2.9rem] leading-[0.98] sm:text-[4.4rem] lg:text-[5.4rem] lg:[text-shadow:0_0_24px_rgb(8_7_6/0.9),0_0_60px_rgb(8_7_6/0.7)]">
              {settings.hero.title}
              <br />
              <Rotator words={settings.hero.rotating} />
            </h1>
          </Reveal>
          <Reveal immediate delay={170}>
            <p className="mt-8 max-w-xl text-[16.5px] leading-relaxed text-sand md:text-[19px] lg:[text-shadow:0_0_14px_rgb(8_7_6/0.95),0_0_32px_rgb(8_7_6/0.85)]">{settings.hero.subtitle}</p>
          </Reveal>
          <Reveal immediate delay={250}>
            <div className="mt-11 flex flex-wrap items-center gap-3.5">
              <Button to="/book" size="lg" arrow track="hero_book">
                Book a free strategy call
              </Button>
              <Button to="/work" size="lg" variant="line" track="hero_work">
                See live work
              </Button>
            </div>
            <div className="hero-meta mt-7 inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-full px-4 py-2 text-[13px] text-mist">
              <span className="inline-flex items-center gap-2">
                <StatusDot online={status.online} />
                {availabilityLabel(settings)}
              </span>
              <span className="hidden h-3 w-px bg-gold-300/20 sm:block" />
              <a
                href={whatsappLink(settings)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("cta_click", { label: "hero_whatsapp" })}
                className="inline-flex items-center gap-2 text-parchment transition hover:text-gold-200"
              >
                <Icon name="whatsapp" className="h-4 w-4 text-gold-300" /> WhatsApp the founder
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={330}>
          <div className="hero-instrument mt-16 max-w-3xl lg:mt-20">
            <span className="hero-corner top-2.5 left-2.5 border-t border-l" aria-hidden />
            <span className="hero-corner top-2.5 right-2.5 border-t border-r" aria-hidden />
            <span className="hero-corner bottom-2.5 left-2.5 border-b border-l" aria-hidden />
            <span className="hero-corner right-2.5 bottom-2.5 border-r border-b" aria-hidden />
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {settings.stats.map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "relative px-6 pt-8 pb-7 sm:px-7",
                    i % 2 === 1 && "border-l border-gold-300/[0.08]",
                    i >= 2 && "border-t border-gold-300/[0.08] sm:border-t-0",
                    i === 2 && "sm:border-l",
                  )}
                >
                  <span className="absolute top-3.5 right-4 font-mono text-[9.5px] tracking-[0.2em] text-gold-300/45" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Stat value={s.value} suffix={s.suffix} label={s.label} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Live products floating over the sphere */}
      <div className="absolute right-[4%] bottom-[10%] hidden w-[286px] flex-col gap-3 xl:flex">
        <p className="label flex items-center gap-2 pl-1 text-[10px] text-gold-300/80">
          <span className="h-px w-6 bg-gold-400/60" /> Live in production
        </p>
        {live.map((p, i) => (
          <a
            key={p.id}
            href={p.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("cta_click", { label: `hero_live_${p.id}` })}
            className={cn(
              "lux-glass group relative flex items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-gold-300/45 hover:shadow-[0_18px_50px_-18px_rgb(212_173_102/0.35)]",
              i === 1 ? "animate-floaty-slow -translate-x-6" : i === 2 ? "animate-floaty [animation-delay:-4s]" : "animate-floaty",
            )}
          >
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/40 to-transparent" />
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-gold-300/15 bg-ink-850">
              {p.cover ? <Picture src={p.cover} alt="" sizes="44px" className="h-full w-full object-cover object-top" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ivory">
                <span className="truncate">{shortTitle(p.title)}</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage animate-pulse-dot" />
              </span>
              <span className="block truncate font-mono text-[10.5px] text-mist">{hostOf(p.liveUrl).replace(/^www\./, "")}</span>
            </span>
            <Icon name="arrow-up-right" className="h-4 w-4 text-gold-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ))}
      </div>
      <button
        type="button"
        onClick={() => scrollToId("proof")}
        className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-smoke transition hover:text-gold-200 md:flex"
        aria-label="Scroll to content"
      >
        <span className="label text-[9.5px]">Scroll</span>
        <span className="scroll-cue h-10 w-px bg-gradient-to-b from-gold-400/70 to-transparent" />
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Proof strip                                                        */
/* ------------------------------------------------------------------ */
function ProofStrip() {
  const { collections } = useContent();
  const products = collections.projects.map((p) => (
    <span key={p.id} className="flex items-center gap-14">
      <span className="flex items-baseline gap-3">
        <span className="display serif-accent text-[1.65rem] text-parchment">{p.title}</span>
        <span className="font-mono text-[11px] text-smoke">{hostOf(p.liveUrl) || p.category}</span>
      </span>
      <span className="h-1.5 w-1.5 rotate-45 bg-gold-500/70" />
    </span>
  ));
  const tools = Array.from(new Set(collections.projects.flatMap((p) => p.stack))).slice(0, 22);

  return (
    <section id="proof" className="relative border-y border-gold-300/[0.08] bg-ink-950/70 py-10">
      <span aria-hidden className="pointer-events-none absolute inset-x-[12%] -top-px h-px bg-gradient-to-r from-transparent via-gold-300/45 to-transparent" />
      <p className="label mb-7 flex items-center justify-center gap-3">
        <span aria-hidden className="h-px w-8 bg-gradient-to-r from-transparent to-gold-400/60" />
        Live in production — open any of them
        <span aria-hidden className="h-px w-8 bg-gradient-to-l from-transparent to-gold-400/60" />
      </p>
      <Marquee items={products} gap="gap-14" />
      <Marquee
        className="mt-6"
        reverse
        gap="gap-10"
        items={tools.map((t) => (
          <span key={t} className="font-mono text-[11.5px] tracking-[0.18em] text-smoke uppercase">
            {t}
          </span>
        ))}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Services                                                           */
/* ------------------------------------------------------------------ */
function ServicesSection() {
  const { collections } = useContent();
  const services = collections.services;
  return (
    <section className="relative py-28 md:py-36">
      <div className="shell">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <SectionHeading
              align="left"
              index="01"
              eyebrow="Services"
              title="Six disciplines."
              highlight="One accountable studio."
              description="No multi-vendor juggling. We take a product from the first design token to the production database — and the launch film."
            />
          </Reveal>
          <Reveal delay={100}>
            <Button to="/services" variant="line" arrow>
              All services
            </Button>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 80} className={cn(i === 0 && "lg:col-span-2")}>
              <SpotlightCard className="h-full" ticks={i === 0}>
                <Link to={`/services/${s.id}`} className="flex h-full flex-col p-7 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <IconTile name={s.icon} size="lg" />
                    <span className="display serif-accent text-[2.6rem] leading-none text-gold-300/25">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="display mt-8 text-[1.85rem] leading-tight">{s.title}</h3>
                  <p className="mt-2 text-[14px] font-medium text-gold-300/85">{s.tagline}</p>
                  <p className="mt-4 text-[14.5px] leading-relaxed text-mist">{s.short}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {s.items.slice(0, i === 0 ? 6 : 3).map((it) => (
                      <li key={it.title} className="chip">
                        {it.title}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-center justify-between border-t border-gold-300/10 pt-5 text-[13px]">
                    <span className="text-mist">
                      From <span className="font-semibold text-parchment">{s.startingAt}</span> · {s.timeline}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-gold-200 transition-all group-hover:gap-2.5">
                      Explore <Icon name="arrow" className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </SpotlightCard>
            </Reveal>
          ))}

          {/* First card spans two columns, so the grid holds services.length + 1 cells before this tile. */}
          <Reveal delay={160} className={cn({ 0: "lg:col-span-3", 1: "lg:col-span-2", 2: "" }[(services.length + 1) % 3])}>
            <div className="lux-card gold-edge relative flex h-full flex-col justify-between gap-8 overflow-hidden p-8 md:flex-row md:items-center">
              <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
              <div className="relative max-w-lg">
                <span className="chip chip-gold">Not sure what you need?</span>
                <h3 className="display mt-5 text-[1.9rem] leading-tight">
                  Get a transparent estimate <span className="serif-accent text-gold">in 30 seconds.</span>
                </h3>
                <p className="mt-3 text-[14.5px] text-mist">No email required. Turn it into a fixed, written quote when you're ready.</p>
              </div>
              <button type="button" onClick={() => scrollToId("estimator")} className="btn btn-gold shine relative shrink-0">
                Open the estimator <Icon name="arrow-down" className="h-3.5 w-3.5" />
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Selected work                                                      */
/* ------------------------------------------------------------------ */
function FeatureRow({ project, index, total, flip }: { project: Project; index: number; total: number; flip: boolean }) {
  return (
    <article className="lux-card lux-hover group grid overflow-hidden lg:grid-cols-[1.15fr_0.85fr]">
      <Link
        to={`/work/${project.id}`}
        className={cn("relative block aspect-[16/11] overflow-hidden border-gold-300/10 lg:aspect-auto lg:min-h-[480px]", flip ? "lg:order-2 lg:border-l" : "lg:border-r")}
        aria-label={`${project.title} case study`}
      >
        <ProjectVisual project={project} />
        <div className="absolute bottom-4 left-4">
          <StatusPill status={project.status} />
        </div>
      </Link>
      <div className="flex flex-col p-7 md:p-10">
        <div className="flex items-center justify-between">
          <span className="label text-gold-400">{project.category}</span>
          <span className="font-mono text-[11px] text-smoke">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
        <h3 className="display mt-5 text-[2.4rem] leading-none md:text-[2.9rem]">{project.title}</h3>
        <p className="mt-3 text-[15px] font-medium text-gold-300/85">{project.subtitle}</p>
        <p className="mt-5 text-[15px] leading-relaxed text-mist">{project.summary}</p>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-gold-300/10 pt-7">
          {project.metrics.slice(0, 4).map((m) => (
            <div key={m.label}>
              <div className="display text-gold text-[1.9rem] leading-none">{m.value}</div>
              <div className="mt-1.5 text-[12px] text-smoke">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-1.5">
          {project.stack.slice(0, 6).map((t) => (
            <span key={t} className="rounded-md border border-gold-300/10 px-2 py-1 font-mono text-[10.5px] text-mist">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
          <ProjectLinks project={project} />
          <Link to={`/work/${project.id}`} className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-gold-200 transition-all hover:gap-3">
            Read the case study <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function SelectedWork() {
  const { collections } = useContent();
  const featured = collections.projects.filter((p) => p.featured);
  const list = (featured.length ? featured : collections.projects).slice(0, 4);
  const liveCount = collections.projects.filter((p) => p.liveUrl).length;
  return (
    <section className="relative border-y border-gold-300/[0.07] bg-ink-900/50 py-28 md:py-36">
      <div className="shell">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <SectionHeading
              align="left"
              index="02"
              eyebrow="Selected work"
              title={`${liveCount} live products.`}
              highlight="Every one of them clickable."
              description="Not mock-ups, not borrowed logos. Real products with real APIs, failure handling and measured performance — the standard we bring to every client build."
            />
          </Reveal>
          <Reveal delay={100}>
            <Button to="/work" variant="line" arrow>
              All work
            </Button>
          </Reveal>
        </div>

        <div className="mt-16 space-y-6">
          {list.slice(0, 2).map((p, i) => (
            <Reveal key={p.id}>
              <FeatureRow project={p} index={i} total={list.length} flip={i % 2 === 1} />
            </Reveal>
          ))}
        </div>
        {list.length > 2 ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {list.slice(2).map((p, i) => (
              <Reveal key={p.id} delay={i * 90}>
                <ProjectCard project={p} />
              </Reveal>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Why us — proof, code, comparison, guarantees                       */
/* ------------------------------------------------------------------ */
function WhyUs() {
  const { collections } = useContent();

  return (
    <section className="relative py-28 md:py-36">
      <div className="shell">
        <Reveal>
          <SectionHeading
            index="03"
            eyebrow="Why WebXstudio"
            title="Agency-grade craft."
            highlight="Founder-level accountability."
            description="We sit between slow, expensive agencies and unpredictable freelancers: clean engineering, direct access to the person building it, and pricing a growing business can plan around."
          />
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-[26px] border border-gold-300/10 bg-gold-300/10 md:grid-cols-2 lg:grid-cols-3">
          {collections.whyUs.map((w, i) => (
            <Reveal key={w.id} delay={(i % 3) * 70} className="h-full">
              <div className="why-cell group h-full bg-ink-950 p-8 transition-colors duration-500 hover:bg-ink-900">
                <div className="flex items-center justify-between">
                  <IconTile name={w.icon} className="transition duration-500 group-hover:-translate-y-0.5" />
                  <span className="font-mono text-[11px] text-smoke transition-colors duration-500 group-hover:text-gold-300">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-7 text-[18px] font-semibold text-ivory">{w.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-mist">{w.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <div className="mt-20">
            <p className="label mb-6 text-center">How we compare</p>
            <Comparison />
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.guarantees.map((g) => (
              <div key={g.id} className="lux-inset flex items-start gap-4 rounded-2xl p-5 transition-colors duration-500 hover:border-gold-300/25 hover:bg-gold-300/[0.04]">
                <IconTile name={g.icon} size="sm" />
                <div>
                  <p className="text-[14.5px] font-semibold text-ivory">{g.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-mist">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Process                                                            */
/* ------------------------------------------------------------------ */
function ProcessSection() {
  const { collections } = useContent();
  const steps = collections.process;
  return (
    <section className="relative border-y border-gold-300/[0.07] bg-ink-900/50 py-28 md:py-36">
      <div className="shell">
        <Reveal>
          <SectionHeading
            index="04"
            eyebrow="How we work"
            title="From first call to launch —"
            highlight="in writing, every step."
            description="Predictable deliverables, a live demo every week and a shared board you can check any time."
          />
        </Reveal>

        <div className="relative mt-20">
          {/* The rail draws itself in once the steps reveal, then a glint of light runs along it. */}
          <Reveal className="absolute top-[27px] right-[10%] left-[10%] hidden lg:block">
            <div className="process-rail h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" aria-hidden />
          </Reveal>
          <ol className="grid gap-10 lg:gap-6" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(190px, 1fr))` }}>
            {steps.map((s, i) => (
              <Reveal key={s.id} as="li" delay={i * 90} className="group relative text-left lg:text-center">
                <div className="flex items-center gap-4 lg:flex-col lg:gap-0">
                  <span className="relative z-[1] grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold-300/40 bg-ink-950 bg-[radial-gradient(circle_at_35%_30%,rgb(227_200_140/0.14),transparent_70%)] font-display text-[1.15rem] text-gold-200 shadow-[0_0_0_6px_rgba(8,7,6,1)] transition duration-500 group-hover:border-gold-200/80 group-hover:text-ivory group-hover:shadow-[0_0_0_6px_rgba(8,7,6,1),0_0_30px_rgba(212,173,102,0.45)]">
                    {s.step}
                  </span>
                  <span className="chip lg:mt-6">{s.duration}</span>
                </div>
                <h3 className="mt-5 text-[17px] font-semibold text-ivory">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-mist lg:mx-auto lg:max-w-[230px]">{s.desc}</p>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={120}>
          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collections.rhythm.map((r) => (
              <div key={r.id} className="lux-card lux-hover group p-6">
                <Icon name={r.icon} className="h-5 w-5 text-gold-300 transition duration-500 group-hover:-translate-y-0.5 group-hover:text-gold-200" />
                <p className="mt-4 text-[15px] font-semibold text-ivory">{r.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist">{r.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Estimator                                                          */
/* ------------------------------------------------------------------ */
function EstimatorSection() {
  return (
    <section id="estimator" className="relative scroll-mt-28 py-28 md:py-36">
      <div className="shell">
        <Reveal>
          <SectionHeading
            index="05"
            eyebrow="Instant estimate"
            title="Know the ballpark"
            highlight="before you call."
            description="Most studios hide pricing behind a form. Tell us what you're building and see a transparent range and timeline — then turn it into a fixed quote."
          />
        </Reveal>
        <Reveal delay={120} className="mt-14">
          <Estimator />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Founder                                                            */
/* ------------------------------------------------------------------ */
function FounderSection() {
  const { collections, settings } = useContent();
  const founder = collections.team[0];
  if (!founder) return null;
  return (
    <section className="relative overflow-hidden border-y border-gold-300/[0.07] bg-ink-900/50 py-28 md:py-36">
      <div className="shell grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <Reveal>
          <div className="relative mx-auto w-full max-w-[420px]">
            {/* soft glow behind the portrait */}
            <div aria-hidden className="portrait-glow pointer-events-none absolute -inset-5 -z-10 rounded-[40px] bg-gold-400/10 blur-3xl" />
            <figure className="portrait-frame group relative aspect-[4/5] overflow-hidden rounded-[28px] bg-ink-850 shadow-2xl shadow-black/40 ring-1 ring-gold-300/15">
              {founder.photo ? (
                <Picture
                  src={founder.photo}
                  alt={`${founder.name}, ${founder.role}`}
                  sizes="(min-width: 1024px) 460px, 90vw"
                  className="h-full w-full object-cover object-[50%_22%] transition duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="display text-gold grid h-full place-items-center text-[6rem]">{founder.initials}</div>
              )}
              {/* readability gradient */}
              <div className="absolute inset-x-0 bottom-0 z-[4] h-2/5 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
              {/* name plate */}
              <figcaption className="absolute inset-x-6 bottom-6 z-[5] flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="display text-[1.6rem] leading-none text-ivory">{founder.name}</p>
                    <p className="mt-1.5 text-[12.5px] font-medium tracking-wide text-gold-200">{founder.role}</p>
                  </div>
                  <span className="chip shrink-0">
                    <Icon name="map-pin" className="h-3.5 w-3.5 text-gold-300" /> {founder.location ?? settings.city}
                  </span>
                </div>
                {founder.links?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {founder.links.map((l) => (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={l.label}
                        className="lux-glass grid h-10 w-10 place-items-center rounded-full text-parchment transition hover:scale-105 hover:text-gold-200"
                      >
                        <Icon name={l.label.toLowerCase() === "portfolio" ? "globe" : l.label.toLowerCase()} className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </figcaption>
            </figure>
            <Seal size={120} className="absolute -top-6 -right-6 hidden drop-shadow-lg sm:block" />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <SectionHeading align="left" index="06" eyebrow="Meet the founder" title="The person who answers" highlight="is the person who builds." size="md" />
          </Reveal>
          <Reveal delay={60}>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3.5 py-1.5 text-[12px] font-medium text-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Available for new projects
              </span>
              {founder.focus ? <span className="chip">{founder.focus}</span> : null}
            </div>
          </Reveal>
          <Reveal delay={90}>
            <p className="mt-7 text-[16px] leading-relaxed text-sand">{founder.bio}</p>
          </Reveal>
          {founder.quote ? (
            <Reveal delay={150}>
              <blockquote className="relative mt-8 border-l border-gold-400/60 pl-6">
                <p className="display serif-accent text-[1.4rem] leading-snug text-gold-100">“{founder.quote}”</p>
              </blockquote>
            </Reveal>
          ) : null}
          {founder.credentials?.length ? (
            <Reveal delay={200}>
              <ul className="mt-9 grid gap-3 sm:grid-cols-2">
                {founder.credentials.map((c) => (
                  <li key={c.title} className="flex items-start gap-3">
                    <Icon name="award" className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                    <span>
                      <span className="block text-[13.5px] font-semibold text-parchment">{c.title}</span>
                      <span className="block text-[12px] text-smoke">
                        {c.org}
                        {c.year ? ` · ${c.year}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}
          <Reveal delay={250}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button to="/book" arrow track="founder_book">
                Book a call with {founder.name.split(" ")[0]}
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                */
/* ------------------------------------------------------------------ */
function FaqSection({ index }: { index: string }) {
  return (
    <section className="relative py-28 md:py-36">
      <div className="shell">
        <Reveal>
          <SectionHeading
            index={index}
            eyebrow="Questions"
            title="Everything you'd ask"
            highlight="before starting."
            description="Full transparency protects both sides — including the question about trusting a young studio."
          />
        </Reveal>
        <Reveal delay={120} className="mt-14">
          <Faq limit={6} />
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-10 text-center text-[14px] text-mist">
            Still curious?{" "}
            <Link to="/pricing" className="font-semibold text-gold-200 underline-offset-4 hover:underline">
              See every answer
            </Link>{" "}
            or{" "}
            <Link to="/contact" className="font-semibold text-gold-200 underline-offset-4 hover:underline">
              ask us directly
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  const { collections } = useContent();
  const hasTestimonials = collections.testimonials.length > 0;
  return (
    <>
      <Hero />
      <ProofStrip />
      <ServicesSection />
      <SelectedWork />
      <WhyUs />
      <ProcessSection />
      <EstimatorSection />
      <FounderSection />
      <FoundingProgram />
      <Testimonials index="07" />
      <FaqSection index={hasTestimonials ? "08" : "07"} />
    </>
  );
}
