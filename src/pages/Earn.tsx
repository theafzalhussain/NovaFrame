import { useEffect, useState } from "react";
import CommissionCalculator from "../components/CommissionCalculator";
import { Icon } from "../components/Icons";
import Leaderboard from "../components/Leaderboard";
import { Button, IconTile, PageHero, Reveal, SectionHeading } from "../components/ui";
import { DEFAULT_PARTNER_CONFIG, commissionPaise, splitInstallments, type PartnerConfig } from "../data/partner";
import { getPartnerToken, track } from "../lib/api";
import { useContent } from "../lib/content";
import { partnerApi } from "../lib/partner";
import { scrollToId } from "../lib/router";
import { formatINR } from "../lib/site";

export default function EarnPage() {
  const { settings } = useContent();
  const [program, setProgram] = useState<PartnerConfig>(DEFAULT_PARTNER_CONFIG);
  const signedIn = Boolean(getPartnerToken());

  useEffect(() => {
    void partnerApi.config().then(setProgram);
  }, []);

  const pct = program.commissionPercent;
  const example = splitInstallments(40_000 * 100, [40, 30, 30]).map((p) => commissionPaise(p, pct) / 100);
  const steps = [
    { icon: "user", title: "Register in 2 minutes", desc: "Free to join. You get a Partner ID, a personal referral link and a wallet straight away." },
    { icon: "link", title: "Share your link", desc: "Send it to shop owners, startups, clubs and alumni who need a website, app or online store." },
    { icon: "rupee", title: "Client pays, you earn", desc: `${pct}% of every payment the client makes — the advance and each later installment.` },
    { icon: "download", title: "Withdraw to UPI or bank", desc: `Once a payment clears our ${program.holdDays}-day safety window, withdraw from ₹${program.minPayout.toLocaleString("en-IN")}.` },
  ];
  const faqs = [
    {
      q: "Who can join?",
      a: "Any college student or recent graduate in India. You don't need to sell or code — you introduce people who need a website, app, online store or digital marketing, and we handle the rest.",
    },
    {
      q: "How is my commission calculated?",
      a: `${pct}% of each payment the client actually makes. If a ₹40,000 project is paid in three installments, you earn on each one as it is received. Commission is calculated by our server only from payments we have verified — never from estimates or quotes.`,
    },
    {
      q: "How does a client count as my referral?",
      a: `Either the client contacts us through your referral link, or you register them from your dashboard. The first partner to bring a client gets the credit for ${program.attributionDays} days. Clients already talking to us, and your own projects, don't count.`,
    },
    {
      q: "When can I withdraw?",
      a: `Commission is held for ${program.holdDays} days after each payment in case of a refund, then it becomes available. Withdraw any amount from ₹${program.minPayout.toLocaleString("en-IN")} to your UPI ID or bank account — every transfer comes with a transaction reference.`,
    },
    {
      q: "What does a Campus Ambassador do differently?",
      a: "Ambassadors represent us at their college: they run sessions, bring in student-run businesses and clubs, and get a verified Ambassador badge on the leaderboard and their profile. You apply from your partner dashboard (or while registering) and we review every application by hand.",
    },
    {
      q: "Can my account be suspended?",
      a: "Yes, for fake leads, self-referrals, spam or misrepresenting us. Suspended accounts can't withdraw, and commission on payments that are refunded or found to be fraudulent is reversed.",
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Student Partner Program"
        title="Your Network Can"
        highlight="Become Your Income!"
        description={`Refer clients who need a website, app or online store to ${settings.short}. Earn ${pct}% of every payment they make — on the advance and every installment after it.`}
        aside={
          <div className="lux-card gold-edge relative overflow-hidden p-7">
            <p className="label text-gold-300">The deal</p>
            <p className="display text-gold mt-3 text-[4.2rem] leading-none">{pct}%</p>
            <p className="mt-1 text-[14px] text-sand">commission on every verified client payment</p>
            <ul className="mt-6 space-y-3 border-t border-gold-300/10 pt-5">
              {["No joining fee, no targets", "Paid on each installment", "UPI or bank withdrawals", "Live dashboard & leaderboard"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[13.5px] text-parchment">
                  <Icon name="check" className="h-4 w-4 shrink-0 text-gold-300" strokeWidth={2.4} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        }
      >
        {signedIn ? (
          <Button to="/partner" arrow track="earn_dashboard">
            Open my dashboard
          </Button>
        ) : (
          <Button to="/partner?mode=register" arrow track="earn_join">
            Become a partner
          </Button>
        )}
        <button
          type="button"
          onClick={() => {
            track("cta_click", { label: "earn_calculator" });
            scrollToId("calculator");
          }}
          className="btn btn-line"
        >
          Calculate my earnings <Icon name="arrow-down" className="h-3.5 w-3.5" />
        </button>
        {!signedIn ? (
          <Button to="/partner" variant="ghost" track="earn_login">
            Partner sign-in
          </Button>
        ) : null}
      </PageHero>

      <section className="pb-24">
        <div className="shell">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="lux-card relative flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <IconTile name={s.icon} size="sm" />
                    <span className="font-mono text-[11px] text-smoke">0{i + 1}</span>
                  </div>
                  <p className="mt-5 text-[15.5px] font-semibold text-ivory">{s.title}</p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-mist">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="calculator" className="scroll-mt-28 border-y border-gold-300/[0.07] bg-ink-900/50 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <SectionHeading
              index="01"
              eyebrow="Commission calculator"
              title="See what one referral"
              highlight="is worth."
              description="Pick a project, choose how the client pays, and see your commission on every installment."
            />
          </Reveal>
          <Reveal delay={100} className="mt-14">
            <CommissionCalculator percent={pct} />
          </Reveal>
        </div>
      </section>

      <section id="leaderboard" className="scroll-mt-28 py-24 md:py-32">
        <div className="shell grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionHeading
              index="02"
              eyebrow="Live leaderboard"
              title="The partners"
              highlight="leading right now."
              align="left"
              description="Ranked by commission earned from verified client payments. Names are shortened for privacy, and partners can hide themselves from their dashboard."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to={signedIn ? "/partner" : "/partner?mode=register"} arrow track="earn_leaderboard_join">
                {signedIn ? "View my rank" : "Claim your spot"}
              </Button>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <Leaderboard />
          </Reveal>
        </div>
      </section>

      <section id="tracks" className="scroll-mt-28 border-y border-gold-300/[0.07] bg-ink-900/50 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <SectionHeading index="03" eyebrow="Two ways to take part" title="Start as a partner," highlight="grow into an ambassador." />
          </Reveal>
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {[
              {
                badge: "Open to everyone",
                title: "Student Partner",
                icon: "users",
                points: [
                  `${pct}% on every verified client payment`,
                  "Personal referral link & Partner ID",
                  "Register leads straight from your dashboard",
                  "Track every lead, installment and payout",
                ],
                cta: signedIn ? "Open my dashboard" : "Register as a partner",
                to: signedIn ? "/partner" : "/partner?mode=register",
                best: false,
              },
              {
                badge: "By application",
                title: "Campus Ambassador",
                icon: "award",
                points: [
                  `Everything partners get, including the same ${pct}% commission`,
                  "Verified Ambassador badge on the leaderboard",
                  "Represent us at your college and in its clubs",
                  "Ambassador status on your dashboard and profile",
                ],
                cta: signedIn ? "Apply from my dashboard" : "Register & apply",
                to: signedIn ? "/partner?tab=ambassador" : "/partner?mode=register&ambassador=1",
                best: true,
              },
            ].map((t, i) => (
              <Reveal key={t.title} delay={i * 90}>
                <article className={`lux-card relative flex h-full flex-col p-8 md:p-9 ${t.best ? "gold-orbit bg-gradient-to-b from-gold-400/[0.08] to-transparent" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <IconTile name={t.icon} />
                    <span className="chip">{t.badge}</span>
                  </div>
                  <h3 className="display mt-6 text-[2rem]">{t.title}</h3>
                  <ul className="mt-6 space-y-3.5 border-t border-gold-300/10 pt-6">
                    {t.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-[14px] text-parchment">
                        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" strokeWidth={2.2} />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-9">
                    <Button to={t.to} variant={t.best ? "gold" : "line"} arrow className="w-full" track={`earn_track_${i}`}>
                      {t.cta}
                    </Button>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-28 py-24 md:py-32">
        <div className="shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionHeading index="04" eyebrow="Program rules" title="Clear rules," highlight="paid on time." align="left" />
            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-mist">
              Example: a {formatINR(40_000)} store paid 40 / 30 / 30 earns you {example.map((v) => formatINR(v)).join(" + ")} ={" "}
              <span className="font-semibold text-gold-200">{formatINR(example.reduce((s, v) => s + v, 0))}</span>.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="lux-card group rounded-2xl px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-ivory">
                    {f.q}
                    <Icon name="plus" className="h-4 w-4 shrink-0 text-gold-300 transition-transform duration-300 group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-[14px] leading-relaxed text-mist">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="shell">
          <Reveal>
            <div className="lux-card gold-edge flex flex-col items-start gap-6 rounded-[28px] p-8 md:flex-row md:items-center md:justify-between md:p-12">
              <div>
                <p className="eyebrow">Ready when you are</p>
                <h2 className="display mt-5 text-[2rem] leading-tight md:text-[2.6rem]">
                  One introduction can pay <span className="serif-accent text-gold">your semester fees.</span>
                </h2>
              </div>
              <Button to={signedIn ? "/partner" : "/partner?mode=register"} size="lg" arrow track="earn_footer_join">
                {signedIn ? "Go to dashboard" : "Join free"}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
