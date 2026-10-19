import { useMemo, useState } from "react";
import { Link } from "../lib/router";
import { insights, type Insight } from "../data/content-extra";
import { company } from "../data/content";
import {
  Eyebrow,
  GhostButton,
  Glow,
  PageHero,
  PrimaryButton,
  Reveal,
  SectionHeading,
} from "../components/ui";
import { cn } from "../utils/cn";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const cats = ["All", "Engineering", "Design", "Growth", "Studio"] as const;

export function InsightsPage() {
  const [cat, setCat] = useState<string>("All");
  const list = useMemo(
    () => (cat === "All" ? insights : insights.filter((i) => i.category === cat)),
    [cat],
  );
  const [featured, ...rest] = list;

  return (
    <>
      <PageHero
        eyebrow="Insights"
        title="Notes from inside"
        highlight="the studio."
        description="Engineering decisions, design process and growth experiments — documented so clients and peers can see how we actually think, not just what we ship."
      >
        <PrimaryButton to="/contact">Discuss your project</PrimaryButton>
      </PageHero>

      <section className="py-14 md:py-20">
        <div className="shell">
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[13px] font-medium transition",
                  cat === c
                    ? "border-brand-400/60 bg-brand-500/20 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {featured ? (
            <Reveal>
              <Link to={`/insights/${featured.slug}`} className="group mt-10 block">
                <article className="glass glass-hover grad-border grid overflow-hidden rounded-[28px] lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="p-7 md:p-10">
                    <div className="flex flex-wrap items-center gap-3">
                      <Eyebrow>{featured.category}</Eyebrow>
                      <span className="font-mono text-[11px] text-slate-500">{fmt(featured.date)}</span>
                      <span className="font-mono text-[11px] text-slate-600">· {featured.readTime}</span>
                    </div>
                    <h2 className="font-display mt-5 text-2xl leading-tight font-extrabold tracking-[-0.02em] text-white transition group-hover:text-brand-200 md:text-[2rem]">
                      {featured.title}
                    </h2>
                    <p className="mt-4 text-[15px] leading-relaxed text-slate-400">{featured.excerpt}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-brand-300 transition-all group-hover:gap-3">
                      Read article <span aria-hidden>→</span>
                    </span>
                  </div>
                  <div className="relative min-h-[220px] overflow-hidden border-t border-white/8 bg-gradient-to-br from-brand-600/25 via-ink-800 to-aqua-500/15 lg:border-t-0 lg:border-l">
                    <div className="dot-bg absolute inset-0 opacity-40" aria-hidden />
                    <div className="relative flex h-full flex-col justify-end p-8">
                      <span className="font-display text-[64px] leading-none font-extrabold text-white/10">
                        {featured.category.slice(0, 2).toUpperCase()}
                      </span>
                      <p className="font-display mt-2 text-[13px] font-semibold text-slate-300">
                        {featured.author}
                      </p>
                    </div>
                  </div>
                </article>
              </Link>
            </Reveal>
          ) : null}

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((a, i) => (
              <Reveal key={a.slug} delay={i * 80}>
                <Link to={`/insights/${a.slug}`} className="group block h-full">
                  <article className="glass glass-hover flex h-full flex-col rounded-3xl p-6">
                    <div className="flex items-center justify-between gap-3">
                      <Eyebrow>{a.category}</Eyebrow>
                      <span className="font-mono text-[10.5px] text-slate-500">{a.readTime}</span>
                    </div>
                    <h3 className="font-display mt-5 text-[17px] leading-snug font-bold text-white transition group-hover:text-brand-200">
                      {a.title}
                    </h3>
                    <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-slate-400">{a.excerpt}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-[11.5px] text-slate-500">
                      <span>{a.author}</span>
                      <span>{fmt(a.date)}</span>
                    </div>
                  </article>
                </Link>
              </Reveal>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="mt-16 text-center text-sm text-slate-500">
              No articles in this category yet. Try another filter.
            </p>
          ) : null}
        </div>
      </section>

      <section className="border-t border-white/8 bg-ink-900/40 py-20">
        <div className="shell">
          <Reveal>
            <div className="grad-border relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-600/28 via-ink-800 to-aqua-500/16 p-8 text-center md:p-12">
              <div className="grid-bg absolute inset-0 opacity-50" aria-hidden />
              <Glow className="-bottom-20 left-1/2 h-64 w-96 -translate-x-1/2" color="rgba(34,211,238,0.2)" />
              <div className="relative mx-auto max-w-xl">
                <Eyebrow>Work with us</Eyebrow>
                <h2 className="font-display mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Prefer we just build it for you?
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
                  Send a short brief and you will get a written proposal with scope and a fixed quote
                  within {company.responseTime.toLowerCase()}.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <PrimaryButton to="/contact">Start a project</PrimaryButton>
                  <GhostButton to="/work">See our results</GhostButton>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

