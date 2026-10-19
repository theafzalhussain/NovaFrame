import { Link } from "../lib/router";
import { legal } from "../data/content-extra";
import { company } from "../data/content";
import { Glow, PrimaryButton, Reveal } from "../components/ui";

type Doc = "privacy" | "terms";

export default function LegalPage({ doc }: { doc: Doc }) {
  const data = legal[doc];

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/8 pt-32 pb-14 md:pt-40">
        <div className="grid-bg absolute inset-0" aria-hidden />
        <Glow className="-top-24 left-1/2 h-[320px] w-[480px] -translate-x-1/2" color="rgba(79,70,229,0.2)" />
        <div className="shell relative">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 transition hover:text-white"
            >
              <span aria-hidden>←</span> Home
            </Link>
            <span className="text-slate-700">/</span>
            <Link
              to={doc === "privacy" ? "/terms" : "/privacy"}
              className="text-[13px] font-medium text-slate-400 transition hover:text-white"
            >
              {doc === "privacy" ? "Terms of Service" : "Privacy Policy"}
            </Link>
          </div>
          <h1 className="font-display mt-6 text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em] text-white sm:text-[2.7rem]">
            {doc === "privacy" ? "Privacy Policy" : "Terms of Service"}
          </h1>
          <p className="mt-4 font-mono text-[11.5px] tracking-[0.16em] text-slate-500 uppercase">
            Last updated {data.updated}
          </p>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-slate-400">{data.intro}</p>
        </div>
      </section>

      <section className="py-14 md:py-16">
        <div className="shell max-w-3xl space-y-10">
          {data.sections.map((s, i) => (
            <Reveal key={s.heading} delay={i * 60}>
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-white md:text-xl">
                  <span className="mr-3 font-mono text-[12px] text-brand-400">
                    0{i + 1}
                  </span>
                  {s.heading}
                </h2>
                {s.list ? (
                  <ul className="mt-4 space-y-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                    {s.list.map((li) => (
                      <li key={li} className="flex items-start gap-3 text-[14.5px] leading-relaxed text-slate-300">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
                        {li}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {s.paragraphs?.map((p, k) => (
                  <p key={k} className="mt-4 text-[15px] leading-[1.75] text-slate-400">
                    {p}
                  </p>
                ))}
              </div>
            </Reveal>
          ))}

          <Reveal delay={200}>
            <div className="grad-border rounded-3xl bg-gradient-to-br from-brand-600/20 to-aqua-500/10 p-7">
              <h2 className="font-display text-lg font-bold text-white">Questions about this document?</h2>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-300">
                Write to us at{" "}
                <a href={`mailto:${company.email}`} className="font-semibold text-brand-300 underline-offset-4 hover:underline">
                  {company.email}
                </a>{" "}
                or call {company.phone}. We respond {company.responseTime.toLowerCase()}.
              </p>
              <p className="mt-3 text-[13px] text-slate-500">
                {company.legal} · {company.location}
              </p>
              <PrimaryButton to="/contact" className="mt-6">
                Contact us
              </PrimaryButton>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
