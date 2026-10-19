import { Link } from "../lib/router";
import { navLinks, services } from "../data/content";
import { insights } from "../data/content-extra";
import { Icon } from "../components/Icons";
import { GhostButton, Glow, PrimaryButton } from "../components/ui";

export default function NotFound({ path }: { path: string }) {
  const suggestions = [
    ...navLinks.map((l) => ({ label: l.label, to: l.to, note: "Page" })),
    ...services.map((s) => ({ label: s.title, to: `/capabilities/${s.id}`, note: "Capability" })),
    ...insights.slice(0, 3).map((i) => ({ label: i.title, to: `/insights/${i.slug}`, note: "Insight" })),
  ].slice(0, 9);

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden py-32">
      <div className="grid-bg absolute inset-0" aria-hidden />
      <Glow className="-top-20 left-1/2 h-[400px] w-[560px] -translate-x-1/2" color="rgba(79,70,229,0.28)" />
      <div className="shell relative w-full">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-[92px] leading-none font-extrabold tracking-tighter text-white/10 sm:text-[130px]">
            404
          </p>
          <h1 className="font-display -mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-[2.9rem]">
            We couldn't find that page.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-slate-400">
            The link may be outdated or mistyped. You asked for{" "}
            <code className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[12.5px] text-brand-300">
              {path}
            </code>
            . Here is everything that is available instead.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PrimaryButton to="/">Back to home</PrimaryButton>
            <GhostButton to="/contact">Contact us</GhostButton>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-4xl">
          <p className="text-center font-mono text-[10px] tracking-[0.22em] text-slate-500 uppercase">
            Popular destinations
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((s) => (
              <Link
                key={s.to + s.label}
                to={s.to}
                className="glass glass-hover group flex items-start gap-3 rounded-2xl p-4"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-500/25 to-aqua-500/10 text-brand-300">
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="font-display block truncate text-[13.5px] font-semibold text-white transition group-hover:text-brand-200">
                    {s.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
                    {s.note}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
