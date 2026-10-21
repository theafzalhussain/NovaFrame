import { useEffect, useMemo, useRef, useState } from "react";
import { scrollToId, useRouter } from "../lib/router";
import { useContent } from "../lib/content";
import { navLinks, whatsappLink } from "../lib/site";
import { Icon } from "./Icons";
import { cn } from "../utils/cn";

type Command = { id: string; label: string; hint: string; icon: string; keywords?: string; run: () => void };

export default function CommandPalette() {
  const { navigate } = useRouter();
  const { settings, collections } = useContent();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("nf:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nf:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => {
      navigate(to);
      setOpen(false);
    };
    return [
      { id: "home", label: "Home", hint: "Page", icon: "home", run: go("/") },
      ...navLinks.map((l) => ({ id: `nav-${l.to}`, label: l.label, hint: "Page", icon: "arrow", run: go(l.to) })),
      { id: "tech", label: "Tech stack", hint: "Page", icon: "cpu", run: go("/tech-stack") },
      { id: "book", label: "Book a free 30-min call", hint: "Action", icon: "calendar", keywords: "meeting schedule discovery consultation", run: go("/book") },
      { id: "pay", label: "Make a payment", hint: "Action", icon: "lock", keywords: "pay invoice advance milestone razorpay upi card", run: go("/pay") },
      {
        id: "estimate",
        label: "Estimate my project cost",
        hint: "Tool",
        icon: "rupee",
        keywords: "price quote budget calculator",
        run: () => {
          navigate("/pricing");
          setOpen(false);
          setTimeout(() => scrollToId("estimator"), 160);
        },
      },
      ...collections.services.map((s) => ({ id: `svc-${s.id}`, label: s.title, hint: "Service", icon: s.icon, keywords: s.tagline, run: go(`/services/${s.id}`) })),
      ...collections.projects.map((p) => ({ id: `work-${p.id}`, label: p.title, hint: "Case study", icon: "diamond", keywords: `${p.category} ${p.subtitle} ${p.stack.join(" ")}`, run: go(`/work/${p.id}`) })),
      ...collections.insights.map((a) => ({ id: `ins-${a.id}`, label: a.title, hint: "Insight", icon: "book", keywords: a.category, run: go(`/insights/${a.id}`) })),
      {
        id: "whatsapp",
        label: "Chat on WhatsApp",
        hint: "Contact",
        icon: "whatsapp",
        keywords: "message chat",
        run: () => {
          window.open(whatsappLink(settings), "_blank", "noopener");
          setOpen(false);
        },
      },
      {
        id: "email",
        label: `Email ${settings.email}`,
        hint: "Contact",
        icon: "mail",
        keywords: "mail",
        run: () => {
          window.location.href = `mailto:${settings.email}`;
          setOpen(false);
        },
      },
    ];
  }, [navigate, collections, settings]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.hint} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center p-4 pt-[13vh]" role="dialog" aria-modal="true" aria-label="Search">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 cursor-default bg-ink-950/90 pointer-fine:bg-ink-950/80 pointer-fine:backdrop-blur-md"
        onClick={() => setOpen(false)}
      />
      <div className="lux-panel page-enter relative w-full max-w-xl overflow-hidden rounded-[24px]">
        <div className="flex items-center gap-3 border-b border-gold-300/10 px-5">
          <Icon name="search" className="h-4 w-4 shrink-0 text-gold-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                results[active]?.run();
              }
            }}
            placeholder="Search pages, work, services…"
            aria-label="Search"
            className="w-full bg-transparent py-4.5 text-[15px] text-ivory placeholder:text-smoke focus:outline-none"
          />
          <span className="kbd shrink-0">esc</span>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-smoke">Nothing matches “{query}”.</p>
          ) : (
            results.map((c, i) => (
              <button
                key={c.id}
                type="button"
                data-index={i}
                onPointerMove={(e) => e.pointerType === "mouse" && setActive(i)}
                onClick={() => c.run()}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                  i === active ? "bg-gold-300/[0.08] text-ivory" : "text-sand",
                )}
              >
                <span className={cn("icon-tile h-8 w-8 rounded-[10px]", i !== active && "opacity-70")}>
                  <Icon name={c.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{c.label}</span>
                <span className="label shrink-0 text-[9.5px]">{c.hint}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
