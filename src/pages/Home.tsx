import HeroCanvas from "../components/HeroCanvas";
import Faq from "../components/Faq";
import { Icon } from "../components/Icons";
import ProjectVisual from "../components/ProjectVisual";
import { TechLogo } from "../components/TechLogo";
import { ClientWordmark } from "../components/Brand";
import { cn } from "../utils/cn";
import {
  Eyebrow,
  GhostButton,
  Glow,
  PrimaryButton,
  Reveal,
  SectionHeading,
  SpotlightCard,
  Stat,
} from "../components/ui";
import {
  clientLogos,
  company,
  credentials,
  heroStats,
  processSteps,
  projects,
  services,
  techStack,
  testimonials,
  whyChooseUs,
} from "../data/content";
import { Link } from "../lib/router";

/* ------------------------------------------------------------------ */
/* Hero Section                                                       */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative min-h-[94vh] flex items-center overflow-hidden pt-36 pb-16 md:pt-44 md:pb-24">
      {/* 3D WebGL Canvas Layer */}
      <HeroCanvas className="absolute inset-0 h-full w-full opacity-75 pointer-events-none" />

      {/* Grid Pattern and Ambient Light */}
      <div className="grid-bg absolute inset-0 pointer-events-none" aria-hidden />
      <Glow className="-top-24 -left-20 h-96 w-96" color="rgba(79,70,229,0.35)" />
      <Glow className="top-1/3 -right-24 h-96 w-96" color="rgba(6,182,212,0.22)" />
      <Glow className="-bottom-32 left-1/3 h-80 w-80" color="rgba(99,102,241,0.18)" />

      <div className="shell relative w-full">
        <div className="grid items-center gap-12 lg:grid-cols-[1.14fr_0.86fr] lg:gap-14">
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <Eyebrow tone="brand">High-Performance Digital Studio</Eyebrow>
                <span className="inline-flex items-center gap-2 rounded-full border border-lime-glow/20 bg-lime-glow/[0.06] px-3.5 py-1.5 font-mono text-[11px] font-medium text-lime-glow backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-glow animate-pulse" />
                  Accepting 2 Projects for Q2/Q3
                </span>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="font-display mt-6 text-[2.75rem] leading-[1.04] font-extrabold tracking-[-0.035em] text-white sm:text-6xl md:text-[4.2rem]">
                We engineer products
                <br />
                that convert users and
                <br />
                <span className="text-gradient">scale without limits.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-slate-300/90 md:text-[18px]">
                {company.name} is an elite digital team uniting world-class web and app development,
                cutting-edge UI/UX design, programmatic SEO, and cinematic motion video.
                Production-grade architecture with zero bloated dependencies.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <PrimaryButton to="/contact">Start a Project</PrimaryButton>
                <GhostButton to="/portfolio">Explore Case Studies</GhostButton>
                <div className="hidden sm:flex items-center gap-2 pl-2 text-xs font-mono text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>SLA Guarantee</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {heroStats.map((s) => (
                  <Stat
                    key={s.label}
                    value={s.value}
                    suffix={s.suffix}
                    decimals={s.decimals ?? 0}
                    label={s.label}
                  />
                ))}
              </div>
            </Reveal>
          </div>

          {/* Interactive Floating Tech Card */}
          <Reveal delay={220} className="hidden lg:block">
            <div className="animate-floaty relative">
              <div className="glass-card ring-glow grad-border rounded-[32px] p-7 backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="font-mono text-[11px] tracking-[0.2em] text-slate-300 uppercase">
                      production_stack.lock
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 font-mono text-[12px] leading-relaxed text-slate-300">
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-slate-400">core_framework</span>
                    <span className="text-aqua-300 font-semibold">"Next.js 15 / React 19"</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-slate-400">type_safety</span>
                    <span className="text-aqua-300 font-semibold">"TypeScript 5.8 Strict"</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-slate-400">design_system</span>
                    <span className="text-aqua-300 font-semibold">"Tailwind CSS v4 + Figma"</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-slate-400">3d_rendering</span>
                    <span className="text-aqua-300 font-semibold">"Three.js / WebGL 2"</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-slate-400">backend_runtime</span>
                    <span className="text-aqua-300 font-semibold">"Node.js + Express API"</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-slate-400">database_engine</span>
                    <span className="text-aqua-300 font-semibold">"PostgreSQL / SQL"</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-slate-400">observability</span>
                    <span className="text-brand-300 font-semibold">"Datadog + Sentry"</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-400">lighthouse_score</span>
                    <span className="text-lime-glow font-bold">99 / 100 All Green</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-2.5 border-t border-white/8 pt-5">
                  {techStack[0].items.slice(0, 8).map((t) => (
                    <TechLogo key={t.name} name={t.name} icon={t.icon} size="sm" />
                  ))}
                </div>
              </div>

              {/* Status pill tag */}
              <div className="glass-card absolute -bottom-6 -left-6 hidden rounded-2xl px-5 py-3.5 sm:block shadow-2xl border border-white/12">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                    <Icon name="check" className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-display text-xs font-bold text-white">Live Pipeline</p>
                    <p className="text-[11px] font-mono text-emerald-400">CI/CD passing · Edge active</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Client Trust Strip                                                 */
