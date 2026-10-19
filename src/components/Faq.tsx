import { useState } from "react";
import { faqs } from "../data/content";
import { cn } from "../utils/cn";

export default function Faq({ items = faqs }: { items?: typeof faqs }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-white/8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-start gap-4 px-5 py-5 text-left transition hover:bg-white/[0.03] sm:px-7"
            >
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-sm transition-all duration-300",
                  isOpen
                    ? "rotate-45 border-brand-400 bg-brand-500/20 text-brand-300"
                    : "border-white/15 text-slate-400",
                )}
              >
                +
              </span>
              <span className="font-display flex-1 text-[15px] font-semibold text-white sm:text-base">
                {item.q}
              </span>
            </button>
            <div
              className={cn(
                "grid transition-all duration-[400ms] ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-6 pl-[60px] text-sm leading-relaxed text-slate-400 sm:px-7 sm:pl-[68px]">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
