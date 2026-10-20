import { useCollection } from "../lib/content";
import { Icon } from "./Icons";
import { Reveal, SectionHeading } from "./ui";

/** Real client words, managed in Admin → Testimonials. Hidden until the first one is published. */
export default function Testimonials({ index }: { index?: string }) {
  const items = useCollection("testimonials");
  if (!items.length) return null;

  return (
    <section className="relative py-24 md:py-32">
      <div className="shell">
        <Reveal>
          <SectionHeading index={index} eyebrow="Client words" title="In their" highlight="own words." />
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={t.id} delay={i * 80}>
              <figure className="lux-card ticks flex h-full flex-col p-8">
                <Icon name="quote" className="h-7 w-7 text-gold-400" />
                <div className="mt-5 flex gap-1 text-gold-300" aria-label={`${t.rating} out of 5`}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Icon key={s} name="star" className={s < t.rating ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5 opacity-25"} />
                  ))}
                </div>
                <blockquote className="display mt-5 flex-1 text-[1.25rem] leading-snug text-parchment">“{t.quote}”</blockquote>
                <figcaption className="mt-8 flex items-center gap-3 border-t border-gold-300/10 pt-5">
                  {t.avatar ? (
                    <img src={t.avatar} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <span className="icon-tile h-11 w-11 rounded-full font-display text-[15px]">{t.name.slice(0, 1)}</span>
                  )}
                  <span>
                    <span className="block text-[14px] font-semibold text-ivory">{t.name}</span>
                    <span className="block text-[12.5px] text-mist">
                      {[t.role, t.company].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