export function InsightArticle({ article }: { article: Insight }) {
  const others = insights.filter((i) => i.slug !== article.slug).slice(0, 2);

  return (
    <>
      <section className="relative overflow-hidden pt-32 pb-12 md:pt-40">
        <div className="grid-bg absolute inset-0" aria-hidden />
        <Glow className="-top-24 left-1/2 h-[340px] w-[500px] -translate-x-1/2" color="rgba(79,70,229,0.22)" />
        <div className="shell relative">
          <Link
            to="/insights"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 transition hover:text-white"
          >
            <span aria-hidden>←</span> All insights
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Eyebrow>{article.category}</Eyebrow>
            <span className="font-mono text-[11.5px] text-slate-500">{fmt(article.date)}</span>
            <span className="font-mono text-[11.5px] text-slate-600">· {article.readTime}</span>
          </div>
          <h1 className="font-display mt-5 max-w-4xl text-[2.1rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-white sm:text-[2.9rem] md:text-[3.2rem]">
            {article.title}
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-slate-400 md:text-[17px]">
            {article.excerpt}
          </p>
          <div className="mt-7 flex items-center gap-3">
            <span className="font-display grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-aqua-500 text-[12px] font-bold text-white">
              {article.author
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-white">{article.author}</p>
              <p className="text-[11.5px] text-slate-500">{company.name}</p>
            </div>
          </div>
        </div>
      </section>

      <article className="border-y border-white/8 bg-ink-900/30 py-16 md:py-20">
        <div className="shell max-w-3xl">
          {article.body.map((block, i) => (
            <Reveal key={i} delay={i * 40}>
              <div className="mb-9">
                {block.heading ? (
                  <h2 className="font-display mb-4 text-xl font-bold tracking-tight text-white md:text-2xl">
                    {block.heading}
                  </h2>
                ) : null}
                {block.paragraphs.map((p, k) => (
                  <p key={k} className="mb-4 text-[16px] leading-[1.75] text-slate-300">
                    {p}
                  </p>
                ))}
                {block.list ? (
                  <ul className="mt-5 space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                    {block.list.map((li) => (
                      <li key={li} className="flex items-start gap-3 text-[15px] leading-relaxed text-slate-300">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
                        {li}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Reveal>
          ))}

          <div className="grad-border mt-12 rounded-3xl bg-gradient-to-br from-brand-600/25 to-aqua-500/12 p-7 text-center">
            <h3 className="font-display text-xl font-bold text-white">
              Want this applied to your product?
            </h3>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-slate-300">
              We take on a limited number of projects each quarter. Tell us what you are building and we
              will tell you what is realistic.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <PrimaryButton to="/contact">Start a project</PrimaryButton>
              <GhostButton to="/pricing">See pricing</GhostButton>
            </div>
          </div>
        </div>
      </article>

      <section className="py-16">
        <div className="shell">
          <Reveal>
            <SectionHeading align="left" eyebrow="Keep reading" title="More from" highlight="the studio." />
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {others.map((a, i) => (
              <Reveal key={a.slug} delay={i * 80}>
                <Link to={`/insights/${a.slug}`} className="group block h-full">
                  <article className="glass glass-hover h-full rounded-3xl p-6">
                    <Eyebrow>{a.category}</Eyebrow>
                    <h3 className="font-display mt-4 text-[17px] leading-snug font-bold text-white transition group-hover:text-brand-200">
                      {a.title}
                    </h3>
                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-400">{a.excerpt}</p>
                  </article>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
