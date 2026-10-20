import { useState } from "react";
import type { Faq as FaqItem } from "../data/types";
import { useCollection } from "../lib/content";
import { Icon } from "./Icons";
import { cn } from "../utils/cn";

export default function Faq({ items, limit }: { items?: FaqItem[]; limit?: number }) {
  const all = useCollection("faqs");
  const list = (items ?? all).slice(0, limit ?? undefined);
  const [open, setOpen] = useState<string | null>(list[0]?.id ?? null);

  return (
    <div className="mx-auto max-w-4xl divide-y divide-gold-300/10 border-y border-gold-300/10">
      {list.map((f, i) => {
        const isOpen = open === f.id;
        const panelId = `faq-${f.id}`;
        return (
          <div key={f.id}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : f.id)}
                className="group flex w-full items-start gap-5 py-6 text-left md:py-7"
              >
                <span className="mt-1.5 font-mono text-[11px] text-gold-500/80">{String(i + 1).padStart(2, "0")}</span>
                <span className={cn("display flex-1 text-[1.2rem] leading-snug transition-colors md:text-[1.4rem]", isOpen ? "text-gold-100" : "text-ivory group-hover:text-gold-100")}>
                  {f.q}
                </span>
                <span
                  className={cn(
                    "mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-500",
                    isOpen ? "rotate-45 border-gold-300/60 bg-gold-400/15 text-gold-200" : "border-gold-300/20 text-mist",
                  )}
                  aria-hidden
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              className={cn("grid transition-[grid-template-rows,opacity] duration-500", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
            >
              <div className="overflow-hidden">
                <p className="max-w-3xl pb-7 pl-10 text-[15px] leading-relaxed text-mist md:pl-11 md:text-[16px]">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
