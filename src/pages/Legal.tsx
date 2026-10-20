import { PageHero, Reveal } from "../components/ui";
import { useContent } from "../lib/content";
import { Link } from "../lib/router";

export default function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  const { advanced, settings } = useContent();
  const content = advanced.legal[doc];
  const title = doc === "privacy" ? "Privacy" : "Terms of";
  const highlight = doc === "privacy" ? "policy." : "service.";

  return (
    <>
      <PageHero eyebrow={`Legal · Updated ${content.updated}`} title={title} highlight={highlight} description={content.intro} />
      <section className="pb-28">
        <div className="shell grid gap-10 lg:grid-cols-[0.3fr_0.7fr]">
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <p className="label">On this page</p>
            <ol className="mt-4 space-y-2.5">
              {content.sections.map((s, i) => (
                <li key={s.heading}>
                  <a href={`#legal-${i}`} className="text-[13.5px] text-mist transition hover:text-gold-200">
                    {String(i + 1).padStart(2, "0")} · {s.heading}
                  </a>
                </li>
              ))}
            </ol>
            <div className="hairline my-6" />
            <Link to={doc === "privacy" ? "/terms" : "/privacy"} className="text-[13px] font-semibold text-gold-200">
              {doc === "privacy" ? "Terms of service →" : "Privacy policy →"}
            </Link>
          </aside>
          <div className="space-y-5">
            {content.sections.map((s, i) => (
              <Reveal key={s.heading}>
                <section id={`legal-${i}`} className="lux-card scroll-mt-32 p-7 md:p-9">
                  <span className="font-mono text-[11px] text-gold-500">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="display mt-3 text-[1.6rem]">{s.heading}</h2>
                  {s.paragraphs?.map((p) => (
                    <p key={p} className="mt-4 text-[15px] leading-relaxed text-sand">
                      {p}
                    </p>
                  ))}
                  {s.list?.length ? (
                    <ul className="mt-4 space-y-2.5">
                      {s.list.map((li) => (
                        <li key={li} className="flex gap-3 text-[14.5px] leading-relaxed text-sand">
                          <span className="mt-2.5 h-px w-3 shrink-0 bg-gold-400" />
                          {li}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </Reveal>
            ))}
            <p className="pt-4 text-[13.5px] text-mist">
              Questions about this document? Email{" "}
              <a href={`mailto:${settings.email}`} className="text-gold-200 underline-offset-4 hover:underline">
                {settings.email}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
