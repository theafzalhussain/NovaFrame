import { Icon } from "../components/Icons";
import Faq from "../components/Faq";
import {
  Eyebrow,
  GhostButton,
  PageHero,
  PrimaryButton,
  Reveal,
  SectionHeading,
} from "../components/ui";
import { credentials, faqs, packages, processSteps } from "../data/content";

const addons = [
  { title: "Care & Maintenance", price: "₹12,000 / month", desc: "Monitoring, security patches, dependency updates, uptime alerts and a monthly performance report." },
  { title: "SEO Growth Retainer", price: "₹25,000 / month", desc: "Content briefs, technical fixes, internal-linking engine and a monthly ranking review." },
  { title: "Video Retainer", price: "₹35,000 / month", desc: "Two motion pieces per month with platform-specific exports and a shared brand motion kit." },
  { title: "Priority Fast-Track", price: "+20% one-time", desc: "Dedicated capacity that starts within 48 hours instead of the standard 3–5 day queue." },
];

const paymentTerms = [
  { label: "40%", desc: "On kickoff — reserves your slot in the build queue" },
  { label: "40%", desc: "On design approval / mid-build milestone" },
  { label: "20%", desc: "On launch, before handover of repository and credentials" },
];

export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Transparent pricing,"
        highlight="published upfront."
        description="These are real starting points, not 'contact us for pricing'. The final quote arrives as a written proposal after a discovery call, scoped to exactly what you need — nothing bundled in that you will not use."
      >
        <PrimaryButton to="/contact">Request a proposal</PrimaryButton>
        <GhostButton to="/services">Compare capabilities</GhostButton>
      </PageHero>

      {/* packages */}
      <section className="py-16 md:py-20">
        <div className="shell">
          <div className="grid gap-5 lg:grid-cols-3">
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
                  <h2 className="font-display text-lg font-bold text-white">{p.name}</h2>
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

          <Reveal delay={200}>
            <p className="mt-8 text-center text-[12.5px] text-slate-500">
              All figures exclude applicable taxes. International clients are billed in INR or USD at
              the prevailing rate. Custom scopes are quoted individually.
            </p>
          </Reveal>
        </div>
      </section>

      {/* payment schedule */}
      <section className="border-y border-white/8 bg-ink-900/40 py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="How billing works"
              title="Three milestones,"
              highlight="no surprises."
              description="You always know what is due and what unlocks it. Nothing is invoiced outside this schedule."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {paymentTerms.map((t, i) => (
              <Reveal key={t.label} delay={i * 90}>
                <div className="glass glass-hover h-full rounded-3xl p-6">
                  <span className="font-display text-3xl font-extrabold text-white/15">{t.label}</span>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-300">{t.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* add-ons */}
      <section className="py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Ongoing support"
              title="Retainers and"
              highlight="add-on services."
              description="Optional monthly engagements for teams that want us to keep improving the product after launch."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {addons.map((a, i) => (
              <Reveal key={a.title} delay={i * 80}>
                <div className="glass glass-hover flex h-full flex-col rounded-3xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-base font-bold text-white">{a.title}</h3>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10.5px] whitespace-nowrap text-brand-300">
                      {a.price}
                    </span>
                  </div>
                  <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-slate-400">{a.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* timeline */}
      <section className="border-y border-white/8 bg-ink-900/40 py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading eyebrow="What your budget buys" title="A delivery timeline you can" highlight="plan around." />
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {processSteps.map((s, i) => (
              <Reveal key={s.step} delay={i * 80}>
                <div className="glass h-full rounded-3xl p-5">
                  <div className="flex items-center gap-2">
                    <span className="font-display grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-aqua-500 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="font-mono text-[10px] text-brand-300">{s.duration}</span>
                  </div>
                  <p className="font-display mt-4 text-[14.5px] font-bold text-white">{s.title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* guarantees */}
      <section className="py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <SectionHeading eyebrow="Included always" title="Every quote includes" highlight="these guarantees." />
          </Reveal>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
            {credentials.map((c) => (
              <div key={c.title} className="group bg-ink-950/70 p-6 transition hover:bg-white/[0.04]">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-aqua-500 text-white">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                <p className="font-display mt-4 text-[14px] font-bold text-white">{c.title}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{c.desc}</p>
              </div>
            ))}
          </div>

          <Reveal delay={180}>
            <div className="mt-12 flex flex-col items-center gap-4 text-center">
              <Eyebrow>Still have questions?</Eyebrow>
              <Faq items={faqs.slice(0, 4)} />
              <PrimaryButton to="/contact" className="mt-6">
                Talk to us about your budget
              </PrimaryButton>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
