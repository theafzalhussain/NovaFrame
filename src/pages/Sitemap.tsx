import { Icon } from "../components/Icons";
import { PageHero, Reveal } from "../components/ui";
import { useContent } from "../lib/content";
import { Link } from "../lib/router";

export default function Sitemap() {
  const { collections } = useContent();
  const groups: { title: string; links: { label: string; to: string }[] }[] = [
    {
      title: "Main pages",
      links: [
        { label: "Home", to: "/" },
        { label: "Services", to: "/services" },
        { label: "Work", to: "/work" },
        { label: "Pricing & estimator", to: "/pricing" },
        { label: "The Studio", to: "/studio" },
        { label: "Tech stack", to: "/tech-stack" },
        { label: "Insights", to: "/insights" },
        { label: "Contact", to: "/contact" },
        { label: "Book a call", to: "/book" },
        { label: "Pay online", to: "/pay" },
      ],
    },
    { title: "Services", links: collections.services.map((s) => ({ label: s.title, to: `/services/${s.id}` })) },
    { title: "Case studies", links: collections.projects.map((p) => ({ label: p.title, to: `/work/${p.id}` })) },
    { title: "Insights", links: collections.insights.map((a) => ({ label: a.title, to: `/insights/${a.id}` })) },
    {
      title: "Legal",
      links: [
        { label: "Privacy policy", to: "/privacy" },
        { label: "Terms of service", to: "/terms" },
      ],
    },
  ];

  return (
    <>
      <PageHero eyebrow="Sitemap" title="Every page," highlight="in one place." description="A complete index of the site — services, case studies, articles and policies." />
      <section className="pb-28">
        <div className="shell grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => (
            <Reveal key={g.title} delay={(i % 3) * 70}>
              <div className="lux-card h-full p-7">
                <p className="label">{g.title}</p>
                <ul className="mt-5 space-y-1">
                  {g.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="group flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-[14px] text-sand transition hover:bg-gold-300/[0.05] hover:text-ivory">
                        <span className="truncate">{l.label}</span>
                        <Icon name="arrow" className="h-3.5 w-3.5 shrink-0 text-smoke transition group-hover:translate-x-0.5 group-hover:text-gold-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
