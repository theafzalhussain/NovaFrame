import { useMemo, useState } from "react";
import ProjectCard from "../components/ProjectCard";
import { Icon } from "../components/Icons";
import { Button, PageHero, Reveal, SectionHeading } from "../components/ui";
import { useContent } from "../lib/content";
import { usePauseOffscreen } from "../lib/onscreen";
import { cn } from "../utils/cn";

export default function Portfolio() {
  const { collections, settings } = useContent();
  const projects = collections.projects;
  const [filter, setFilter] = useState("All");

  const filters = useMemo(() => ["All", ...Array.from(new Set(projects.map((p) => p.category))).sort()], [projects]);
  const visible = filter === "All" ? projects : projects.filter((p) => p.category === filter);
  const live = projects.filter((p) => p.liveUrl).length;
  const repos = projects.filter((p) => p.repoUrl).length;
  const github = settings.socials.find((s) => s.icon === "github")?.href;
  const ctaRef = usePauseOffscreen(); // animated gold border runs only while the CTA is visible

  return (
    <>
      <PageHero
        eyebrow="Work"
        title="Live products, public code,"
        highlight="measured results."
        description="Every project here is running in production or open source — click through to the live site, read the repository, or open the case study for the architecture and trade-offs."
        aside={
          <div className="lux-card relative overflow-hidden p-0">
            <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" aria-hidden />
            <div className="relative flex items-center justify-between gap-3 border-b border-gold-300/10 px-6 py-4">
              <span className="label">Studio metrics</span>
              <span className="inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] text-emerald-200 uppercase">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live
              </span>
            </div>
            <div className="relative grid grid-cols-2 gap-px bg-gold-300/10">
              {[
                { v: String(projects.length), l: "Products built", icon: "layers" },
                { v: String(live), l: "Live right now", icon: "activity" },
                { v: String(repos), l: "Public repositories", icon: "github" },
                { v: "90+", l: "Lighthouse on shipped work", icon: "gauge" as const },
              ].map((s) => (
                <div key={s.l} className="group relative bg-ink-900 p-6 transition-colors hover:bg-ink-850">
                  <Icon name={s.icon === "gauge" ? "activity" : s.icon} className="h-4 w-4 text-gold-300/70" />
                  <div className="display text-gold mt-4 text-[2.2rem] leading-none">{s.v}</div>
                  <div className="mt-2 text-[12px] text-mist">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        }
      >
        <Button to="/book" arrow track="work_book">
          Build something like this
        </Button>
        {github ? (
          <Button href={github} variant="line" icon="github">
            GitHub
          </Button>
        ) : null}
      </PageHero>

      <section className="pb-14">
        <div className="shell">
          <div className="lux-card flex flex-col gap-y-4 overflow-hidden px-6 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-8 md:px-8">
            {[
              { icon: "activity", label: "Running in production", sub: "Real traffic, real uptime" },
              { icon: "github", label: "Open-source code", sub: "Read every repository" },
              { icon: "shield", label: "Engineered to last", sub: "Caching, retries, monitoring" },
              { icon: "gauge", label: "Performance-first", sub: "90+ Lighthouse at ship" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="icon-tile h-10 w-10 shrink-0">
                  <Icon name={item.icon === "gauge" ? "activity" : item.icon} className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-parchment">{item.label}</p>
                  <p className="text-[11.5px] text-smoke">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="shell">
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter projects">
            {filters.map((f) => {
              const count = f === "All" ? projects.length : projects.filter((p) => p.category === f).length;
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition",
                    filter === f ? "border-gold-300/60 bg-gold-400/15 text-gold-100" : "border-gold-300/12 text-mist hover:border-gold-300/35 hover:text-ivory",
                  )}
                >
                  {f}
                  <span className="text-[11px] tabular-nums opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 80}>
                <ProjectCard project={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section ref={ctaRef} className="pb-28">
        <div className="shell">
          <Reveal>
            <div className="lux-card gold-orbit relative overflow-hidden p-10 text-center md:p-16">
              <div className="grid-lines absolute inset-0 opacity-50" aria-hidden />
              <div className="relative">
                <SectionHeading eyebrow="Your project" title="The next case study" highlight="could be yours." description="Founding clients get 20% off, 60 days of support and a featured case study on this page." />
                <div className="mt-10 flex flex-wrap justify-center gap-3.5">
                  <Button to="/contact" arrow track="work_bottom_contact">
                    Start a project
                  </Button>
                  <Button to="/pricing" variant="line">
                    View pricing
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
