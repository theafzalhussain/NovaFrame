import { TechLogo } from "../components/TechLogo";
import { Button, PageHero, Reveal, SectionHeading } from "../components/ui";
import { languages } from "../data/content-extra";
import { useContent } from "../lib/content";

export default function TechStack() {
  const { collections } = useContent();
  const groups = collections.techStack;
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <>
      <PageHero
        eyebrow="Tech stack"
        title="Every tool here has"
        highlight="shipped to production."
        description={`${total} technologies across ${groups.length} layers — and each card says where it actually shipped. No logo collecting.`}
      >
        <Button to="/work" arrow>
          See it in the work
        </Button>
        <Button to="/book" variant="line">
          Discuss your stack
        </Button>
      </PageHero>

      <section className="pb-20">
        <div className="shell space-y-20">
          {groups.map((g, gi) => (
            <div key={g.id}>
              <Reveal>
                <div className="flex flex-col gap-3 border-b border-gold-300/10 pb-6 md:flex-row md:items-end md:justify-between">
                  <div>
                    <span className="font-mono text-[11px] text-gold-500">{String(gi + 1).padStart(2, "0")}</span>
                    <h2 className="display mt-2 text-[2.2rem] leading-none md:text-[2.7rem]">{g.title}</h2>
                  </div>
                  <p className="max-w-md text-[14.5px] text-mist md:text-right">{g.blurb}</p>
                </div>
              </Reveal>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.items.map((t, i) => (
                  <Reveal key={t.name} delay={(i % 4) * 50}>
                    <div className="lux-card lux-hover group flex h-full items-center gap-4 p-4">
                      <TechLogo name={t.name} icon={t.icon} />
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-semibold text-ivory">{t.name}</p>
                        <p className="mt-0.5 text-[12.5px] leading-snug text-mist">{t.note}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-gold-300/[0.07] bg-ink-900/50 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <SectionHeading eyebrow="Radical transparency" title="How this very website" highlight="is built." description="A React front end, an Express + SQLite API (with a PHP + MySQL edition) and an admin console that edits every section you're reading." />
          </Reveal>
          <Reveal delay={100}>
            <div className="lux-card mt-14 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-gold-300/10">
                    {["Technology", "Layer", "Role", "Where"].map((h) => (
                      <th key={h} scope="col" className="label px-6 py-4 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {languages.map((l) => (
                    <tr key={l.name} className="border-b border-gold-300/[0.06] last:border-0">
                      <th scope="row" className="px-6 py-4 text-[14.5px] font-semibold text-ivory">
                        {l.name}
                      </th>
                      <td className="px-6 py-4">
                        <span className="chip">{l.layer}</span>
                      </td>
                      <td className="px-6 py-4 text-[14px] text-sand">{l.role}</td>
                      <td className="px-6 py-4 font-mono text-[12px] text-mist">{l.where}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
