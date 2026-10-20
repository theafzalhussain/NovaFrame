import { useState } from "react";
import { Icon } from "../components/Icons";
import ProjectVisual from "../components/ProjectVisual";
import { ProjectLinks, StatusPill } from "../components/ProjectCard";
import { TechLogo } from "../components/TechLogo";
import { Button, Reveal } from "../components/ui";
import type { Project } from "../data/types";
import { useContent } from "../lib/content";
import { Link } from "../lib/router";
import { hostOf } from "../lib/site";

/** Full-page screenshot the visitor can scroll inside a browser frame. */
function ScreenshotViewer({ project }: { project: Project }) {
  const [tall, setTall] = useState(false);
  if (!project.cover || project.visual === "terminal") {
    return (
      <div className="h-[380px] overflow-hidden rounded-[22px] border border-gold-300/12 md:h-[440px]">
        <ProjectVisual project={project} />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-[22px] border border-gold-300/12 bg-ink-900 shadow-[0_60px_120px_-60px_rgba(195,149,74,0.45)]">
      <div className="flex items-center gap-3 border-b border-gold-300/10 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gold-300/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold-300/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold-300/10" />
        </div>
        <span className="mx-auto truncate rounded-full border border-gold-300/10 bg-ink-950/80 px-4 py-1 font-mono text-[11px] text-mist">
          {hostOf(project.liveUrl) || project.title}
        </span>
        {tall ? <span className="label hidden text-[9.5px] sm:block">Scroll inside ↓</span> : <span className="w-16" />}
      </div>
      <div className={tall ? "max-h-[78vh] overflow-y-auto" : ""} tabIndex={tall ? 0 : undefined} aria-label={`${project.title} full-page screenshot`}>
        <img
          src={project.cover}
          alt={`${project.title} full-page screenshot`}
          className="block w-full"
          onLoad={(e) => setTall(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth > 0.9)}
        />
      </div>
    </div>
  );
}

export default function CaseStudyPage({ project }: { project: Project }) {
  const { collections } = useContent();
  const all = collections.projects;
  const idx = all.findIndex((p) => p.id === project.id);
  const prev = idx > 0 ? all[idx - 1] : all[all.length - 1];
  const next = idx < all.length - 1 ? all[idx + 1] : all[0];
  const studio = project.kind === "studio";
  const techIcons = new Map(collections.techStack.flatMap((g) => g.items.map((i) => [i.name.toLowerCase(), i.icon] as const)));

  return (
    <>
      <section className="relative overflow-hidden pt-40 pb-14 md:pt-48">
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative">
          <Reveal>
            <Link to="/work" className="inline-flex items-center gap-2 text-[13px] font-semibold text-mist transition hover:text-gold-200">
              <Icon name="arrow-left" className="h-3.5 w-3.5" /> All work
            </Link>
          </Reveal>
          <div className="mt-10 grid items-end gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <Reveal delay={60}>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status={project.status} />
                  <span className="label">
                    {project.category} · {project.year} · {project.client}
                  </span>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <h1 className="display mt-7 text-[3.2rem] leading-[0.95] sm:text-7xl md:text-[6rem]">{project.title}</h1>
                <p className="serif-accent text-gold mt-4 text-[1.6rem] md:text-[2.1rem]">{project.subtitle}</p>
              </Reveal>
              <Reveal delay={180}>
                <p className="mt-7 max-w-2xl text-[16.5px] leading-relaxed text-sand md:text-[18px]">{project.summary}</p>
              </Reveal>
            </div>
            <Reveal delay={220}>
              <div className="lux-card p-6">
                <p className="label">Role</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-parchment">{project.role}</p>
                <div className="hairline my-5" />
                <ProjectLinks project={project} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="shell">
          <Reveal>
            <ScreenshotViewer project={project} />
          </Reveal>
        </div>
      </section>

      {project.metrics.length ? (
        <section className="border-y border-gold-300/[0.07] bg-ink-900/50 py-14">
          <div className="shell grid grid-cols-2 gap-10 md:grid-cols-4">
            {project.metrics.map((m, i) => (
              <Reveal key={m.label} delay={i * 70}>
                <div>
                  <div className="display text-gold text-[2.8rem] leading-none md:text-[3.4rem]">{m.value}</div>
                  <div className="mt-3 text-[13px] text-mist">{m.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      <section className="py-24 md:py-28">
        <div className="shell grid gap-6 lg:grid-cols-2">
          {[
            { label: studio ? "Why we built it" : "The problem", body: project.problem, icon: "target" },
            { label: studio ? "What we built" : "Our solution", body: project.solution, icon: "wand" },
          ].map((b, i) => (
            <Reveal key={b.label} delay={i * 100}>
              <div className="lux-card ticks h-full p-8 md:p-10">
                <span className="icon-tile h-11 w-11 rounded-xl">
                  <Icon name={b.icon} className="h-5 w-5" />
                </span>
                <h2 className="display mt-6 text-[1.9rem]">{b.label}</h2>
                <p className="mt-4 text-[15.5px] leading-[1.8] text-sand">{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="shell mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <div className="lux-card h-full p-8 md:p-10">
              <p className="label">Key features</p>
              <ul className="mt-6 space-y-4">
                {project.features.map((f) => (
                  <li key={f} className="flex gap-3.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-400/15 text-gold-300">
                      <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
                    </span>
                    <span className="text-[15px] leading-relaxed text-parchment">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="lux-card h-full p-8 md:p-10">
              <p className="label">Engineering decisions</p>
              <ol className="mt-6 space-y-5">
                {project.challenges.map((c, i) => (
                  <li key={c} className="flex gap-4">
                    <span className="font-mono text-[11px] text-gold-500">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[14.5px] leading-relaxed text-sand">{c}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>

        <div className="shell mt-6">
          <Reveal>
            <div className="lux-card p-8 md:p-10">
              <p className="label">Stack</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {project.stack.map((t) => (
                  <span key={t} className="group inline-flex items-center gap-2.5 rounded-full border border-gold-300/12 py-1.5 pr-4 pl-1.5">
                    <TechLogo name={t} icon={techIcons.get(t.toLowerCase()) ?? ""} size="sm" className="h-7 w-7 rounded-full" />
                    <span className="text-[13px] font-medium text-parchment">{t}</span>
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="shell">
          <Reveal>
            <div className="lux-card gold-edge relative overflow-hidden p-10 md:p-14">
              <div className="grid-lines absolute inset-0 opacity-50" aria-hidden />
              <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="eyebrow">Built to this standard</p>
                  <h2 className="display mt-5 text-[2.2rem] leading-tight md:text-[2.8rem]">
                    Want something <span className="serif-accent text-gold">this solid?</span>
                  </h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button to="/book" arrow track={`case_${project.id}_book`}>
                    Book a call
                  </Button>
                  <Button to="/contact" variant="line">
                    Send a brief
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>

          {all.length > 1 ? (
            <nav className="mt-10 grid gap-4 md:grid-cols-2" aria-label="More case studies">
              {[
                { p: prev, label: "Previous", icon: "arrow-left" },
                { p: next, label: "Next", icon: "arrow" },
              ].map(({ p, label, icon }) => (
                <Link key={label} to={`/work/${p.id}`} className="lux-card lux-hover group flex items-center gap-5 p-5">
                  <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-gold-300/10">
                    <ProjectVisual project={p} compact />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="label">{label}</span>
                    <span className="display mt-1 block truncate text-[1.4rem] group-hover:text-gold-100">{p.title}</span>
                  </span>
                  <Icon name={icon} className="h-4 w-4 text-gold-300" />
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
}
