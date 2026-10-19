import { Icon } from "../components/Icons";
import Faq from "../components/Faq";
import {
  Eyebrow,
  GhostButton,
  Glow,
  PageHero,
  PrimaryButton,
  Reveal,
  SectionHeading,
} from "../components/ui";
import { credentials, faqs, packages, services } from "../data/content";

const included = [
  "Responsive across every breakpoint (320px → ultrawide)",
  "Technical SEO: schema, sitemap, metadata, Core Web Vitals",
  "TypeScript codebase with a clean git history any developer can inherit",
  "Analytics and error monitoring wired before launch",
  "Documentation plus a recorded walkthrough of your admin",
  "30 days of post-launch bug support",
];

export default function Services() {
  return (
    <>
      <PageHero
        eyebrow="Capabilities"
        title="Everything required to"
        highlight="launch and then grow."
        description="Five capability verticals delivered by one team. Each is complete on its own, but together they compound into a consistent brand experience across every touchpoint."
      >
        <PrimaryButton to="/contact">Get a fixed quote</PrimaryButton>
        <GhostButton to="/portfolio">See it in production</GhostButton>
      </PageHero>

      {/* quick jump */}
      <div className="sticky top-[74px] z-30 border-b border-white/8 bg-ink-950/88 backdrop-blur-xl">
        <div className="shell flex gap-2 overflow-x-auto py-3">
          {services.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-medium whitespace-nowrap text-slate-300 transition hover:border-brand-400/50 hover:text-white"
            >
              <Icon name={s.icon} className="h-3.5 w-3.5 text-brand-300" />
              {s.title}
            </a>
          ))}
        </div>
      </div>

      <div className="shell space-y-6 py-16 md:py-20">
        {services.map((s, index) => (
          <section
            key={s.id}
            id={s.id}
            className="grad-border scroll-mt-36 overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.02]"
          >
            <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
              <div
                className={`relative border-b border-white/8 p-7 md:p-9 lg:border-r lg:border-b-0 ${
                  index % 2 === 1
                    ? "bg-gradient-to-br from-brand-600/12 to-transparent"
                    : "bg-gradient-to-br from-aqua-500/10 to-transparent"
                }`}
              >
                <Glow className="-top-16 -left-16 h-52 w-52" color="rgba(99,102,241,0.2)" />
                <div className="relative">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/12 bg-white/5 text-brand-300">
                    <Icon name={s.icon} className="h-6 w-6" />
                  </span>
                  <h2 className="font-display mt-6 text-2xl font-extrabold tracking-[-0.02em] text-white md:text-3xl">
                    {s.title}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-brand-300">{s.tagline}</p>
                  <p className="mt-4 text-[14px] leading-relaxed text-slate-400">{s.short}</p>

                  <div className="mt-7 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="font-mono text-[9.5px] tracking-[0.2em] text-slate-500 uppercase">
                      you receive
                    </p>
                    <p className="mt-1.5 text-[13px] font-medium text-slate-200">{s.deliverable}</p>
                  </div>

                  <p className="mt-6 font-mono text-[9.5px] tracking-[0.2em] text-slate-500 uppercase">
                    tools we use
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.stack.map((t) => (
                      <span
                        key={t}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10.5px] text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <PrimaryButton to="/contact" className="mt-7">
                    Discuss this capability
                  </PrimaryButton>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2">
                {s.items.map((item) => (
                  <div
                    key={item.title}
                    className="group bg-ink-950/60 p-6 transition hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-brand-400/40 bg-brand-500/15 text-brand-300">
                        <Icon name="check" className="h-3 w-3" />
                      </span>
                      <div>
                        <h3 className="font-display text-[15px] font-bold text-white">{item.title}</h3>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Included */}
      <section className="border-y border-white/8 bg-ink-900/40 py-20 md:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="No hidden extras"
              title="This is already included"
              highlight="in every project."
              description="You will never receive a separate invoice for the items below — they are our baseline quality standard, not upsells."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {included.map((item, i) => (
              <Reveal key={item} delay={i * 60}>
                <div className="glass glass-hover flex h-full items-start gap-3 rounded-2xl p-5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-aqua-500 text-white">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  <p className="text-[13.5px] leading-relaxed text-slate-300">{item}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 md:py-28">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Engagement models"
              title="Transparent packages,"
              highlight="no surprise invoices."
              description="Published starting points so you can align budget before the first call. The final quote arrives as a written proposal after discovery."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {packages.map((p, i) => (
              <Reveal key={p.name} delay={i * 90}>
                <div
                  className={`relative flex h-full flex-col rounded-3xl p-7 ${
                    p.best
                      ? "grad-border bg-gradient-to-b from-brand-600/25 to-ink-800 ring-glow"
                      : "glass"
                  }`}
                >
                  {p.best ? (
                    <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-brand-500 to-aqua-500 px-3 py-1 font-mono text-[9.5px] tracking-[0.18em] text-white uppercase">
                      Most chosen
                    </span>
                  ) : null}
                  <h3 className="font-display text-lg font-bold text-white">{p.name}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{p.desc}</p>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="font-display text-3xl font-extrabold tracking-tight text-white">
                      {p.price}
                    </span>
                    <span className="pb-1 text-[11px] text-slate-500">{p.suffix}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-slate-500">{p.usd}</p>
                  <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/8 pt-6">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <PrimaryButton to="/contact" className="mt-7 w-full">
                    {p.best ? "Start with Growth" : `Choose ${p.name}`}
                  </PrimaryButton>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={160}>
            <div className="glass mt-8 grid gap-px overflow-hidden rounded-3xl bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
              {credentials.slice(0, 3).map((c) => (
                <div key={c.title} className="bg-ink-950/70 p-5">
                  <p className="font-display text-[13.5px] font-bold text-white">{c.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{c.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/8 bg-ink-900/40 py-20 md:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Scope & pricing FAQ"
              title="Clarity before"
              highlight="any commitment."
            />
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <Faq items={faqs.slice(1, 4)} />
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Eyebrow>Ready when you are</Eyebrow>
              <PrimaryButton to="/contact">Request a proposal</PrimaryButton>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
