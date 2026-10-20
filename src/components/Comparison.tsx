import type { CompareValue } from "../data/types";
import { useContent } from "../lib/content";
import { Icon } from "./Icons";
import { cn } from "../utils/cn";

function Cell({ value, highlight }: { value: CompareValue; highlight: boolean }) {
  if (value === "yes") {
    return (
      <span
        className={cn(
          "mx-auto grid h-7 w-7 place-items-center rounded-full",
          highlight ? "bg-gradient-to-b from-gold-200 to-gold-500 text-ink-950 shadow-[0_6px_18px_-6px_rgba(212,173,102,0.9)]" : "border border-gold-300/30 text-gold-300",
        )}
        aria-label="Yes"
      >
        <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="mx-auto block w-fit rounded-full border border-gold-300/15 px-2.5 py-0.5 font-mono text-[10px] tracking-wide text-mist" aria-label="Sometimes">
        varies
      </span>
    );
  }
  return (
    <span className="mx-auto grid h-7 w-7 place-items-center text-smoke" aria-label="No">
      <Icon name="minus" className="h-4 w-4" />
    </span>
  );
}

export default function Comparison() {
  const { advanced, settings } = useContent();
  const { columns, rows } = advanced.comparison;
  const highlightIndex = columns.length - 1;

  return (
    <div className="lux-card overflow-x-auto rounded-[26px]">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">How {settings.short} compares with a typical agency and a freelancer</caption>
        <thead>
          <tr className="border-b border-gold-300/10">
            <th scope="col" className="px-6 py-5 text-[12px] font-medium text-smoke">
              What you get
            </th>
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  "px-4 py-5 text-center text-[13px] font-semibold",
                  i === highlightIndex ? "bg-gold-400/[0.07] text-gold-200" : "text-mist",
                )}
              >
                {i === highlightIndex ? <span className="display text-[1.15rem] text-gold">{c}</span> : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={row.label} className={cn(r !== rows.length - 1 && "border-b border-gold-300/[0.06]")}>
              <th scope="row" className="px-6 py-4 text-[14px] font-medium text-parchment">
                {row.label}
              </th>
              {row.values.map((v, i) => (
                <td key={i} className={cn("px-4 py-4 text-center", i === highlightIndex && "bg-gold-400/[0.07]")}>
                  <Cell value={v} highlight={i === highlightIndex} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
