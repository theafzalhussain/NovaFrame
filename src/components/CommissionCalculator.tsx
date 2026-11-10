import { useMemo, useState } from "react";
import { INSTALLMENT_PLANS, commissionPaise, splitInstallments } from "../data/partner";
import { formatPaise } from "../lib/partner";
import { Icon } from "./Icons";
import { cn } from "../utils/cn";

const PRESETS = [
  { label: "Landing page", value: 12_000, icon: "layout" },
  { label: "Business website", value: 30_000, icon: "globe" },
  { label: "Online store", value: 60_000, icon: "cart" },
  { label: "Web / mobile app", value: 1_50_000, icon: "phone" },
];
const MIN = 5_000;
const MAX = 5_00_000;
const INSTALLMENT_NAMES = ["Advance", "Milestone 2", "Milestone 3", "Final payment"];

/**
 * Earnings estimate for the "Earn With Us" page. It uses the same rounding rule as the
 * server (commissionPaise), but only the server credits real commission — from verified payments.
 */
export default function CommissionCalculator({ percent }: { percent: number }) {
  const [value, setValue] = useState(40_000);
  const [draft, setDraft] = useState("40000");
  const [planId, setPlanId] = useState("40-30-30");
  const [perMonth, setPerMonth] = useState(2);

  const plan = INSTALLMENT_PLANS.find((p) => p.id === planId) ?? INSTALLMENT_PLANS[0];

  const schedule = useMemo(() => {
    const parts = splitInstallments(value * 100, plan.split);
    return parts.map((paid, i) => ({
      name: plan.split.length === 1 ? "Full payment" : i === parts.length - 1 ? "Final payment" : INSTALLMENT_NAMES[i],
      pct: plan.split[i],
      paid,
      earn: commissionPaise(paid, percent),
    }));
  }, [value, plan, percent]);

  const perProject = schedule.reduce((s, r) => s + r.earn, 0);
  const monthly = perProject * perMonth;

  const setAmount = (next: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, Math.round(next)));
    setValue(clamped);
    setDraft(String(clamped));
  };

  return (
    <div className="lux-card gold-edge overflow-hidden rounded-[28px]">
      <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
        <div className="border-b border-gold-300/10 p-6 md:p-10 lg:border-r lg:border-b-0">
          <p className="label">
            <span className="text-gold-400">01</span> · Your client's project
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" aria-pressed={value === p.value} onClick={() => setAmount(p.value)} className="choice flex-col items-start gap-2 p-3.5">
                <Icon name={p.icon} className="h-[18px] w-[18px] text-gold-300" />
                <span className="text-[13px] leading-tight font-semibold">{p.label}</span>
                <span className="font-mono text-[10.5px] text-smoke">{formatPaise(p.value * 100)}</span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="calc-value" className="field-label">
                Project value
              </label>
              <div className="relative w-40">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] text-smoke">₹</span>
                <input
                  id="calc-value"
                  inputMode="numeric"
                  className="field field-sm pl-8 text-right font-mono"
                  value={draft}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
                    setDraft(digits);
                    const n = Number(digits);
                    if (n >= MIN && n <= MAX) setValue(n);
                  }}
                  onBlur={() => setAmount(Number(draft) || MIN)}
                  aria-describedby="calc-range"
                />
              </div>
            </div>
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={1000}
              value={value}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-4 h-1.5 w-full cursor-pointer accent-gold-400"
              aria-label="Project value"
            />
            <p id="calc-range" className="mt-1.5 flex justify-between font-mono text-[10.5px] text-smoke">
              <span>{formatPaise(MIN * 100)}</span>
              <span>{formatPaise(MAX * 100)}</span>
            </p>
          </div>

          <p className="label mt-8">
            <span className="text-gold-400">02</span> · How the client pays
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {INSTALLMENT_PLANS.map((p) => (
              <button key={p.id} type="button" aria-pressed={planId === p.id} onClick={() => setPlanId(p.id)} className="choice flex-col items-start gap-1.5 px-3.5 py-3">
                <span className="text-[13px] font-semibold">{p.label}</span>
                <span className="font-mono text-[10.5px] text-smoke">{p.split.join(" / ")}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-gold-300/10">
            <div className="flex h-2 w-full" aria-hidden>
              {schedule.map((row, i) => (
                <span key={i} className={cn("h-full", i % 2 ? "bg-gold-500/60" : "bg-gold-300")} style={{ width: `${row.pct}%` }} />
              ))}
            </div>
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">Commission per installment</caption>
              <thead>
                <tr className="border-b border-gold-300/10">
                  <th scope="col" className="label px-4 py-2.5 font-medium">
                    Installment
                  </th>
                  <th scope="col" className="label px-4 py-2.5 text-right font-medium">
                    Client pays
                  </th>
                  <th scope="col" className="label px-4 py-2.5 text-right font-medium">
                    You earn
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => (
                  <tr key={i} className="border-b border-gold-300/[0.06] last:border-0">
                    <td className="px-4 py-2.5 text-parchment">
                      {row.name} <span className="font-mono text-[11px] text-smoke">· {row.pct}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sand">{formatPaise(row.paid)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-gold-200">+{formatPaise(row.earn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="calc-per-month" className="field-label">
                <span className="text-gold-400">03</span> · Clients you refer per month
              </label>
              <span className="font-mono text-[14px] font-semibold text-ivory">{perMonth}</span>
            </div>
            <input
              id="calc-per-month"
              type="range"
              min={1}
              max={10}
              step={1}
              value={perMonth}
              onChange={(e) => setPerMonth(Number(e.target.value))}
              className="mt-4 h-1.5 w-full cursor-pointer accent-gold-400"
            />
          </div>
        </div>

        <div className="relative flex flex-col justify-between gap-8 bg-gradient-to-b from-gold-400/[0.06] to-transparent p-6 md:p-10">
          <div>
            <p className="label">You earn per project</p>
            <div className="display mt-4 text-[2.6rem] leading-none text-ivory sm:text-[3.1rem]" aria-live="polite">
              {formatPaise(perProject)}
            </div>
            <p className="mt-2 text-[13px] text-mist">
              {percent}% of {formatPaise(value * 100)}, paid as each installment clears
            </p>

            <dl className="mt-8 space-y-3.5 border-t border-gold-300/10 pt-6 text-[13.5px]">
              {[
                ["Per month", formatPaise(monthly)],
                ["Per year", formatPaise(monthly * 12)],
                ["Installments", `${schedule.length} × commission`],
                ["Paid to", "UPI or bank account"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4">
                  <dt className="text-mist">{k}</dt>
                  <dd className="text-right font-semibold text-parchment">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-smoke">
            <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
            An estimate to help you plan. Real commission is calculated by our server only from client payments we have verified.
          </p>
        </div>
      </div>
    </div>
  );
}
