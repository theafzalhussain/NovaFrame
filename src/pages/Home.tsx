import { useEffect, useRef, useState } from "react";
import HeroCanvas from "../components/HeroCanvas";
import Comparison from "../components/Comparison";
import Estimator from "../components/Estimator";
import Faq from "../components/Faq";
import FoundingProgram from "../components/FoundingProgram";
import ProjectCard, { ProjectLinks, StatusPill } from "../components/ProjectCard";
import ProjectVisual from "../components/ProjectVisual";
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
function Hero() {
  const { settings, collections } = useContent();
  const status = useStudioStatus();
  const live = collections.projects.filter((p) => p.liveUrl).slice(0, 2);
  const pauseOffscreen = usePauseOffscreen(); // headline shimmer, floating cards and pulses stop once scrolled away

  return (
    <section ref={pauseOffscreen} className="relative flex min-h-[100svh] items-center overflow-hidden pt-36 pb-20 lg:pt-32">
      <div className="pointer-events-none absolute inset-0 lg:left-[36%]">
        <HeroCanvas className="hero-canvas h-full w-full opacity-45 lg:opacity-100" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/75 to-transparent lg:via-ink-950/30" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink-950 to-transparent" aria-hidden />

      <div className="shell relative w-full">
        <div className="max-w-[47rem]">
          <Reveal>
            <Eyebrow>{settings.hero.eyebrow}</Eyebrow>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="display mt-8 text-[2.9rem] leading-[0.98] sm:text-[4.4rem] lg:text-[5.4rem]">
              {settings.hero.title}
              <br />
              <Rotator words={settings.hero.rotating} />
            </h1>
          </Reveal>
          <Reveal delay={170}>
            <p className="mt-8 max-w-xl text-[16.5px] leading-relaxed text-sand md:text-[19px] lg:[text-shadow:0_0_14px_rgb(8_7_6/0.95),0_0_32px_rgb(8_7_6/0.85)]">{settings.hero.subtitle}</p>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-11 flex flex-wrap items-center gap-3.5">
              <Button to="/book" size="lg" arrow track="hero_book">
                Book a free strategy call
              </Button>
              <Button to="/work" size="lg" variant="line" track="hero_work">
                See live work
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-mist">
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
          <div className="mt-20 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-10 border-t border-gold-300/10 pt-10 sm:grid-cols-4">
            {settings.stats.map((s) => (
              <Stat key={s.label} value={s.value} suffix={s.suffix} label={s.label} />
            ))}
          </div>
        </Reveal>
      </div>

      {/* Live products floating over the sphere */}
      <div className="absolute right-[5%] bottom-[16%] hidden flex-col gap-3 xl:flex">
        {live.map((p, i) => (
          <a
            key={p.id}
            href={p.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("cta_click", { label: `hero_live_${p.id}` })}
            className={cn(
              "lux-glass group flex w-[270px] items-center gap-3.5 rounded-2xl px-4 py-3.5 transition hover:border-gold-300/40",
              i === 0 ? "animate-floaty" : "animate-floaty-slow translate-x-10",
            )}
          >
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-gold-300/15 bg-ink-850">
              {p.cover ? <img src={p.cover} alt="" className="h-full w-full object-cover object-top" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ivory">
                {p.title}
                <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse-dot" />
              </span>
              <span className="block truncate font-mono text-[10.5px] text-mist">{hostOf(p.liveUrl)}</span>
            </span>
            <Icon name="arrow-up-right" className="h-4 w-4 text-gold-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollToId("proof")}
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-smoke transition hover:text-gold-200 md:flex"
        aria-label="Scroll to content"
      >
        <span className="label text-[9.5px]">Scroll</span>
        <span className="h-10 w-px bg-gradient-to-b from-gold-400 to-transparent" />
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
      <p className="label mb-7 text-center">Live in production — open any of them</p>
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
  const { collections, settings } = useContent();
  const repos = collections.projects.filter((p) => p.repoUrl);
  const github = settings.socials.find((s) => s.icon === "github")?.href;

  return (
    <section className="relative py-28 md:py-36">
      <div className="shell">
        <Reveal>
          <SectionHeading
            index="03"
            eyebrow="Why Novaframe"
            title="Agency-grade craft."
            highlight="Founder-level accountability."
            description="We sit between slow, expensive agencies and unpredictable freelancers: clean engineering, direct access to the person building it, and pricing a growing business can plan around."
          />
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-[26px] border border-gold-300/10 bg-gold-300/10 md:grid-cols-2 lg:grid-cols-3">
          {collections.whyUs.map((w, i) => (
            <Reveal key={w.id} delay={(i % 3) * 70} className="h-full">
              <div className="group h-full bg-ink-950 p-8 transition-colors hover:bg-ink-900">
                <div className="flex items-center justify-between">
                  <IconTile name={w.icon} />
                  <span className="font-mono text-[11px] text-smoke">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-7 text-[18px] font-semibold text-ivory">{w.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-mist">{w.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Inspect the code */}
        <Reveal delay={80}>
          <div className="lux-card mt-8 grid gap-10 overflow-hidden p-8 md:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="eyebrow">Inspect before you hire</span>
              <h3 className="display mt-6 text-[2.1rem] leading-tight md:text-[2.5rem]">
                Our code is public. <span className="serif-accent text-gold">Read it before you sign.</span>
              </h3>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-mist">
                It's the most honest pitch a studio can make. Every product we showcase has an open repository — architecture, commits and all.
              </p>
              {github ? (
                <Button href={github} variant="line" icon="github" className="mt-8" track="why_github">
                  View GitHub profile
                </Button>
              ) : null}
            </div>
            <ul className="divide-y divide-gold-300/[0.08] rounded-2xl border border-gold-300/10 bg-ink-950/60">
              {repos.map((p) => (
                <li key={p.id}>
                  <a
                    href={p.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("cta_click", { label: `repo_list_${p.id}` })}
                    className="group flex items-center gap-4 px-5 py-4 transition hover:bg-gold-300/[0.04]"
                  >
                    <Icon name="github" className="h-5 w-5 shrink-0 text-gold-300" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[12.5px] text-parchment">{p.repoUrl?.replace(/^https?:\/\/(www\.)?github\.com\//, "")}</span>
                      <span className="block truncate text-[12px] text-smoke">{p.stack.slice(0, 4).join(" · ")}</span>
                    </span>
                    <Icon name="arrow-up-right" className="h-4 w-4 shrink-0 text-smoke transition group-hover:text-gold-200" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-20">
            <p className="label mb-6 text-center">How we compare</p>
            <Comparison />
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.guarantees.map((g) => (
              <div key={g.id} className="lux-inset flex items-start gap-4 rounded-2xl p-5">
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
          <div className="absolute top-[27px] right-[10%] left-[10%] hidden h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent lg:block" aria-hidden />
          <ol className="grid gap-10 lg:gap-6" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(190px, 1fr))` }}>
            {steps.map((s, i) => (
              <Reveal key={s.id} as="li" delay={i * 90} className="relative text-left lg:text-center">
                <div className="flex items-center gap-4 lg:flex-col lg:gap-0">
                  <span className="relative z-[1] grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold-300/40 bg-ink-950 font-display text-[1.15rem] text-gold-200 shadow-[0_0_0_6px_rgba(8,7,6,1)]">
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
              <div key={r.id} className="lux-card p-6">
                <Icon name={r.icon} className="h-5 w-5 text-gold-300" />
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
            <div className="gold-edge relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[28px] bg-ink-850">
              {founder.photo ? (
                <img src={founder.photo} alt={`${founder.name}, ${founder.role}`} className="h-full w-full object-cover object-[50%_30%]" loading="lazy" />
              ) : (
                <div className="display text-gold grid h-full place-items-center text-[6rem]">{founder.initials}</div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950/90 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 flex items-end justify-between">
                <div>
                  <p className="display text-[1.6rem] leading-none">{founder.name}</p>
                  <p className="mt-1.5 text-[12.5px] text-gold-200">{founder.role}</p>
                </div>
                <span className="chip">
                  <Icon name="map-pin" className="h-3.5 w-3.5 text-gold-300" /> {founder.location ?? settings.city}
                </span>
              </div>
            </div>
            <Seal size={128} className="absolute -top-6 -right-6 hidden sm:block" />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <SectionHeading align="left" index="06" eyebrow="Meet the founder" title="The person who answers" highlight="is the person who builds." size="md" />
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
              {founder.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gold-300/20 px-4 py-2.5 text-[13px] font-semibold text-parchment transition hover:border-gold-300/60 hover:text-gold-200"
                >
                  <Icon name={l.label.toLowerCase() === "portfolio" ? "globe" : l.label.toLowerCase()} className="h-4 w-4" />
                  {l.label}
                </a>
              ))}
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
