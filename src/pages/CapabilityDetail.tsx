import Faq from "../components/Faq";
import { Icon } from "../components/Icons";
import ProjectCard from "../components/ProjectCard";
import { Button, IconTile, PageHero, Reveal, SectionHeading } from "../components/ui";
import type { Project, Service } from "../data/types";
import { useContent } from "../lib/content";
import { Link } from "../lib/router";

const CATEGORY_HINTS: Record<string, string[]> = {
  web: ["web", "website", "e-commerce", "web app"],
  backend: ["e-commerce", "web app", "pwa"],
  app: ["pwa", "app", "ai"],
  design: ["website", "web app", "e-commerce", "pwa"],
  seo: ["pwa", "e-commerce", "web app"],
  video: [],
};

function relatedProjects(service: Service, projects: Project[]) {
  const stack = new Set(service.stack.map((s) => s.toLowerCase()));
  const hints = CATEGORY_HINTS[service.id] ?? [];
  return projects
    .map((p) => ({
      p,
      score:
        p.stack.filter((t) => stack.has(t.toLowerCase())).length * 2 +
        (hints.includes(p.category.toLowerCase()) ? 3 : 0) +
        (p.featured ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p);
}

export default function CapabilityDetail({ service }: { service: Service }) {
  const { collections, settings } = useContent();
  const related = relatedProjects(service, collections.projects);
  const others = collections.services.filter((s) => s.id !== service.id);

  return (
    <>
      <PageHero
        eyebrow={`Service · ${service.title}`}
        title={service.tagline.split(" ").slice(0, -2).join(" ")}
        highlight={service.tagline.split(" ").slice(-2).join(" ")}
        description={service.short}
        aside={
          <div className="lux-card gold-edge p-7">
            <IconTile name={service.icon} size="lg" />
            <p className="label mt-7">Starting at</p>
            <p className="display text-gold mt-2 text-[2.6rem] leading-none">{service.startingAt}</p>
            <dl className="mt-6 space-y-3 border-t border-gold-300/10 pt-5 text-[13.5px]">
              <div className="flex justify-between gap-4">
                <dt className="text-mist">Timeline</dt>
                <dd className="font-semibold text-parchment">{service.timeline}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-mist">Payment</dt>
                <dd className="font-semibold text-parchment">Per milestone</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-mist">Support</dt>
                <dd className="font-semibold text-parchment">30 days included</dd>
              </div>
            </dl>
            <p className="mt-5 text-[12.5px] leading-relaxed text-smoke">{service.deliverable}</p>
          </div>
        }
      >
        <Button to={`/contact?service=${encodeURIComponent(service.title)}`} arrow track={`service_start_${service.id}`}>
          Start a {service.title.toLowerCase()} project
        </Button>
        <Button to="/book" variant="line">
          Book a free call
        </Button>
      </PageHero>

      <section className="py-20 md:py-28">
        <div className="shell">
          <Reveal>
            <SectionHeading align="left" index="01" eyebrow="What's included" title="Scoped in writing," highlight="delivered in full." size="md" />
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {service.items.map((it, i) => (
              <Reveal key={it.title} delay={(i % 3) * 70}>
                <div className="lux-card lux-hover h-full p-7">
                  <span className="font-mono text-[11px] text-gold-500">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-4 text-[18px] font-semibold text-ivory">{it.title}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-mist">{it.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div className="mt-10 flex flex-wrap items-center gap-2.5">
              <span className="label mr-2">Core stack</span>
              {service.stack.map((t) => (
                <span key={t} className="chip chip-gold">
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {related.length ? (
        <section className="border-y border-gold-300/[0.07] bg-ink-900/50 py-20 md:py-28">
          <div className="shell">
            <Reveal>
              <SectionHeading align="left" index="02" eyebrow="Proof" title="Built with the same" highlight="hands and stack." size="md" />
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <ProjectCard project={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-20 md:py-28">
        <div className="shell grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div>
              <SectionHeading align="left" index="03" eyebrow="How it runs" title="Five steps," highlight="zero guesswork." size="md" />
              <ol className="mt-10 space-y-6">
                {collections.process.map((s) => (
                  <li key={s.id} className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold-300/30 font-display text-[0.95rem] text-gold-200">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-ivory">
                        {s.title} <span className="ml-2 font-mono text-[10.5px] font-normal text-smoke">{s.duration}</span>
                      </p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-mist">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <p className="label mb-4">Common questions</p>
              <Faq limit={5} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="shell">
          <Reveal>
            <div className="lux-card p-8 md:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="label">Explore other services</p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {others.map((s) => (
                      <Link key={s.id} to={`/services/${s.id}`} className="chip transition hover:border-gold-300/50 hover:text-ivory">
                        <Icon name={s.icon} className="h-3.5 w-3.5 text-gold-300" /> {s.title}
                      </Link>
                    ))}
                  </div>
                </div>
                <Button href={`mailto:${settings.email}?subject=${encodeURIComponent(`${service.title} enquiry`)}`} variant="line" icon="mail">
                  Email the founder
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
