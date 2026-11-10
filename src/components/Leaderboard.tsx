import { useCallback, useEffect, useState } from "react";
import { formatPaise, partnerApi, type LeaderboardEntry } from "../lib/partner";
import { timeAgo } from "../lib/site";
import { Icon } from "./Icons";
import { cn } from "../utils/cn";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; entries: LeaderboardEntry[]; updatedAt: string };

const MEDALS = ["text-gold-200", "text-[#d8d8d8]", "text-[#d39a6a]"];

/** Live top-10 of partners by verified commission (refreshes every minute while open). */
export default function Leaderboard({ highlightName }: { highlightName?: string }) {
  const [period, setPeriod] = useState<"month" | "all">("month");
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async (p: "month" | "all", quiet = false) => {
    if (!quiet) setState({ status: "loading" });
    const res = await partnerApi.leaderboard(p);
    if (res.ok && res.data) setState({ status: "ready", entries: res.data.entries, updatedAt: res.data.updatedAt });
    else if (!quiet) setState({ status: "error" });
  }, []);

  useEffect(() => {
    void load(period);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(period, true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [period, load]);

  return (
    <div className="lux-card overflow-hidden rounded-[28px]">
      <div className="flex flex-col gap-4 border-b border-gold-300/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <span className="icon-tile h-10 w-10 rounded-xl">
            <Icon name="award" className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ivory">Top partners</p>
            <p className="flex items-center gap-1.5 text-[12px] text-smoke">
              <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse-dot" />
              Live · verified earnings{state.status === "ready" ? ` · updated ${timeAgo(state.updatedAt)}` : ""}
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-full border border-gold-300/12 bg-ink-950/60 p-1" role="tablist" aria-label="Leaderboard period">
          {(
            [
              ["month", "This month"],
              ["all", "All time"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={period === value}
              onClick={() => setPeriod(value)}
              className={cn("rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition", period === value ? "bg-gold-400/20 text-gold-100" : "text-mist hover:text-ivory")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" ? (
        <ul className="divide-y divide-gold-300/[0.06]" aria-busy="true" aria-label="Loading leaderboard">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-4 px-6 py-4 md:px-8">
              <span className="h-8 w-8 rounded-full bg-gold-300/[0.06]" />
              <span className="h-3 flex-1 rounded-full bg-gold-300/[0.06]" style={{ maxWidth: `${60 - i * 6}%` }} />
              <span className="h-3 w-16 rounded-full bg-gold-300/[0.06]" />
            </li>
          ))}
        </ul>
      ) : state.status === "error" ? (
        <div className="px-6 py-12 text-center md:px-8">
          <p className="text-[14px] text-sand">The leaderboard couldn't load right now.</p>
          <button type="button" onClick={() => void load(period)} className="btn btn-line btn-sm mt-4">
            <Icon name="refresh" className="h-4 w-4" /> Try again
          </button>
        </div>
      ) : state.entries.length === 0 ? (
        <div className="px-6 py-14 text-center md:px-8">
          <Icon name="trending" className="mx-auto h-7 w-7 text-gold-300" />
          <p className="display mt-4 text-[1.5rem]">The top spot is open.</p>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-mist">
            {period === "month" ? "No partner has earned yet this month." : "No partner has earned yet."} Refer one client and your name goes here.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-gold-300/[0.06]">
          {state.entries.map((e) => (
            <li
              key={`${e.rank}-${e.name}`}
              className={cn("flex items-center gap-4 px-6 py-3.5 md:px-8", highlightName && e.name === highlightName && "bg-gold-400/[0.07]")}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border font-mono text-[13px] font-semibold",
                  e.rank <= 3 ? "border-gold-300/40 bg-gold-400/10" : "border-gold-300/10 text-smoke",
                  MEDALS[e.rank - 1],
                )}
                aria-label={`Rank ${e.rank}`}
              >
                {e.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[14px] font-semibold text-ivory">
                  {e.name}
                  {e.tier === "ambassador" ? (
                    <span className="rounded-full border border-gold-300/40 bg-gold-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold-100">Ambassador</span>
                  ) : null}
                </p>
                <p className="truncate text-[12px] text-smoke">
                  {e.college} · {e.region}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-mono text-[12px] text-sand">{e.converted} won</p>
                <p className="text-[11px] text-smoke">{e.leads} leads</p>
              </div>
              <p className="w-28 shrink-0 text-right font-mono text-[14px] font-semibold text-gold-200">{formatPaise(e.earnedPaise)}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
