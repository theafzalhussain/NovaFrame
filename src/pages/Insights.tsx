import { useMemo, useState } from "react";
import { Icon } from "../components/Icons";
import { Button, PageHero, Reveal } from "../components/ui";
import type { Insight } from "../data/types";
import { useContent } from "../lib/content";
import { Link } from "../lib/router";
import { prettyDate } from "../lib/site";
import { cn } from "../utils/cn";

function Meta({ article, className }: { article: Insight; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-wide text-smoke", className)}>
      <span className="text-gold-400">{article.category}</span>
      <span className="h-1 w-1 rotate-45 bg-gold-500/60" />
      <span>{prettyDate(article.date)}</span>
      <span className="h-1 w-1 rotate-45 bg-gold-500/60" />
      <span>{article.readTime}</span>
    </p>
  );
}

export function InsightsPage() {
  const { collections } = useContent();
  const articles = useMemo(() => [...collections.insights].sort((a, b) => b.date.localeCompare(a.date)), [collections.insights]);
  const [category, setCategory] = useState("All");
  const categories = ["All", ...Array.from(new Set(articles.map((a) => a.category)))];
  const visible = category === "All" ? articles : articles.filter((a) => a.category === category);
  const [lead, ...rest] = visible;
  const leadAuthor = lead ? collections.team.find((t) => t.name === lead.author) ?? collections.team[0] : undefined;

  return (
    <>
      <PageHero
        eyebrow="Insights"
        title="Engineering notes from"
        highlight="real, shipped products."
        description="How we solve the hard parts — caching, resilience, performance and product decisions — written up from the projects you can open on our work page."
      />

      <section className="pb-28">
        <div className="shell">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "rounded-full border px-4 py-2 text-[13px] font-semibold transition",
                  category === c ? "border-gold-300/60 bg-gold-400/15 text-gold-100" : "border-gold-300/12 text-mist hover:text-ivory",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {lead ? (
            <Reveal className="mt-10">
              <Link to={`/insights/${lead.id}`} className="lux-card lux-hover group grid overflow-hidden md:grid-cols-[1.1fr_0.9fr]">
                <div className="p-8 md:p-12">
                  <Meta article={lead} />
                  <h2 className="display mt-6 text-[2rem] leading-tight transition-colors group-hover:text-gold-100 md:text-[2.7rem]">{lead.title}</h2>
                  <p className="mt-5 text-[15.5px] leading-relaxed text-mist">{lead.excerpt}</p>
                  <span className="mt-8 inline-flex items-center gap-2 text-[13.5px] font-semibold text-gold-200 transition-all group-hover:gap-3">
                    Read the article <Icon name="arrow" className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="relative hidden overflow-hidden border-l border-gold-300/10 bg-ink-850 md:flex md:flex-col md:justify-between md:p-10">
                  <div className="grid-lines absolute inset-0 opacity-50" aria-hidden />
                  <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-gold-400/10 blur-3xl" aria-hidden />
                  <div className="relative flex items-center justify-between">
                    <span className="label">Featured read</span>
                    <span className="chip">
                      <Icon name="star" className="h-3.5 w-3.5 text-gold-300" /> Editor's pick
                    </span>
                  </div>
                  <div className="relative">
                    <Icon name="quote" className="h-9 w-9 text-gold-400/70" />
                    <p className="display serif-accent mt-5 text-[1.5rem] leading-snug text-gold-100">
                      Engineering notes, written by the person who shipped the code.
                    </p>
                  </div>
                  <div className="relative flex items-center gap-3.5 border-t border-gold-300/10 pt-6">
                    {leadAuthor?.photo ? (
                      <img
                        src={leadAuthor.photo}
                        alt={lead.author}
                        className="h-12 w-12 rounded-full border border-gold-300/30 object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <span className="grid h-12 w-12 place-items-center rounded-full border border-gold-300/30 bg-ink-900 text-gold">
                        <Icon name="user" className="h-5 w-5" />
                      </span>
                    )}
                    <div>
                      <p className="text-[14px] font-semibold text-ivory">{lead.author}</p>
                      <p className="text-[12.5px] text-mist">{leadAuthor?.role ?? "Founder · Lead Engineer"}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ) : (
            <p className="mt-16 text-center text-mist">No articles in this category yet.</p>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((a, i) => (
              <Reveal key={a.id} delay={(i % 3) * 80}>
                <Link to={`/insights/${a.id}`} className="lux-card lux-hover group flex h-full flex-col p-7">
                  <Meta article={a} />
                  <h3 className="display mt-5 text-[1.45rem] leading-snug transition-colors group-hover:text-gold-100">{a.title}</h3>
                  <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-mist">{a.excerpt}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[13px] font-semibold text-gold-200">
                    Read <Icon name="arrow" className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function InsightArticle({ article }: { article: Insight }) {
  const { collections } = useContent();
  const founder = collections.team.find((t) => t.name === article.author) ?? collections.team[0];
  const related = collections.insights.filter((a) => a.id !== article.id).slice(0, 2);

  return (
    <article>
      <header className="relative overflow-hidden pt-40 pb-14 md:pt-48">
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative max-w-4xl">
          <Link to="/insights" className="inline-flex items-center gap-2 text-[13px] font-semibold text-mist transition hover:text-gold-200">
            <Icon name="arrow-left" className="h-3.5 w-3.5" /> All insights
          </Link>
          <Meta article={article} className="mt-10" />
          <h1 className="display mt-6 text-[2.5rem] leading-[1.06] md:text-[3.9rem]">{article.title}</h1>
          <p className="mt-6 text-[18px] leading-relaxed text-sand">{article.excerpt}</p>
          <div className="mt-9 flex items-center gap-3.5 border-t border-gold-300/10 pt-6">
            {founder?.photo ? (
              <img src={founder.photo} alt="" className="h-11 w-11 rounded-full border border-gold-300/30 object-cover object-top" />
            ) : null}
            <div>
              <p className="text-[14px] font-semibold text-ivory">{article.author}</p>
              <p className="text-[12.5px] text-mist">{founder?.role}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="shell max-w-3xl pb-20">
        <div className="prose-lux">
          {article.body.map((block, i) => (
            <section key={i}>
              {block.heading ? <h2>{block.heading}</h2> : null}
              {block.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
              {block.list?.length ? (
                <ul>
                  {block.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="lux-card gold-edge mt-16 p-8 md:p-10">
          <p className="eyebrow">Work with us</p>
          <h2 className="display mt-5 text-[1.9rem] leading-tight">
            Want this level of engineering <span className="serif-accent text-gold">in your product?</span>
          </h2>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button to="/book" arrow track={`insight_${article.id}_book`}>
              Book a free call
            </Button>
            <Button to="/work" variant="line">
              See the products
            </Button>
          </div>
        </div>

        {related.length ? (
          <div className="mt-16">
            <p className="label">Keep reading</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {related.map((a) => (
                <Link key={a.id} to={`/insights/${a.id}`} className="lux-card lux-hover group p-6">
                  <Meta article={a} />
                  <p className="display mt-4 text-[1.2rem] leading-snug group-hover:text-gold-100">{a.title}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
