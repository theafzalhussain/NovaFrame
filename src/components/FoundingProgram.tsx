import { useSettings } from "../lib/content";
import { usePauseOffscreen } from "../lib/onscreen";
import { Seal } from "./Brand";
import { Icon } from "./Icons";
import { Button, Reveal } from "./ui";

/** Honest alternative to testimonials while the studio earns its first case studies. */
export default function FoundingProgram() {
  const settings = useSettings();
  const offer = settings.founding;
  const pauseOffscreen = usePauseOffscreen(); // the animated gold border only runs while the card is on screen
  if (!offer.enabled) return null;
  const taken = Math.max(0, offer.slotsTotal - offer.slotsLeft);

  return (
    <section ref={pauseOffscreen} className="relative py-24 md:py-32">
      <div className="shell">
        <Reveal>
          <div className="lux-card gold-orbit relative overflow-hidden rounded-[32px]">
            <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
            <div
              aria-hidden
              className="absolute -top-[13rem] -right-[11rem] h-[30rem] w-[30rem] bg-[radial-gradient(closest-side,rgba(212,173,102,0.15),transparent)]"
            />
            <div className="relative grid gap-12 p-8 md:p-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <span className="eyebrow">{offer.eyebrow}</span>
                <h2 className="display mt-6 text-[2.3rem] leading-[1.05] sm:text-5xl">
                  {offer.title} <span className="serif-accent text-gold">{offer.highlight}</span>
                </h2>
                <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-sand">{offer.note}</p>

                <div className="mt-9 max-w-md">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-mist">Founding slots</span>
                    <span className="font-semibold text-gold-200">
                      {offer.slotsLeft} of {offer.slotsTotal} available
                    </span>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {Array.from({ length: offer.slotsTotal }).map((_, i) => (
                      <span
                        key={i}
                        className={i < taken ? "h-1.5 flex-1 rounded-full bg-gold-300/15" : "h-1.5 flex-1 rounded-full bg-gradient-to-r from-gold-300 to-gold-500"}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-3.5">
                  <Button to="/book" arrow track="founding_book">
                    Claim a founding slot
                  </Button>
                  <Button to="/work" variant="line">
                    Inspect our work first
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Seal size={120} className="absolute -top-10 -right-4 hidden opacity-80 md:block" text="FOUNDING CLIENT · LIMITED · " />
                <div className="grid gap-3 sm:grid-cols-2">
                  {offer.perks.map((perk) => (
                    <div key={perk.title} className="lux-inset rounded-2xl p-5">
                      <span className="icon-tile h-10 w-10 rounded-xl">
                        <Icon name={perk.icon} className="h-[18px] w-[18px]" />
                      </span>
                      <p className="mt-4 text-[15px] font-semibold text-ivory">{perk.title}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-mist">{perk.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
