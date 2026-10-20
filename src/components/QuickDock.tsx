import { useEffect, useRef, useState } from "react";
import { Link } from "../lib/router";
import { useSettings } from "../lib/content";
import { track } from "../lib/api";
import { phoneHref, whatsappLink } from "../lib/site";
import { BrandMark } from "./Brand";
import { Icon } from "./Icons";
import { StatusDot, useStudioStatus } from "./StudioStatus";
import { cn } from "../utils/cn";

/**
 * Concierge — a floating, one-tap contact hub for high-intent visitors.
 */
export default function QuickDock() {
  const settings = useSettings();
  const status = useStudioStatus();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Show after the hero; step aside near the footer, which has every contact option.
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 760;
      setVisible(window.scrollY > 520 && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const actions = [
    { label: "WhatsApp", hint: "Fastest reply", icon: "whatsapp", href: whatsappLink(settings), external: true },
    { label: "Book a 30-min call", hint: "Free, no obligation", icon: "calendar", to: "/book" },
    { label: "Send a project brief", hint: "Get a written quote", icon: "doc", to: "/contact" },
    { label: `Call ${settings.phone}`, hint: settings.hours, icon: "call", href: phoneHref(settings.phone) },
  ];

  return (
    <aside
      ref={panelRef}
      aria-label="Contact concierge"
      className={cn(
        "fixed right-4 bottom-5 z-40 flex flex-col items-end gap-3 transition-all duration-500 sm:right-6 sm:bottom-6",
        visible || open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0",
      )}
    >
      <div
        className={cn(
          "lux-panel w-[300px] origin-bottom-right rounded-[22px] p-2 transition-all duration-400",
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0",
        )}
      >
        <div className="flex items-center gap-3 border-b border-gold-300/10 px-3 pt-2 pb-3.5">
          <BrandMark size={34} />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ivory">Talk to the founder</p>
            <p className="flex items-center gap-1.5 text-[11.5px] text-mist">
              <StatusDot online={status.online} className="h-1.5 w-1.5" />
              {status.online ? "Online now — usually replies in minutes" : settings.responseTime}
            </p>
          </div>
        </div>
        <div className="mt-1.5 space-y-0.5">
          {actions.map((a) => {
            const inner = (
              <>
                <span className="icon-tile h-9 w-9 rounded-[11px]">
                  <Icon name={a.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-parchment">{a.label}</span>
                  <span className="block truncate text-[11px] text-smoke">{a.hint}</span>
                </span>
                <Icon name="arrow-up-right" className="h-3.5 w-3.5 text-smoke transition group-hover:text-gold-300" />
              </>
            );
            const cls = "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-gold-300/[0.06]";
            const onClick = () => {
              track("cta_click", { label: `dock_${a.icon}` });
              setOpen(false);
            };
            return a.to ? (
              <Link key={a.label} to={a.to} className={cls} onClick={onClick}>
                {inner}
              </Link>
            ) : (
              <a key={a.label} href={a.href} className={cls} onClick={onClick} {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {inner}
              </a>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close contact options" : "Open contact options"}
        className="btn btn-gold shine h-14 rounded-full pr-5 pl-2 shadow-2xl"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-ink-950/90 text-gold-300">
          <Icon name={open ? "close" : "chat"} className="h-[18px] w-[18px]" />
        </span>
        <span className="hidden sm:inline">{open ? "Close" : "Let's talk"}</span>
      </button>
    </aside>
  );
}