/* ------------------------------------------------------------------ */
function ClientStrip() {
  const loop = [...clientLogos, ...clientLogos];
  return (
    <section className="border-y border-white/8 bg-ink-900/60 py-10 backdrop-blur-md">
      <div className="shell mb-6 flex items-center justify-between text-center">
        <p className="w-full font-mono text-[11px] font-medium tracking-[0.24em] text-slate-400 uppercase">
          Trusted by ambitious startups and fast-moving enterprises worldwide
        </p>
      </div>
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track items-center gap-14 px-6">
          {loop.map((name, i) => (
            <ClientWordmark key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Capabilities Grid (5 Verticals)                                    */
/* ------------------------------------------------------------------ */
function Capabilities() {
  return (
    <section className="relative py-24 md:py-32">
      <Glow className="top-24 left-1/2 h-72 w-[600px] -translate-x-1/2" color="rgba(79,70,229,0.18)" />
      <div className="shell relative">
        <Reveal>
          <SectionHeading
            eyebrow="Core Competencies"
            title="Five integrated capabilities,"
            highlight="one singular standard."
            description="Eliminate multi-agency overhead. Our unified senior studio handles your product from initial design tokens to production SQL and launch film."
          />
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={i * 80} className={i === 0 ? "lg:col-span-2" : ""}>
              <SpotlightCard className="h-full p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/12 bg-gradient-to-br from-brand-500/25 to-aqua-500/15 text-brand-300 shadow-inner">
                      <Icon name={s.icon} className="h-6 w-6" />
                    </span>
                    <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                      0{i + 1}
                    </span>
                  </div>

                  <h3 className="font-display mt-6 text-2xl font-bold tracking-tight text-white">{s.title}</h3>
                  <p className="mt-1.5 text-[14px] font-medium text-brand-300">{s.tagline}</p>
                  <p className="mt-3.5 text-[15px] leading-relaxed text-slate-300/80">{s.short}</p>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {s.items.slice(0, i === 0 ? 6 : 4).map((it) => (
                      <li
                        key={it.title}
                        className="rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-slate-300"
                      >
                        {it.title}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-5 border-t border-white/8 flex items-center justify-between">
                  <Link
                    to={`/services/${s.id}`}
                    className="inline-flex items-center gap-2 text-[14px] font-semibold text-white transition-all hover:text-brand-300 hover:gap-3"
                  >
                    <span>View Specifications</span>
                    <span aria-hidden>→</span>
                  </Link>
                  <span className="font-mono text-[11px] text-slate-500 uppercase">{s.deliverable.split("+")[0]}</span>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}

          {/* Scoping CTA Card */}
          <Reveal delay={440}>
            <div className="grad-border relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600/35 via-ink-850 to-aqua-500/20 p-8 shadow-2xl">
              <div className="dot-bg absolute inset-0 opacity-40 pointer-events-none" aria-hidden />
              <div className="relative">
                <span className="inline-block rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-200">
                  Custom Architecture
                </span>
                <h3 className="font-display mt-5 text-2xl font-extrabold tracking-tight text-white">
                  Need a specialized setup?
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-200/90">
                  Whether migrating an enterprise backend, architecting custom WebGL visuals, or optimizing high-volume checkout funnels, let's discuss your scope.
                </p>
              </div>
              <div className="relative mt-8">
                <PrimaryButton to="/contact" className="w-full">
                  Book a Scoping Session
                </PrimaryButton>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Selected Portfolio Work — Premium Bento Showcase                   */
/* ------------------------------------------------------------------ */
function FeaturedWork() {
  const featured = projects.slice(0, 4);
  return (
    <section className="relative border-y border-white/8 bg-ink-900/40 py-24 md:py-32 overflow-hidden">
      {/* Ambient glows */}
      <Glow className="-top-20 left-1/3 h-80 w-80" color="rgba(99,102,241,0.16)" />
      <Glow className="bottom-0 right-1/4 h-72 w-72" color="rgba(6,182,212,0.12)" />

      <div className="shell relative">
        {/* Header row */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Selected Work"
              title="Battle-tested products,"
              highlight="proven metrics."
              description="Real productions delivered for founders and teams. Every card links to a full case study with architecture, stack and outcomes."
            />
          </Reveal>
          <Reveal delay={120}>
            <GhostButton to="/portfolio">Browse All Case Studies</GhostButton>
          </Reveal>
        </div>

        {/* Bento grid — first card spans 2 columns for cinematic emphasis */}
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Featured large card */}
          <Reveal className="lg:row-span-2">
            <Link to={`/work/${featured[0].id}`} className="group block h-full">
              <div className="premium-card relative h-full overflow-hidden rounded-[32px] border border-white/12 bg-gradient-to-b from-white/[0.06] to-white/[0.015]">
                <div className="relative aspect-[16/11] overflow-hidden bg-[#0a0d1a]">
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", featured[0].accent)} />
                  <div className="project-visual absolute inset-0">
                    <ProjectVisual project={featured[0]} />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0d1a] to-transparent" />

                  {/* Badges */}
                  <div className="absolute left-5 top-5 flex gap-2">
                    <span className="animate-float-badge flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 backdrop-blur-md">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-amber-300">
                        <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
                      </svg>
                      <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-amber-200 uppercase">Featured</span>
                    </span>
                    <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-md">
                      {featured[0].category}
                    </span>
                  </div>

                  {/* Hover CTA */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-500 group-hover:bg-black/25 group-hover:opacity-100">
                    <span className="translate-y-3 scale-95 rounded-full bg-white/95 px-6 py-3 font-display text-sm font-bold text-slate-900 shadow-2xl transition-all duration-500 group-hover:translate-y-0 group-hover:scale-100">
                      Read Case Study →
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-7">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-brand-300 uppercase">
                    {featured[0].client} · {featured[0].year}
                  </span>
                  <h3 className="font-display mt-2 text-2xl font-extrabold tracking-tight text-white transition-colors duration-300 group-hover:text-brand-200 sm:text-[26px]">
                    {featured[0].title}
                  </h3>
                  <p className="mt-3 line-clamp-2 text-[14.5px] leading-relaxed text-slate-400">
                    {featured[0].summary}
                  </p>

                  {/* Metrics */}
                  <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
                    {featured[0].metrics.map((m) => (
                      <div key={m.label} className="text-center">
                        <div className="metric-value font-display text-xl font-extrabold">{m.value}</div>
                        <div className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-slate-500 uppercase">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>

          {/* Two stacked smaller cards */}
          <div className="grid gap-6 lg:grid-cols-1">
            {featured.slice(1, 3).map((p, i) => (
              <Reveal key={p.id} delay={120 + i * 90}>
                <Link to={`/work/${p.id}`} className="group block h-full">
                  <div className="premium-card flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] sm:flex-row">
                    <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-[#0a0d1a] sm:aspect-auto sm:w-52">
                      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", p.accent)} />
                      <div className="project-visual absolute inset-0">
                        <ProjectVisual project={p} />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-brand-300 uppercase">
                            {p.client}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{p.year}</span>
                        </div>
                        <h3 className="font-display mt-1.5 text-[17px] font-bold text-white transition group-hover:text-brand-300">
                          {p.title}
                        </h3>
                        <p className="mt-1.5 line-clamp-2 text-[13px] text-slate-400">{p.summary}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
                        <div className="flex gap-3">
                          {p.metrics.slice(0, 2).map((m) => (
                            <div key={m.label}>
                              <span className="metric-value font-display text-sm font-extrabold">{m.value}</span>
                              <span className="ml-1 font-mono text-[9px] tracking-wider text-slate-500 uppercase">{m.label}</span>
                            </div>
                          ))}
                        </div>
                        <span className="text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-aqua-300">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          {/* Fourth card — wide CTA-style */}
          {featured[3] && (
            <Reveal delay={300} className="lg:col-span-2">
              <Link to={`/work/${featured[3].id}`} className="group block h-full">
                <div className="premium-card flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] md:flex-row">
                  <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-[#0a0d1a] md:aspect-auto md:w-72">
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", featured[3].accent)} />
                    <div className="project-visual absolute inset-0">
                      <ProjectVisual project={featured[3]} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-brand-300 uppercase">
                        {featured[3].client} · {featured[3].category}
                      </span>
                      <h3 className="font-display mt-1.5 text-[18px] font-bold text-white transition group-hover:text-brand-300">
                        {featured[3].title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-[13.5px] text-slate-400">{featured[3].summary}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {featured[3].stack.slice(0, 4).map((t) => (
                          <span key={t} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                            {t}
                          </span>
                        ))}
                      </div>
                      <span className="text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-aqua-300">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Production Process                                                 */
/* ------------------------------------------------------------------ */
function Process() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="shell">
        <Reveal>
          <SectionHeading
            eyebrow="Operating Discipline"
            title="A structured sprint cycle"
            highlight="with zero blind spots."
            description="Predictable deliverables, weekly live demonstration calls, and real-time Notion sprint tracking. Here is how your build progresses."
          />
        </Reveal>
        <div className="mt-16 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {processSteps.map((s, i) => (
            <Reveal key={s.step} delay={i * 70}>
              <SpotlightCard className="relative h-full p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-4xl font-extrabold text-white/15">{s.step}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] font-medium text-brand-300">
                      {s.duration}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-[17px] font-bold text-white">{s.title}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-400">{s.desc}</p>
                </div>
                <div className="mt-6 pt-3 border-t border-white/6 flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-aqua-400" />
                  <span>Phase Milestone</span>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Why Novaframe (Trust & Standards)                                  */
/* ------------------------------------------------------------------ */
function WhyUs() {
  return (
    <section className="relative border-y border-white/8 bg-ink-900/40 py-24 md:py-32">
      <Glow className="-top-12 right-0 h-80 w-80" color="rgba(6,182,212,0.18)" />
      <div className="shell relative">
        <Reveal>
          <SectionHeading
            eyebrow="Why Clients Choose Us"
            title="Direct senior talent with"
            highlight="enterprise-grade rigor."
            description="We bridge the gap between slow, bureaucratic big agencies and chaotic freelancers. You get clean engineering and founder-level accountability."
          />
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {whyChooseUs.map((w, i) => (
            <Reveal key={w.title} delay={i * 70}>
              <SpotlightCard className="h-full p-7">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/12 bg-white/[0.04] text-aqua-400">
                  <Icon name={w.icon} className="h-5 w-5" />
                </span>
                <h3 className="font-display mt-6 text-[17px] font-bold text-white">{w.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-400">{w.desc}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>

        {/* Credentials Strip */}
        <Reveal delay={160}>
          <div className="glass-card mt-10 grid gap-px overflow-hidden rounded-3xl bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
            {credentials.map((c) => (
              <div key={c.title} className="group bg-ink-950/80 p-6 transition hover:bg-white/[0.04]">
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-aqua-500 text-white shadow-md">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  <div>
                    <p className="font-display text-[14.5px] font-bold text-white">{c.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{c.desc}</p>
                  </div>
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
/* Testimonials                                                       */
/* ------------------------------------------------------------------ */
function Testimonials() {
  return (
    <section className="py-24 md:py-32">
      <div className="shell">
        <Reveal>
          <SectionHeading
            eyebrow="Founder Testimonials"
            title="Real feedback from leaders"
            highlight="who launched with us."
          />
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 90}>
              <SpotlightCard className="flex h-full flex-col justify-between p-7">
                <div>
                  <div className="flex gap-1 text-amber-300">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <svg key={k} viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-5 text-[15px] leading-relaxed text-slate-200">"{t.quote}"</p>
                </div>
                <div className="mt-8 flex items-center gap-3.5 border-t border-white/8 pt-5">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    loading="lazy"
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-brand-400/30"
                  />
                  <div>
                    <p className="font-display text-[14px] font-bold text-white">{t.name}</p>
                    <p className="text-[12px] text-slate-400">{t.role}</p>
                  </div>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ Section                                                        */
/* ------------------------------------------------------------------ */
function FaqSection() {
  return (
    <section className="border-t border-white/8 bg-ink-900/40 py-24 md:py-32">
      <div className="shell">
        <Reveal>
          <SectionHeading
            eyebrow="Frequently Asked Questions"
            title="Clear answers before"
            highlight="we start any project."
            description="Full transparency protects both parties. Here are the key questions regarding timelines, code ownership, and support."
          />
        </Reveal>
        <Reveal delay={120} className="mt-14">
          <Faq />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom Call to Action Banner                                       */
/* ------------------------------------------------------------------ */
function CtaBand() {
  return (
    <section className="py-24 md:py-28">
      <div className="shell">
        <Reveal>
          <div className="grad-border relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-600/35 via-ink-850 to-aqua-500/20 p-8 md:p-16 shadow-2xl">
            <div className="grid-bg absolute inset-0 opacity-40 pointer-events-none" aria-hidden />
            <Glow className="-bottom-28 -right-12 h-80 w-80" color="rgba(34,211,238,0.25)" />
            <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <Eyebrow tone="aqua">Ready to launch</Eyebrow>
                <h2 className="font-display mt-4 text-3xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl md:text-[2.6rem]">
                  Let's bring your product to market with zero delays.
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-slate-300">
                  Send a brief overview of your goals. You'll receive a detailed written roadmap, verified scope, and a fixed milestone quote within {company.responseTime.toLowerCase()}.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3.5 sm:flex-row">
                <PrimaryButton to="/contact">Start a Project</PrimaryButton>
                <GhostButton to="/portfolio">Explore Work</GhostButton>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <ClientStrip />
      <Capabilities />
      <FeaturedWork />
      <Process />
      <WhyUs />
      <Testimonials />
      <FaqSection />
      <CtaBand />
    </>
  );
}
