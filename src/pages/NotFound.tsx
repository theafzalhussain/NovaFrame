import { Seal } from "../components/Brand";
import { Icon } from "../components/Icons";
import { Button } from "../components/ui";
import { useContent } from "../lib/content";
import { Link } from "../lib/router";

function similarity(a: string, b: string) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (!x || !y) return 0;
  if (y.includes(x) || x.includes(y)) return 1;
  const grams = (s: string) => new Set(Array.from({ length: Math.max(s.length - 1, 1) }, (_, i) => s.slice(i, i + 2)));
  const ga = grams(x);
  const gb = grams(y);
  let hit = 0;
  ga.forEach((g) => gb.has(g) && hit++);
  return (2 * hit) / (ga.size + gb.size);
}

export default function NotFoundPage({ path }: { path: string }) {
  const { collections } = useContent();
  const routes = [
    { label: "Services", to: "/services" },
    { label: "Work", to: "/work" },
    { label: "Pricing", to: "/pricing" },
    { label: "The Studio", to: "/studio" },
    { label: "Insights", to: "/insights" },
    { label: "Contact", to: "/contact" },
    ...collections.services.map((s) => ({ label: s.title, to: `/services/${s.id}` })),
    ...collections.projects.map((p) => ({ label: p.title, to: `/work/${p.id}` })),
    ...collections.insights.map((a) => ({ label: a.title, to: `/insights/${a.id}` })),
  ];
  const last = path.split("/").filter(Boolean).pop() ?? "";
  const suggestions = routes
    .map((r) => ({ ...r, score: Math.max(similarity(last, r.to.split("/").pop() ?? ""), similarity(last.replace(/-/g, " "), r.label)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <section className="relative overflow-hidden pt-44 pb-32">
      <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
      <div className="shell relative text-center">
        <Seal size={140} className="mx-auto" text="PAGE NOT FOUND · 404 · NOVAFRAME · " />
        <h1 className="display mt-10 text-[3rem] leading-none sm:text-7xl">
          This page has <span className="serif-accent text-gold">wandered off.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-[16px] text-mist">
          <span className="font-mono text-[13px] text-sand">{path}</span> doesn't exist — but one of these might be what you were after.
        </p>
        <div className="mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-2">
          {suggestions.map((s) => (
            <Link key={s.to} to={s.to} className="lux-card lux-hover group flex items-center justify-between gap-3 px-5 py-4 text-left">
              <span className="truncate text-[14.5px] font-semibold text-parchment">{s.label}</span>
              <Icon name="arrow" className="h-4 w-4 shrink-0 text-gold-300 transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button to="/" arrow>
            Back to home
          </Button>
          <Button to="/contact" variant="line">
            Contact us
          </Button>
        </div>
      </div>
    </section>
  );
}
