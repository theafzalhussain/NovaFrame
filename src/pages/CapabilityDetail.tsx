import { Link } from "../lib/router";
import { projects, services, type Service } from "../data/content";
import ProjectVisual from "../components/ProjectVisual";
import { Icon } from "../components/Icons";
import { TechLogo } from "../components/TechLogo";
import { techStack } from "../data/content";
import {
  Eyebrow,
  GhostButton,
  Glow,
  PrimaryButton,
  Reveal,
  SectionHeading,
  SpotlightCard,
} from "../components/ui";
import { cn } from "../utils/cn";

export default function CapabilityDetail({ service }: { service: Service }) {
  const others = services.filter((s) => s.id !== service.id);
  const relevant = projects.filter((p) =>
    service.id === "video"
      ? p.category === "Video"
      : service.id === "design"
        ? p.category === "Design"
        : service.id === "app"
          ? p.category === "App"
          : p.category === "Web",
  );

  const relatedTech = techStack.find((g) =>
    service.id === "design" || service.id === "video" ? g.id === "design-media" : g.id === "frontend",
  );

  return (
    <>
      <section className="relative overflow-hidden pt-32 pb-14 md:pt-40 md:pb-16">
        <div className="grid-bg absolute inset-0" aria-hidden />
        <Glow className="-top-24 left-1/2 h-[360px] w-[520px] -translate-x-1/2" color="rgba(79,70,229,0.24)" />
        <div className="shell relative">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 transition hover:text-white"
          >
            <span aria-hidden>←</span> All capabilities
          </Link>

          <div className="mt-7 flex items-start gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/12 bg-gradient-to-br from-brand-500/25 to-aqua-500/10 text-brand-300">
              <Icon name={service.icon} className="h-7 w-7" />
            </span>
            <div>
              <Eyebrow>Capability</Eyebrow>
              <h1 className="font-display mt-4 text-[2.1rem] leading-[1.06] font-extrabold tracking-[-0.03em] text-white sm:text-5xl md:text-[3.3rem]">
                {service.title}
              </h1>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-slate-400 md:text-[17px]">
            {service.short}
          </p>
          <p className="mt-3 text-[14px] font-semibold text-brand-300">{service.tagline}</p>

          <div className="mt-9 flex flex-wrap gap-3">
            <PrimaryButton to="/contact">Request a quote</PrimaryButton>
            <GhostButton to="/portfolio">See related work</GhostButton>
          </div>
        </div>
      </section>

      {/* deliverable bar */}
      <section className="border-y border-white/8 bg-ink-900/40 py-6">
        <div className="shell flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-aqua-500 text-white">
              <Icon name="check" className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[9.5px] tracking-[0.2em] text-slate-500 uppercase">
                What you receive
              </p>
              <p className="text-[14px] font-semibold text-white">{service.deliverable}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {service.stack.map((t) => (
              <span
                key={t}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10.5px] text-slate-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* sub-services */}
      <section className="py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Scope"
              title={`What's included in`}
              highlight={service.title + "."}
              description="Each engagement is scoped from the items below. We only commit to what genuinely moves your outcome."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {service.items.map((item, i) => (
              <Reveal key={item.title} delay={i * 70}>
                <SpotlightCard className="h-full p-6">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand-400/40 bg-brand-500/15 text-brand-300">
                    <Icon name="check" className="h-4 w-4" />
                  </span>
                  <h3 className="font-display mt-5 text-[15.5px] font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-400">{item.desc}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* tools */}
      {relatedTech ? (
        <section className="border-y border-white/8 bg-ink-900/40 py-16">
          <div className="shell">
            <Reveal>
              <h2 className="font-display text-xl font-bold text-white md:text-2xl">
                Tools behind this capability
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedTech.items.slice(0, 8).map((t, i) => (
                <Reveal key={t.name} delay={i * 50}>
                  <div className="glass glass-hover flex items-center gap-3.5 rounded-2xl p-4">
                    <TechLogo name={t.name} icon={t.icon} />
                    <div className="min-w-0">
                      <p className="font-display truncate text-[14px] font-bold text-white">{t.name}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-slate-400">{t.note}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* related projects */}
      {relevant.length ? (
        <section className="py-16 md:py-20">
          <div className="shell">
            <Reveal>
              <SectionHeading align="left" eyebrow="Proof" title="Projects delivered with" highlight={service.title + "."} />
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {relevant.slice(0, 3).map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <Link to={`/work/${p.id}`} className="group block h-full">
                    <div className="glass glass-hover h-full overflow-hidden rounded-3xl">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <div className={cn("absolute inset-0 bg-gradient-to-br", p.accent)} />
                        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                          <ProjectVisual project={p} />
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="font-display text-[15px] font-bold text-white">{p.title}</p>
                        <p className="mt-1.5 line-clamp-2 text-[13px] text-slate-400">{p.summary}</p>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* other capabilities */}
      <section className="border-t border-white/8 bg-ink-900/40 py-16">
        <div className="shell">
          <Reveal>
            <SectionHeading eyebrow="Also explore" title="Our other" highlight="capabilities." />
          </Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((s, i) => (
              <Reveal key={s.id} delay={i * 70}>
                <Link to={`/capabilities/${s.id}`} className="group block h-full">
                  <div className="glass glass-hover h-full rounded-2xl p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-500/25 to-aqua-500/10 text-brand-300">
                      <Icon name={s.icon} className="h-4 w-4" />
                    </span>
                    <p className="font-display mt-4 text-[14.5px] font-bold text-white">{s.title}</p>
                    <p className="mt-1 line-clamp-2 text-[12.5px] text-slate-400">{s.tagline}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
