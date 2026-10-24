import Comparison from "../components/Comparison";
import Estimator from "../components/Estimator";
import Faq from "../components/Faq";
import { Icon } from "../components/Icons";
import { Button, IconTile, PageHero, Reveal, SectionHeading } from "../components/ui";
import { useContent } from "../lib/content";
import { usePauseOffscreen } from "../lib/onscreen";
import { scrollToId } from "../lib/router";
import { cn } from "../utils/cn";

export default function Pricing() {
  const { collections, settings } = useContent();
  const founding = settings.founding;
  const plansRef = usePauseOffscreen(); // "Most chosen" animated border only runs while visible

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Transparent pricing."
        highlight="No surprises, ever."
        description="Fixed-scope packages with milestone billing. Every price below is a real starting point — and the estimator gives you a tailored range in seconds."
      >
        <button type="button" onClick={() => scrollToId("estimator")} className="btn btn-gold shine">
          Estimate my project <Icon name="arrow-down" className="h-3.5 w-3.5" />
        </button>
        <Button to="/book" variant="line">
          Talk to the founder
        </Button>
      </PageHero>

      {founding.enabled ? (
        <div className="shell -mt-4 mb-12">
          <Reveal>
            <div className="lux-inset flex flex-col items-start gap-3 rounded-2xl px-6 py-4 text-[14px] sm:flex-row sm:items-center">
              <Icon name="gift" className="h-5 w-5 shrink-0 text-gold-300" />
              <p className="text-sand">
                <span className="font-semibold text-gold-100">Founding client offer:</span> 20% off any package below and 60 days of support —{" "}
                {founding.slotsLeft} of {founding.slotsTotal} slots left.
              </p>
            </div>
          </Reveal>
        </div>
      ) : null}

      <section ref={plansRef} className="pb-24">
        <div className="shell grid gap-6 lg:grid-cols-3">
          {collections.packages.map((pkg, i) => (
            <Reveal key={pkg.id} delay={i * 90}>
              <article className={cn("lux-card relative flex h-full flex-col p-8 md:p-9", pkg.best && "gold-orbit bg-gradient-to-b from-gold-400/[0.08] to-transparent")}>
                {pkg.best ? (
                  <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-b from-gold-200 to-gold-500 px-3.5 py-1 font-mono text-[10px] font-medium tracking-[0.16em] text-ink-950 uppercase">
                    Most chosen
                  </span>
                ) : null}
                <div className="flex items-center justify-between">
                  <h2 className="display text-[2rem]">{pkg.name}</h2>
                  <span className="chip">{pkg.timeline}</span>
                </div>
                <p className="mt-2 text-[13.5px] font-medium text-gold-300/85">{pkg.idealFor}</p>
                <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="display text-gold text-[2.6rem] leading-none sm:text-[3rem]">{pkg.price}</span>
                  <span className="text-[13px] text-mist">{pkg.usd}</span>
                </div>
                <p className="mt-2 font-mono text-[10.5px] tracking-[0.16em] text-smoke uppercase">{pkg.suffix}</p>
                <p className="mt-6 text-[14.5px] leading-relaxed text-mist">{pkg.desc}</p>
                <ul className="mt-7 space-y-3.5 border-t border-gold-300/10 pt-7">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[14px] text-parchment">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" strokeWidth={2.2} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-9">
                  <Button
                    to={`/contact?service=${encodeURIComponent(`${pkg.name} package`)}`}
                    variant={pkg.best ? "gold" : "line"}
                    arrow
                    className="w-full"
                    track={`pricing_${pkg.id}`}
                  >
                    {pkg.timeline === "Ongoing" ? "Plan a retainer" : `Start with ${pkg.name}`}
                  </Button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="shell mt-6 text-center text-[12.5px] text-smoke">
          Prices exclude GST where applicable. International projects are quoted in USD.
        </p>
      </section>

      <section id="estimator" className="scroll-mt-28 border-y border-gold-300/[0.07] bg-ink-900/50 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <SectionHeading index="01" eyebrow="Instant estimate" title="Your project," highlight="priced in seconds." />
          </Reveal>
          <Reveal delay={100} className="mt-14">
            <Estimator />
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <SectionHeading index="02" eyebrow="Always included" title="What every engagement" highlight="comes with." />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.guarantees.map((g, i) => (
              <Reveal key={g.id} delay={(i % 3) * 70}>
                <div className="lux-card flex h-full items-start gap-4 p-6">
                  <IconTile name={g.icon} size="sm" />
                  <div>
                    <p className="text-[15px] font-semibold text-ivory">{g.title}</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">{g.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={100}>
            <div className="mt-16">
              <p className="label mb-6 text-center">How we compare</p>
              <Comparison />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="faq" className="scroll-mt-28 border-t border-gold-300/[0.07] py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <SectionHeading index="03" eyebrow="Questions" title="Every answer," highlight="in one place." />
          </Reveal>
          <Reveal delay={100} className="mt-14">
            <Faq />
          </Reveal>
        </div>
      </section>
    </>
  );
}
