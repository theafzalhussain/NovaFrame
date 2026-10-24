import { Seal } from "../components/Brand";
import { Icon } from "../components/Icons";
import { Button, Diamond, IconTile, PageHero, Reveal, SectionHeading } from "../components/ui";
import type { TeamMember } from "../data/types";
import { useContent } from "../lib/content";

type Fact = { label: string; value: string; icon: string; href?: string; external?: boolean };

/** Compact, real-data fact sheet shown under a portrait. */
function FactList({ facts, className = "" }: { facts: Fact[]; className?: string }) {
  if (!facts.length) return null;
  return (
    <dl className={`lux-inset divide-y divide-gold-300/[0.08] rounded-2xl ${className}`}>
      {facts.map((f) => (
        <div key={f.label} className="flex items-start gap-3.5 px-4 py-3.5">
          <Icon name={f.icon} className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
          <div className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-smoke">{f.label}</dt>
            <dd className="mt-1 break-words text-[13.5px] font-medium text-parchment">
              {f.href ? (
                <a href={f.href} {...(f.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="transition hover:text-gold-200">
                  {f.value}
                </a>
              ) : (
                f.value
              )}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

const prettyUrl = (href: string) => href.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");

/** Full profile card for a team member. Renders only the fields that have real data. */
function TeamProfile({ member, index }: { member: TeamMember; index: number }) {
  const first = member.name.trim().split(/\s+/)[0] || member.name;
  const groups = (member.skillGroups ?? []).filter((g) => g.label && Array.isArray(g.items) && g.items.length > 0);
  const flatSkills = (member.skills ?? []).filter(Boolean);
  const services = (member.services ?? []).filter(Boolean);
  const links = (member.links ?? []).filter((l) => l.href);
  const credentials = (member.credentials ?? []).filter((c) => c.title);
  const email = member.email?.trim();
  const github = links.find((l) => l.label.toLowerCase() === "github");

  // Quick facts shown under the photo — only rows that have real data.
  const facts: Fact[] = [
    { label: "Role", value: member.role, icon: "briefcase" },
    ...(member.focus ? [{ label: "Focus", value: member.focus, icon: "target" }] : []),
    ...(member.location ? [{ label: "Based in", value: member.location, icon: "map-pin" }] : []),
    ...(email ? [{ label: "Email", value: email, icon: "mail", href: `mailto:${email}` }] : []),
    ...(github ? [{ label: "GitHub", value: prettyUrl(github.href), icon: "github", href: github.href, external: true }] : []),
  ].filter((f) => f.value);

  return (
    <article className="lux-card overflow-hidden">
      <div className="grid lg:grid-cols-[0.78fr_1.22fr]">
        {/* Portrait — uncropped photo, bold gold border, hover zoom (CSS transition only, no keyframes) */}
        <div className="p-5 sm:p-6 lg:p-7">
          <figure className="group relative overflow-hidden rounded-[22px] border-[3px] border-gold-300/55 bg-ink-850 shadow-xl shadow-black/40 ring-4 ring-gold-300/10">
            {member.photo ? (
              <img
                src={member.photo}
                alt={`${member.name}, ${member.role}`}
                className="block aspect-[15/16] w-full object-cover object-top transition duration-700 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="display text-gold grid aspect-[15/16] w-full place-items-center text-[6rem]">{member.initials}</div>
            )}
            {/* readability gradient */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-2/5 bg-gradient-to-t from-ink-950 via-ink-950/55 to-transparent" />
            {/* name plate — matches the founder card: name, location and social links */}
            <figcaption className="absolute inset-x-5 bottom-5 z-[5]">
              <p className="display text-[1.4rem] leading-none text-ivory">{member.name}</p>
              {member.location ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium tracking-wide text-gold-200">
                  <Icon name="map-pin" className="h-3.5 w-3.5 text-gold-300" />
                  {member.location}
                </p>
              ) : null}
              {links.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {links.map((l) => (
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

          <FactList facts={facts} className="mt-5" />
        </div>

        {/* Details */}
        <div className="flex flex-col p-6 sm:p-8 lg:p-11">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.24em] text-gold-300">{String(index + 2).padStart(2, "0")}</span>
            <span aria-hidden className="h-px w-8 bg-gold-400/50" />
            <span className="chip">{member.role}</span>
          </div>

          <h3 className="display mt-5 text-[2.3rem] leading-[1.02] md:text-[3rem]">{member.name}</h3>
          {member.headline ? <p className="display serif-accent mt-3 text-[1.2rem] leading-snug text-gold-100 md:text-[1.4rem]">{member.headline}</p> : null}

          {member.bio ? <p className="mt-6 text-[15.5px] leading-[1.85] text-sand">{member.bio}</p> : null}

          {services.length ? (
            <div className="mt-9">
              <p className="label">What {first} does</p>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {services.map((s) => (
                  <li key={s} className="lux-inset flex items-center gap-3 rounded-xl px-4 py-3">
                    <Icon name="check-circle" className="h-4 w-4 shrink-0 text-gold-300" />
                    <span className="text-[13.5px] font-medium text-parchment">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {groups.length ? (
            <div className="mt-9">
              <p className="label">Technical skills</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {groups.map((g) => (
                  <div key={g.label} className="lux-inset rounded-2xl p-4">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-gold-300">{g.label}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {g.items.map((item) => (
                        <span key={item} className="chip">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : flatSkills.length ? (
            <div className="mt-9">
              <p className="label">Skills</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {flatSkills.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {credentials.length ? (
            <div className="mt-9">
              <p className="label">Education & training</p>
              <ul className="mt-4 divide-y divide-gold-300/[0.08] rounded-2xl border border-gold-300/10">
                {credentials.map((c) => (
                  <li key={c.title} className="flex items-center gap-4 px-5 py-3.5">
                    <Icon name="award" className="h-5 w-5 shrink-0 text-gold-300" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-parchment">{c.title}</span>
                      {c.org ? <span className="block text-[12.5px] text-smoke">{c.org}</span> : null}
                    </span>
                    {c.year ? <span className="chip shrink-0">{c.year}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {member.goal || member.quote ? (
            <blockquote className="mt-9 border-l border-gold-400/60 pl-6">
              <p className="label">{member.goal ? "Goal" : "In their words"}</p>
              <p className="display serif-accent mt-2.5 text-[1.25rem] leading-snug text-gold-100">{member.goal ?? `“${member.quote}”`}</p>
            </blockquote>
          ) : null}

          {email || links.length ? (
            <div className="mt-auto pt-10">
              <div className="flex flex-wrap items-center gap-3 border-t border-gold-300/10 pt-7">
                {email ? (
                  <Button href={`mailto:${email}`} icon="mail" track={`team_email_${member.id}`}>
                    Email {first}
                  </Button>
                ) : null}
                {github ? (
                  <Button href={github.href} variant="line" icon="github" track={`team_github_${member.id}`}>
                    GitHub
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
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
        <section className="relative py-24 md:py-32">
          <div className="shell grid items-start gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <Reveal>
              <div className="relative mx-auto w-full max-w-[460px] lg:self-start">
                {/* soft glow behind the portrait */}
                <div aria-hidden className="portrait-glow pointer-events-none absolute -inset-5 -z-10 rounded-[40px] bg-gold-400/10 blur-3xl" />
                <figure className="portrait-frame group relative aspect-[4/5] overflow-hidden rounded-[28px] bg-ink-850 shadow-2xl shadow-black/40 ring-1 ring-gold-300/15">
                  {founder.photo ? (
                    <img
                      src={founder.photo}
                      alt={`${founder.name}, ${founder.role}`}
                      className="h-full w-full object-cover object-[50%_22%] transition duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="display text-gold grid h-full place-items-center text-[6rem]">{founder.initials}</div>
                  )}
                  {/* readability gradient */}
                  <div className="absolute inset-x-0 bottom-0 z-[4] h-2/5 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
                  {/* name plate */}
                  <figcaption className="absolute inset-x-5 bottom-5 z-[5]">
                    <p className="display text-[1.55rem] leading-none text-ivory">{founder.name}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium tracking-wide text-gold-200">
                      <Icon name="map-pin" className="h-3.5 w-3.5 text-gold-300" />
                      {founder.location ?? settings.city}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
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
                  </figcaption>
                </figure>
                <Seal size={104} className="absolute -top-6 -right-6 hidden drop-shadow-lg sm:block" />
                <FactList
                  className="mt-6"
                  facts={[
                    { label: "Role", value: founder.role, icon: "briefcase" },
                    ...(founder.focus ? [{ label: "Focus", value: founder.focus, icon: "target" }] : []),
                    ...(founder.location ? [{ label: "Based in", value: founder.location, icon: "map-pin" }] : []),
                    { label: "Studio", value: `${settings.name}${settings.founded ? ` · Founded ${settings.founded}` : ""}`, icon: "layers" },
                    ...founder.links
                      .filter((l) => l.href)
                      .map((l) => ({ label: l.label, value: prettyUrl(l.href), icon: l.label.toLowerCase() === "portfolio" ? "globe" : l.label.toLowerCase(), href: l.href, external: true })),
                  ]}
                />
              </div>
            </Reveal>
            <div>
              <Reveal>
                <SectionHeading align="left" index="01" eyebrow="Founder" title={founder.name} highlight={founder.role.split("·")[0]?.trim()} size="md" />
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
                  <span className="chip">{founder.focus}</span>
                </div>
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
              <Reveal delay={240}>
                <div className="mt-11 flex flex-wrap items-center gap-3">
                  <Button to="/book" arrow track="founder_book">
                    Book a call with {founder.name.split(" ")[0]}
                  </Button>
                  <Button to="/contact" variant="line">
                    Send a message
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      ) : null}

      {others.length ? (
        <section className="relative border-t border-gold-300/[0.07] py-24 md:py-32">
          <div className="shell">
            <Reveal>
              <SectionHeading
                align="left"
                eyebrow="The team"
                title="The people"
                highlight="behind the work."
                description="Specialists join an engagement under the same contract and NDA — and you know exactly who they are before they start."
                size="md"
              />
            </Reveal>
            <div className="mt-12 space-y-8 md:space-y-10">
              {others.map((m, i) => (
                <Reveal key={m.id} delay={80}>
                  <TeamProfile member={m} index={i} />
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
