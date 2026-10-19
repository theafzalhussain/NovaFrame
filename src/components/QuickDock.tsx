import { useEffect, useState } from "react";
import { Link } from "../lib/router";
import { company } from "../data/content";
import { cn } from "../utils/cn";

/**
 * Floating Quick Action Hub
 * Gives high-intent clients instant one-tap access to booking an intro call,
 * phone dialer, or project inquiry form.
 */
export default function QuickDock() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Appear after user scrolls down 400px
      setVisible(window.scrollY > 400);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <aside
      aria-label="Quick contact actions"
      className={cn(
        "fixed right-4 bottom-5 z-40 flex flex-col items-end gap-2.5 transition-all duration-400 ease-out sm:right-6 sm:bottom-6",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0",
      )}
    >
      {/* 30-min intro call button */}
      <Link
        to="/book"
        className="glass-card group flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px] font-medium text-slate-200 shadow-xl transition-all hover:border-brand-400/60 hover:bg-white/[0.08] hover:text-white"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-aqua-500 text-[11px] font-bold text-white shadow-sm">
          30
        </span>
        <span>Schedule Call</span>
      </Link>

      {/* Direct Phone Dial */}
      <a
        href={company.phoneHref}
        className="glass-card group flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-medium text-slate-300 shadow-lg transition-all hover:border-brand-400/50 hover:text-white"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-white/12 bg-white/5 text-[11px] text-brand-300">
          📞
        </span>
        <span>{company.phone}</span>
      </a>

      {/* Start Project CTA Pill */}
      <Link
        to="/contact"
        className="shine flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 via-indigo-500 to-aqua-500 px-5 py-3 font-display text-[13.5px] font-semibold text-white shadow-[0_12px_36px_-12px_rgba(79,70,229,0.95)] transition hover:brightness-110 active:scale-[0.98]"
      >
        <span>Start a Project</span>
        <span aria-hidden>→</span>
      </Link>
    </aside>
  );
}
