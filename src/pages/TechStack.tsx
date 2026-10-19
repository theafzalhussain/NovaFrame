import { Icon } from "../components/Icons";
import { TechLogo } from "../components/TechLogo";
import {
  Eyebrow,
  GhostButton,
  PageHero,
  PrimaryButton,
  Reveal,
  SectionHeading,
  SpotlightCard,
} from "../components/ui";
import { buildPath, techStack } from "../data/content";
import { languages } from "../data/content-extra";

const reasons = [
  { icon: "bolt", title: "Speed is a feature", desc: "Next.js SSR/ISR with edge caching keeps our sites loading in under a second. Google and users both reward that." },
  { icon: "shield", title: "Type safety everywhere", desc: "TypeScript from the frontend through to the database layer — fewer runtime surprises, far more confident refactoring." },
  { icon: "scale", title: "Scales with traffic", desc: "Redis caching, BullMQ queues and SQL indexing are planned upfront, so traffic spikes never take you offline." },
  { icon: "globe", title: "SEO inside the architecture", desc: "Server rendering, structured data and Core Web Vitals are part of the codebase, not a late add-on." },
];

export default function TechStack() {
  return (
    <>
      <PageHero
        eyebrow="Our tech stack"
        title="Modern tools built on"
        highlight="proven architecture."
        description="We use the same stack that high-growth products rely on — HTML5, Tailwind CSS, JavaScript, React, Next.js, TypeScript, Three.js, Node.js, Express and SQL. Here is the complete breakdown, and the reasoning behind it."
      >
        <PrimaryButton to="/contact">Discuss your build</PrimaryButton>
        <GhostButton to="/portfolio">See it in production</GhostButton>
      </PageHero>

      {/* languages matrix */}
      <section className="py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Languages we write"
              title="Every language in our"
              highlight="delivery stack."
              description="This is the exact language breakdown across frontend, backend and database — no buzzwords, just what actually runs in production for our clients."
            />
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-12 overflow-hidden rounded-3xl border border-white/8">
              {/* table head */}
              <div className="hidden grid-cols-[1.1fr_0.7fr_1.3fr_1.6fr] gap-4 border-b border-white/8 bg-white/[0.04] px-6 py-3.5 lg:grid">
                {["Language", "Layer", "What it does here", "Where it lives in this project"].map((h) => (
                  <span
                    key={h}
                    className="font-mono text-[9.5px] tracking-[0.18em] text-slate-500 uppercase"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {languages.map((row, i) => (
                <div
                  key={row.name}
                  className={`grid gap-2 px-5 py-4 transition hover:bg-white/[0.04] lg:grid-cols-[1.1fr_0.7fr_1.3fr_1.6fr] lg:items-center lg:gap-4 lg:px-6 ${
                    i % 2 ? "bg-white/[0.015]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: row.accent }}
                    />
                    <span className="font-display text-[14.5px] font-bold text-white">{row.name}</span>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-2.5 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase ${
                      row.layer === "Frontend"
                        ? "border-brand-400/40 bg-brand-500/15 text-brand-300"
                        : row.layer === "Backend"
                          ? "border-aqua-400/40 bg-aqua-500/12 text-aqua-300"
                          : "border-lime-glow/30 bg-lime-glow/10 text-lime-glow"
                    }`}
                  >
                    {row.layer}
                  </span>
                  <p className="text-[13px] leading-relaxed text-slate-400">{row.role}</p>
                  <p className="font-mono text-[11.5px] leading-relaxed text-slate-500">{row.where}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="glass mt-6 grid gap-px overflow-hidden rounded-3xl bg-white/[0.06] sm:grid-cols-3">
              {[
                { t: "Frontend", d: "HTML5 · CSS3 · Tailwind · JavaScript · TypeScript · React · Three.js" },
                { t: "Backend", d: "Node.js · Express · PHP 8 · PDO · REST · JWT" },
                { t: "Database", d: "SQL · SQLite · MySQL · PostgreSQL · prepared statements" },
              ].map((x) => (
                <div key={x.t} className="bg-ink-950/70 p-5">
                  <p className="font-display text-[13.5px] font-bold text-white">{x.t}</p>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-400">{x.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* build path */}
      <section className="py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="How we build"
              title="The path from foundation"
              highlight="to production."
              description="Every project follows this order. It reduces rework and keeps the launch date predictable."
            />
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-5">
            {buildPath.map((b, i) => (
              <Reveal key={b.title} delay={i * 80}>
                <SpotlightCard className="relative h-full p-5">
                  <span className="font-display grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-aqua-500 text-[13px] font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="font-display mt-4 text-[15px] font-bold text-white">{b.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{b.desc}</p>
                  <p className="mt-3 font-mono text-[10px] text-brand-300/90">{b.tag}</p>
                  {i < buildPath.length - 1 ? (
                    <span className="absolute top-1/2 -right-2 hidden text-white/15 lg:block">→</span>
                  ) : null}
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* stack groups */}
      <section className="border-y border-white/8 bg-ink-900/40 py-16 md:py-24">
        <div className="shell space-y-14">
          {techStack.map((group, gi) => (
            <div key={group.id}>
              <Reveal>
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] tracking-[0.22em] text-aqua-400 uppercase">
                        0{gi + 1}
                      </span>
                      <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-white md:text-3xl">
                        {group.title}
                      </h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{group.blurb}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase">
                    {group.items.length} tools
                  </span>
                </div>
              </Reveal>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {group.items.map((item, i) => (
                  <Reveal key={item.name} delay={i * 50}>
                    <div className="glass glass-hover flex h-full items-center gap-3.5 rounded-2xl p-4">
                      <TechLogo name={item.name} icon={item.icon} />
                      <div className="min-w-0">
                        <p className="font-display truncate text-[14px] font-bold text-white">{item.name}</p>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-slate-400">{item.note}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* why this stack */}
      <section className="py-20 md:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Why this stack"
              title="Chosen for longevity,"
              highlight="not for trends."
              description="We do not chase every new tool. What we use stays, because hiring, hosting and long-term maintenance all remain straightforward with it."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {reasons.map((r, i) => (
              <Reveal key={r.title} delay={i * 80}>
                <SpotlightCard className="h-full p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-500/25 to-aqua-500/10 text-brand-300">
                    <Icon name={r.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="font-display mt-5 text-base font-bold text-white">{r.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-400">{r.desc}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="glass grad-border mt-10 flex flex-col items-center gap-5 rounded-3xl p-7 text-center md:flex-row md:justify-between md:text-left">
              <div>
                <Eyebrow>Custom requirement?</Eyebrow>
                <h3 className="font-display mt-3 text-xl font-bold text-white">
                  We can also work inside your existing stack.
                </h3>
                <p className="mt-2 max-w-xl text-sm text-slate-400">
                  Whether your system runs on PHP, Laravel, Django or anything else — we audit it first and
                  tell you honestly whether a rebuild or an incremental migration is the better investment.
                </p>
              </div>
              <PrimaryButton to="/contact" className="shrink-0">
                Get a tech audit
              </PrimaryButton>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
