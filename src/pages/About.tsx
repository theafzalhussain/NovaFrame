import { Icon } from "../components/Icons";
import { Logo } from "../components/Brand";
import {
  Eyebrow,
  GhostButton,
  Glow,
  PageHero,
  PrimaryButton,
  Reveal,
  SectionHeading,
  SpotlightCard,
  Stat,
} from "../components/ui";
import { buildPath, company, heroStats, studioImages, team } from "../data/content";

const values = [
  { icon: "target", title: "Outcomes over output", desc: "A finished website is not success. Success is leads, speed and retention — every decision is driven by that metric." },
  { icon: "shield", title: "Engineering honesty", desc: "If something will not scale or will be painful to maintain, we say it upfront, even when it shrinks the deal." },
  { icon: "sparkle", title: "Craft is non-negotiable", desc: "An 8px misalignment, a 300ms lag, one awkward line of copy — none of it is minor. The detail is the brand." },
  { icon: "chat", title: "Over-communicate", desc: "Weekly demos, a shared board and written decisions. A client should never have to ask what is happening." },
];

const timeline = [
  { year: "2023", title: "One laptop, three people", desc: "We started with freelance engagements. Our first client was a D2C brand whose store we rebuilt from zero." },
  { year: "2024", title: "Product thinking arrived", desc: "Web and mobile applications entered the mix. We formalised our design system and QA process." },
  { year: "2025", title: "Became a studio", desc: "Video and SEO verticals were added, giving every brand a complete digital launch from one team." },
  { year: "Next", title: "Your project", desc: "We only take on work where we genuinely believe we can move a number that matters to you." },
];

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="The studio"
        title="A small team holding"
        highlight="large production standards."
        description={`${company.name} is a deliberately compact studio of three senior specialists. Staying small is a choice — it means every project gets founder-level attention and quality is never delegated downwards.`}
      >
        <PrimaryButton to="/contact">Work with us</PrimaryButton>
        <GhostButton to="/portfolio">See our work</GhostButton>
      </PageHero>

      {/* Mission */}
      <section className="relative py-20 md:py-24">
        <Glow className="top-10 left-1/2 h-72 w-[620px] -translate-x-1/2" color="rgba(79,70,229,0.16)" />
        <div className="shell relative">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <div>
                <Eyebrow>Our mission</Eyebrow>
                <h2 className="font-display mt-5 text-3xl leading-[1.14] font-extrabold tracking-[-0.03em] text-white md:text-[2.55rem]">
                  Great products should not be a{" "}
                  <span className="text-gradient">luxury only big brands can afford.</span>
                </h2>
                <div className="mt-8 grid grid-cols-2 gap-3">
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
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="glass grad-border rounded-3xl p-7">
                <Logo />
                <p className="mt-6 text-[15px] leading-relaxed text-slate-300">
                  We kept watching ambitious founders choose between expensive agencies and cheap
                  contractors that compromised on quality. Both options are unfair.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
                  Our vision is simple: enterprise-grade engineering, senior-level design and measurable
                  growth, delivered by one accountable team. You speak to the same people who write the
                  code, design the interfaces and maintain the system long after launch.
                </p>
                <div className="hairline my-6" />
                <p className="text-[13px] leading-relaxed text-slate-400">
                  <span className="font-semibold text-white">Founded</span> {company.founded} ·{" "}
                  <span className="font-semibold text-white">Base</span> {company.location}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Studio imagery */}
      <section className="border-y border-white/8 bg-ink-900/40 py-16">
        <div className="shell">
          <div className="grid gap-4 md:grid-cols-3">
            {[studioImages.workspace, studioImages.design, studioImages.focus].map((src, i) => (
              <Reveal key={src} delay={i * 90}>
                <div className="group relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10">
                  <img
                    src={src}
                    alt="Inside the Novaframe studio"
                    loading="lazy"
                    className="h-full w-full object-cover grayscale-[35%] transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/10 to-transparent" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Story + method */}
      <section className="py-20 md:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Our story"
              title="From a side project to"
              highlight="a production studio."
              description="This journey exists because early clients trusted a small team with serious responsibility."
            />
          </Reveal>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal>
              <div className="relative pl-8">
                <span className="absolute top-2 left-[11px] h-[calc(100%-16px)] w-px bg-gradient-to-b from-brand-500 via-brand-400/40 to-transparent" />
                {timeline.map((t, i) => (
                  <div key={t.year} className="relative pb-9 last:pb-0">
                    <span className="absolute top-1.5 -left-8 grid h-6 w-6 place-items-center rounded-full border border-brand-400/50 bg-ink-950">
                      <span className="h-2 w-2 rounded-full bg-gradient-to-br from-brand-400 to-aqua-400" />
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[11px] tracking-[0.18em] text-aqua-400">{t.year}</span>
                      <h3 className="font-display text-base font-bold text-white">{t.title}</h3>
                      {i === timeline.length - 1 ? (
                        <span className="rounded-full border border-lime-glow/30 bg-lime-glow/10 px-2.5 py-0.5 text-[10px] tracking-wide text-lime-glow uppercase">
                          Next chapter
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-slate-400">{t.desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="glass h-full rounded-3xl p-7">
                <p className="font-mono text-[10px] tracking-[0.22em] text-slate-500 uppercase">
                  our build method
                </p>
                <div className="mt-5 space-y-4">
                  {buildPath.map((b, i) => (
                    <div key={b.title} className="flex gap-3">
                      <span className="font-display grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-[11px] font-bold text-brand-300">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[13.5px] font-semibold text-white">{b.title}</p>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-400">{b.desc}</p>
                        <p className="mt-1 font-mono text-[10px] text-brand-300/80">{b.tag}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-white/8 bg-ink-900/40 py-20 md:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Principles"
              title="Four things we will"
              highlight="never compromise on."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 80}>
                <SpotlightCard className="h-full p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-500/25 to-aqua-500/10 text-brand-300">
                    <Icon name={v.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="font-display mt-5 text-base font-bold text-white">{v.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-400">{v.desc}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 md:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="The team"
              title="Three people who will"
              highlight="directly build your project."
              description="No layered account management. The people you speak with are the people on the keyboard."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={i * 90}>
                <SpotlightCard className="group flex h-full flex-col overflow-hidden">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={m.photo}
                      alt={m.name}
                      loading="lazy"
                      className="h-full w-full object-cover grayscale-[25%] transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-transparent" />
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-ink-950/70 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.16em] text-slate-200 uppercase backdrop-blur">
                      {m.initials}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-lg font-bold tracking-tight text-white">{m.name}</h3>
                    <p className="mt-1 text-[13px] font-semibold text-brand-300">{m.role}</p>
                    <p className="mt-3 flex-1 text-[14px] leading-relaxed text-slate-400">{m.bio}</p>
                    <div className="mt-5 flex flex-wrap gap-1.5 border-t border-white/8 pt-5">
                      {m.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/8 bg-ink-900/40 py-20 md:py-24">
        <div className="shell">
          <Reveal>
            <div className="grad-border relative overflow-hidden rounded-[32px] bg-gradient-to-br from-ink-800 via-ink-900 to-brand-600/20 p-8 text-center md:p-14">
              <div className="grid-bg absolute inset-0 opacity-50" aria-hidden />
              <div className="relative mx-auto max-w-2xl">
                <Eyebrow>Say hello</Eyebrow>
                <h2 className="font-display mt-4 text-3xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl">
                  Let's talk it through on a call.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
                  No obligation involved. Bring the idea and we will tell you the feasibility, budget and
                  timeline — {company.responseTime.toLowerCase()}.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <PrimaryButton to="/contact">Start a project</PrimaryButton>
                  <GhostButton to="/book">Book a 30-min call</GhostButton>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
