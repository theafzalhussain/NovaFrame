import { Icon } from "../components/Icons";
import { Button, IconTile, PageHero, Reveal, SectionHeading } from "../components/ui";
import { useContent } from "../lib/content";
import { Link } from "../lib/router";
import { cn } from "../utils/cn";

export default function Services() {
  const { collections } = useContent();
  const services = collections.services;

  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Everything your business needs online —"
        highlight="under one roof."
        description="Websites, web apps, backends, apps, design, SEO and video — scoped in writing, priced per milestone and delivered by the person you speak to."
        aside={
          <div className="lux-card p-6">
            <p className="label">Jump to</p>
            <ul className="mt-4 space-y-1">
              {services.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#svc-${s.id}`}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2 text-[14px] text-sand transition hover:bg-gold-300/[0.05] hover:text-ivory"
                  >
                    <span className="font-mono text-[10.5px] text-gold-500">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1">{s.title}</span>
                    <Icon name="arrow-down" className="h-3.5 w-3.5 text-smoke transition group-hover:text-gold-300" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <Button to="/book" arrow track="services_book">
          Book a free call
        </Button>
        <Button to="/pricing" variant="line">
          See pricing
        </Button>
      </PageHero>

      <section className="pb-20">
        <div className="shell space-y-6">
          {services.map((s, i) => (
            <Reveal key={s.id}>
              <article id={`svc-${s.id}`} className="lux-card scroll-mt-32 overflow-hidden">
                <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                  <div className={cn("relative flex flex-col p-8 md:p-12", i % 2 === 1 && "lg:order-2")}>
                    <div className="flex items-center justify-between">
                      <IconTile name={s.icon} size="lg" />
                      <span className="display serif-accent text-[3.4rem] leading-none text-gold-300/20">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h2 className="display mt-8 text-[2.3rem] leading-tight md:text-[2.8rem]">{s.title}</h2>
                    <p className="mt-2 text-[15px] font-medium text-gold-300/85">{s.tagline}</p>
                    <p className="mt-5 text-[15.5px] leading-relaxed text-mist">{s.short}</p>
                    <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-gold-300/10 py-6">
                      <div>
                        <dt className="label">From</dt>
                        <dd className="display mt-2 text-[1.35rem] text-gold">{s.startingAt}</dd>
                      </div>
                      <div>
                        <dt className="label">Timeline</dt>
                        <dd className="mt-2 text-[14px] font-semibold text-parchment">{s.timeline}</dd>
                      </div>
                      <div>
                        <dt className="label">You get</dt>
                        <dd className="mt-2 text-[12.5px] leading-snug text-sand">{s.deliverable}</dd>
                      </div>
                    </dl>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Button to={`/services/${s.id}`} arrow size="sm">
                        Explore {s.title}
                      </Button>
                      <Button to={`/contact?service=${encodeURIComponent(s.title)}`} variant="line" size="sm" track={`services_start_${s.id}`}>
                        Start this project
                      </Button>
                    </div>
                  </div>

                  <div className={cn("border-gold-300/10 bg-ink-950/40 p-8 md:p-12", i % 2 === 1 ? "lg:border-r" : "lg:border-l")}>
                    <p className="label">What's included</p>
                    <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                      {s.items.map((it) => (
                        <li key={it.title} className="flex gap-3">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold-400" />
                          <span>
                            <span className="block text-[14.5px] font-semibold text-ivory">{it.title}</span>
                            <span className="mt-1 block text-[13px] leading-relaxed text-mist">{it.desc}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-9 border-t border-gold-300/10 pt-6">
                      <p className="label">Core stack</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.stack.map((t) => (
                          <span key={t} className="chip">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-24">
        <div className="shell">
          <Reveal>
            <div className="lux-card gold-edge relative overflow-hidden p-10 text-center md:p-16">
              <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
              <div className="relative">
                <SectionHeading eyebrow="Not sure where to start?" title="Tell us the goal —" highlight="we'll recommend the scope." />
                <div className="mt-10 flex flex-wrap justify-center gap-3.5">
                  <Button to="/book" arrow track="services_bottom_book">
                    Book a 30-min call
                  </Button>
                  <Link to="/pricing" className="btn btn-line">
                    Estimate the cost
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
