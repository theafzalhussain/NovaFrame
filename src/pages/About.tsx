import { Seal } from "../components/Brand";
import { Icon } from "../components/Icons";
import { Button, Diamond, IconTile, PageHero, Reveal, SectionHeading } from "../components/ui";
import type { TeamMember } from "../data/types";
import { useContent } from "../lib/content";

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <article className="lux-card lux-hover group overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-gold-300/10 bg-ink-850">
        {member.photo ? (
          <img src={member.photo} alt={member.name} className="h-full w-full object-cover object-[50%_30%] transition duration-700 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="display text-gold grid h-full place-items-center text-[4rem]">{member.initials}</div>
        )}
      </div>
      <div className="p-6">
        <p className="display text-[1.5rem]">{member.name}</p>
        <p className="mt-1 text-[13px] text-gold-300">{member.role}</p>
        <p className="mt-3 text-[14px] leading-relaxed text-mist">{member.focus}</p>
      </div>
    </article>
  );
}

export default function About() {
  const { collections, settings } = useContent();
  const [founder, ...others] = collections.team;
  const live = collections.projects.filter((p) => p.liveUrl).length;

  return (
    <>
      <PageHero
        eyebrow="The studio"
        title="A founder-led studio, built on"
        highlight="shipped software."
        description={`${settings.name} was founded in ${settings.city} on a simple idea: a business deserves software that is engineered as carefully as it is designed — and the right to talk directly to the person building it.`}
        aside={
          <div className="relative">
            <Seal size={150} className="mx-auto mb-6 hidden lg:block" />
            <dl className="lux-card grid grid-cols-2 gap-px overflow-hidden bg-gold-300/10">
              {[
                ["Founded", settings.founded],
                ["Based in", settings.city],
                ["Live products", String(live)],
                ["Reply time", "≤ 12 hours"],
              ].map(([k, v]) => (
                <div key={k} className="bg-ink-900 p-5">
                  <dt className="label">{k}</dt>
                  <dd className="display mt-2 text-[1.45rem] text-ivory">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        }
      >
        <Button to="/book" arrow track="studio_book">
          Meet the founder
        </Button>
        <Button to="/work" variant="line">
          See the work
        </Button>
      </PageHero>

      {/* Manifesto */}
      <section className="border-y border-gold-300/[0.07] bg-ink-900/50 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <p className="display mx-auto max-w-5xl text-center text-[2rem] leading-[1.2] md:text-[3rem]">
              Your website is the hardest-working salesperson you'll ever hire. <span className="serif-accent text-gold">It should be built like one</span> — fast, trustworthy and
              impossible to ignore.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <Diamond className="mx-auto mt-14 max-w-md" />
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: "eye", title: "Proof over promises", desc: "We show live products and public code before we ask for your trust — and keep showing working software every week." },
              { icon: "shield", title: "Engineered to last", desc: "Caching that degrades gracefully, jobs that are safe to retry, interfaces that stay fast on a mid-range phone." },
              { icon: "users", title: "Direct, always", desc: "No account managers, no relay. You speak to the person who designs the architecture and writes the code." },
            ].map((v, i) => (
              <Reveal key={v.title} delay={i * 90}>
                <div className="text-center">
                  <IconTile name={v.icon} size="lg" className="mx-auto" />
                  <h3 className="mt-6 text-[18px] font-semibold text-ivory">{v.title}</h3>
                  <p className="mx-auto mt-2.5 max-w-xs text-[14.5px] leading-relaxed text-mist">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      {founder ? (
        <section className="py-24 md:py-32">
          <div className="shell grid items-start gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <Reveal>
              <div className="relative mx-auto w-full max-w-[420px] lg:sticky lg:top-32">
                <div className="gold-edge relative aspect-[4/5] overflow-hidden rounded-[28px] bg-ink-850">
                  {founder.photo ? (
                    <img src={founder.photo} alt={`${founder.name}, ${founder.role}`} className="h-full w-full object-cover object-[50%_30%]" loading="lazy" />
                  ) : (
                    <div className="display text-gold grid h-full place-items-center text-[6rem]">{founder.initials}</div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/90 to-transparent" />
                  <div className="absolute bottom-5 left-5 flex flex-wrap gap-2">
                    {founder.links.map((l) => (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={l.label}
                        className="lux-glass grid h-10 w-10 place-items-center rounded-full text-parchment transition hover:text-gold-200"
                      >
                        <Icon name={l.label.toLowerCase() === "portfolio" ? "globe" : l.label.toLowerCase()} className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
            <div>
              <Reveal>
                <SectionHeading align="left" index="01" eyebrow="Founder" title={founder.name} highlight={founder.role.split("·")[0]?.trim()} size="md" />
              </Reveal>
              <Reveal delay={80}>
                <p className="mt-7 text-[16.5px] leading-[1.85] text-sand">{founder.bio}</p>
              </Reveal>
              {founder.quote ? (
                <Reveal delay={130}>
                  <blockquote className="mt-9 border-l border-gold-400/60 pl-6">
                    <p className="display serif-accent text-[1.45rem] leading-snug text-gold-100">“{founder.quote}”</p>
                  </blockquote>
                </Reveal>
              ) : null}
              <Reveal delay={170}>
                <div className="mt-10">
                  <p className="label">Core skills</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {founder.skills.map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
              {founder.credentials?.length ? (
                <Reveal delay={210}>
                  <div className="mt-10">
                    <p className="label">Education & training</p>
                    <ul className="mt-4 divide-y divide-gold-300/[0.08] rounded-2xl border border-gold-300/10">
                      {founder.credentials.map((c) => (
                        <li key={c.title} className="flex items-center gap-4 px-5 py-4">
                          <Icon name="award" className="h-5 w-5 shrink-0 text-gold-300" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14.5px] font-semibold text-parchment">{c.title}</span>
                            <span className="block text-[12.5px] text-smoke">{c.org}</span>
                          </span>
                          {c.year ? <span className="chip shrink-0">{c.year}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {others.length ? (
        <section className="pb-24">
          <div className="shell">
            <Reveal>
              <SectionHeading align="left" eyebrow="The team" title="The people" highlight="behind the work." size="md" />
            </Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((m, i) => (
                <Reveal key={m.id} delay={i * 80}>
                  <MemberCard member={m} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Journey */}
      <section className="border-y border-gold-300/[0.07] bg-ink-900/50 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <SectionHeading index="02" eyebrow="Journey" title="Foundations first," highlight="then shipping." />
          </Reveal>
          <ol className="relative mx-auto mt-16 max-w-3xl">
            <span className="absolute top-2 bottom-2 left-[7px] w-px bg-gradient-to-b from-gold-400/70 via-gold-500/30 to-transparent md:left-1/2" aria-hidden />
            {collections.milestones.map((m, i) => (
              <Reveal key={m.id} as="li" delay={i * 60} className="relative mb-10 pl-10 md:mb-14 md:grid md:grid-cols-2 md:gap-14 md:pl-0">
                <span className="absolute top-2 left-0 h-[15px] w-[15px] rotate-45 border border-gold-300 bg-ink-950 md:left-1/2 md:-translate-x-1/2" aria-hidden />
                <div className={i % 2 === 0 ? "md:text-right" : "md:order-2"}>
                  <span className="display text-gold text-[1.8rem] leading-none">{m.year}</span>
                  <p className="mt-1 font-mono text-[11px] text-smoke">{m.place}</p>
                </div>
                <div className={i % 2 === 0 ? "" : "md:order-1 md:text-right"}>
                  <h3 className="mt-2 text-[17px] font-semibold text-ivory md:mt-0">{m.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-mist">{m.desc}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Standards */}
      <section className="py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <SectionHeading index="03" eyebrow="Our standards" title="Promises," highlight="written down." />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.guarantees.map((g, i) => (
              <Reveal key={g.id} delay={(i % 3) * 70}>
                <div className="lux-card flex h-full items-start gap-4 p-6">
                  <IconTile name={g.icon} size="sm" />
                  <div>
                    <p className="text-[15px] font-semibold text-ivory">{g.title}</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">{g.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
