import { useMemo, useState } from "react";
import { useContent } from "../lib/content";
import { useRouter } from "../lib/router";
import { track } from "../lib/api";
import { budgetForAmount, formatINR, saveBriefDraft } from "../lib/site";
import { Icon } from "./Icons";
import { Button } from "./ui";
import { cn } from "../utils/cn";

/**
 * Instant project cost estimator. Pricing comes from Admin → Advanced
 * settings; the selection hands off to the contact form as a draft brief.
 */
export default function Estimator() {
  const { navigate } = useRouter();
  const { advanced } = useContent();
  const config = advanced.estimator;
  const [typeId, setTypeId] = useState(config.types[0]?.id ?? "");
  const [size, setSize] = useState(0);
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [rush, setRush] = useState(false);

  const type = config.types.find((t) => t.id === typeId) ?? config.types[0];
  const availableExtras = config.extras.filter((e) => e.for.includes(type?.id ?? ""));

  const toggleExtra = (id: string) =>
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { low, high, weeks } = useMemo(() => {
    if (!type) return { low: 0, high: 0, weeks: [0, 0] as [number, number] };
    const base = type.base * (config.sizeMultipliers[size] ?? 1);
    const extrasTotal = availableExtras.filter((e) => extras.has(e.id)).reduce((sum, e) => sum + e.price, 0);
    let subtotal = base + extrasTotal;
    if (rush) subtotal *= config.rushMultiplier;
    const extraWeeks = config.sizeWeeks[size] ?? 0;
    const w: [number, number] = [type.weeks[0] + extraWeeks, type.weeks[1] + extraWeeks + (extras.size > 2 ? 1 : 0)];
    return {
      low: subtotal,
      high: subtotal * 1.35,
      weeks: (rush ? w.map((x) => Math.max(1, Math.round(x * 0.7))) : w) as [number, number],
    };
  }, [type, size, extras, rush, availableExtras, config]);

  if (!type) return null;

  const sendToBrief = () => {
    const chosen = availableExtras.filter((e) => extras.has(e.id)).map((e) => e.label);
    saveBriefDraft({
      service: type.service,
      budget: budgetForAmount(advanced, low),
      timeline: rush ? advanced.timelineOptions[0] : advanced.timelineOptions[1],
      source: "estimator",
      details:
        `Estimator request — ${type.label} (${type.sizes[size]}).\n` +
        (chosen.length ? `Add-ons: ${chosen.join(", ")}.\n` : "") +
        (rush ? "Priority / fast-track requested.\n" : "") +
        `Ballpark seen on site: ${formatINR(low)} – ${formatINR(high)}.`,
    });
    track("estimator_quote", { type: type.id, size, extras: chosen.length, rush });
    navigate("/contact");
  };

  return (
    <div className="lux-card gold-edge overflow-hidden rounded-[28px]">
      <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
        <div className="border-b border-gold-300/10 p-6 md:p-10 lg:border-r lg:border-b-0">
          <p className="label">
            <span className="text-gold-400">01</span> · What are you building?
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {config.types.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={typeId === t.id}
                onClick={() => {
                  setTypeId(t.id);
                  setSize(0);
                  setExtras(new Set());
                }}
                className="choice flex-col items-start gap-2.5 p-3.5"
              >
                <Icon name={t.icon} className="h-[18px] w-[18px] text-gold-300" />
                <span className="text-[13px] leading-tight font-semibold">{t.label}</span>
              </button>
            ))}
          </div>

          <p className="label mt-8">
            <span className="text-gold-400">02</span> · How big?
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {type.sizes.map((label, i) => (
              <button key={label} type="button" aria-pressed={size === i} onClick={() => setSize(i)} className="choice justify-between px-4 py-3">
                <span className="text-[13px] font-medium">{label}</span>
                <span className="font-mono text-[10.5px] text-smoke">{["S", "M", "L"][i]}</span>
              </button>
            ))}
          </div>

          {availableExtras.length > 0 && (
            <>
              <p className="label mt-8">
                <span className="text-gold-400">03</span> · Add-ons <span className="normal-case tracking-normal text-smoke">(optional)</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {availableExtras.map((e) => {
                  const on = extras.has(e.id);
                  return (
                    <button key={e.id} type="button" aria-pressed={on} onClick={() => toggleExtra(e.id)} className="choice gap-2 rounded-full py-2 pr-3.5 pl-2.5 text-[12.5px]">
                      <span
                        className={cn(
                          "grid h-[18px] w-[18px] place-items-center rounded-full border transition",
                          on ? "border-gold-300 bg-gold-400 text-ink-950" : "border-gold-300/30 text-transparent",
                        )}
                      >
                        <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      <span className="font-medium">{e.label}</span>
                      <span className="font-mono text-[10.5px] text-smoke">+{formatINR(e.price)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <button type="button" aria-pressed={rush} onClick={() => setRush((v) => !v)} className="choice mt-7 w-full justify-between px-4 py-3.5">
            <span className="flex items-center gap-2.5">
              <Icon name="bolt" className="h-4 w-4 text-gold-300" />
              <span className="text-[13px] font-medium">Priority fast-track (+{Math.round((config.rushMultiplier - 1) * 100)}%)</span>
            </span>
            <span className="toggle" data-on={rush} aria-hidden />
          </button>
        </div>

        <div className="relative flex flex-col justify-between gap-8 bg-gradient-to-b from-gold-400/[0.06] to-transparent p-6 md:p-10">
          <div>
            <p className="label">Estimated investment</p>
            <div className="display mt-4 text-[2.6rem] leading-none text-ivory sm:text-[3.1rem]" aria-live="polite">
              {formatINR(low)}
            </div>
            <p className="mt-2 text-[13px] text-mist">up to {formatINR(high)} · typical range</p>

            <dl className="mt-8 space-y-3.5 border-t border-gold-300/10 pt-6 text-[13.5px]">
              {[
                ["Timeline", `${weeks[0]}–${weeks[1]} weeks`],
                ["Best-fit service", type.service],
                ["Payment", "Milestones · 40 / 40 / 20"],
                ["You own", "100% of code & design"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4">
                  <dt className="text-mist">{k}</dt>
                  <dd className="text-right font-semibold text-parchment">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <Button onClick={sendToBrief} arrow className="w-full">
              Get my exact quote
            </Button>
            <Button to="/book" variant="line" className="mt-2.5 w-full" track="estimator_book">
              Talk it through on a call
            </Button>
            <p className="mt-5 flex items-start gap-2 text-[11.5px] leading-relaxed text-smoke">
              <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
              A ballpark to help you plan. Your written quote is fixed-scope — no hidden extras.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
