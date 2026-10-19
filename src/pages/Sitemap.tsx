import { Link } from "../lib/router";
import { projects, services } from "../data/content";
import { insights } from "../data/content-extra";
import { Icon } from "../components/Icons";
import { Glow, PageHero, PrimaryButton, Reveal } from "../components/ui";

type Entry = { label: string; to: string; note: string };

const groups: { title: string; entries: Entry[] }[] = [
  {
    title: "Main pages",
    entries: [
      { label: "Home", to: "/", note: "Overview, capabilities, work, process, FAQ" },
      { label: "Capabilities", to: "/services", note: "All five service verticals in detail" },
      { label: "Work", to: "/work", note: "Filterable case studies with metrics" },
      { label: "The Studio", to: "/studio", note: "Mission, story, principles, team" },
      { label: "Tech Stack", to: "/tech-stack", note: "Languages, tools and build method" },
      { label: "Pricing", to: "/pricing", note: "Packages, retainers, billing schedule" },
      { label: "Insights", to: "/insights", note: "Engineering and growth writing" },
      { label: "Contact", to: "/contact", note: "Project enquiry form and direct lines" },
      { label: "Book a 30-Min Call", to: "/book", note: "Direct interactive calendar reservation" },
    ],
  },
  {
    title: "Capability detail pages",
    entries: services.map((s) => ({
      label: s.title,
      to: `/services/${s.id}`,
      note: s.tagline,
    })),
  },
  {
    title: "Case studies",
    entries: projects.map((p) => ({
      label: p.title,
      to: `/work/${p.id}`,
      note: `${p.client} · ${p.category} · ${p.year}`,
    })),
  },
  {
    title: "Insights articles",
    entries: insights.map((a) => ({
      label: a.title,
      to: `/insights/${a.slug}`,
      note: `${a.category} · ${a.readTime}`,
    })),
  },
  {
    title: "Legal & utility",
    entries: [
      { label: "Privacy Policy", to: "/privacy", note: "What we collect and why" },
      { label: "Terms of Service", to: "/terms", note: "Engagement, IP and payment terms" },
      { label: "404 page", to: "/definitely-not-a-real-page", note: "Friendly fallback with suggestions" },
    ],
  },
];

export default function Sitemap() {
  const total = groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <>
      <PageHero
        eyebrow="Sitemap"
        title="Every page on this site,"
        highlight="listed in one place."
        description="All routes are indexed here — static pages, capability detail pages, individual case studies and articles. Nothing is more than one click away."
      >
        <PrimaryButton to="/contact">Start a project</PrimaryButton>
      </PageHero>

      <section className="py-14 md:py-20">
        <div className="shell space-y-12">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.2em] text-slate-500 uppercase">
              {total} indexed routes
            </p>
          </Reveal>

          {groups.map((group, gi) => (
            <Reveal key={group.title} delay={gi * 60}>
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-aqua-400 uppercase">
                    0{gi + 1}
                  </span>
                  <h2 className="font-display text-xl font-bold tracking-tight text-white md:text-2xl">
                    {group.title}
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-slate-500">
                    {group.entries.length}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.entries.map((e) => (
                    <Link
                      key={e.to}
                      to={e.to}
                      className="glass glass-hover group flex items-start gap-3 rounded-2xl p-4"
                    >
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-500/25 to-aqua-500/10 text-brand-300">
                        <Icon name="arrow" className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="font-display block text-[13.5px] font-semibold text-white transition group-hover:text-brand-200">
                          {e.label}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-500">
                          {e.note}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-white/8 bg-ink-900/40 py-16">
        <div className="shell">
          <Reveal>
            <div className="grad-border relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-600/25 via-ink-800 to-aqua-500/14 p-8 text-center md:p-12">
              <Glow className="-bottom-20 left-1/2 h-60 w-96 -translate-x-1/2" color="rgba(34,211,238,0.18)" />
              <div className="relative mx-auto max-w-xl">
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">
                  Ready to build something?
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
                  Tell us what you need and we will come back with a written scope and a fixed quote.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <PrimaryButton to="/contact">Start a project</PrimaryButton>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
