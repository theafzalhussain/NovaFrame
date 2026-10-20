import { useEffect, useState } from "react";
import { Link, useRouter } from "../lib/router";
import { useContent } from "../lib/content";
import { availabilityLabel, isActivePath, navLinks, whatsappLink } from "../lib/site";
import { track } from "../lib/api";
import { Logo } from "./Brand";
import { Icon } from "./Icons";
import { StatusDot, useStudioStatus } from "./StudioStatus";
import { cn } from "../utils/cn";

const ANNOUNCE_KEY = "nf_announce_dismissed";

export default function Navbar() {
  const { path } = useRouter();
  const { settings, collections } = useContent();
  const services = collections.services;
  const status = useStudioStatus();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  const [announceHidden, setAnnounceHidden] = useState(() => {
    try {
      return sessionStorage.getItem(ANNOUNCE_KEY) === settings.announcement.text;
    } catch {
      return false;
    }
  });

  const showAnnounce = settings.announcement.enabled && settings.announcement.text && !announceHidden;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
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
    setOpen(false);
    setMega(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMega(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dismiss = () => {
    setAnnounceHidden(true);
    try {
      sessionStorage.setItem(ANNOUNCE_KEY, settings.announcement.text);
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Announcement */}
      <div
        className={cn(
          "overflow-hidden border-b border-gold-300/10 bg-ink-950/95 transition-[max-height,opacity] duration-500",
          showAnnounce && !scrolled ? "max-h-14 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="shell flex items-center justify-center gap-3 py-2.5 text-[12.5px]">
          <Icon name="sparkle" className="hidden h-3.5 w-3.5 shrink-0 text-gold-400 sm:block" />
          <p className="truncate text-sand">{settings.announcement.text}</p>
          {settings.announcement.link ? (
            <Link
              to={settings.announcement.link}
              onClick={() => track("cta_click", { label: "announcement" })}
              className="shrink-0 font-semibold text-gold-300 underline-offset-4 hover:underline"
            >
              {settings.announcement.linkLabel || "Learn more"} →
            </Link>
          ) : null}
          <button type="button" onClick={dismiss} aria-label="Dismiss announcement" className="ml-1 shrink-0 text-smoke hover:text-ivory">
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "relative border-b transition-all duration-500",
          scrolled || open ? "border-gold-300/10 bg-ink-950/80 backdrop-blur-xl" : "border-transparent bg-transparent",
        )}
      >
        <nav className="shell flex h-[76px] items-center justify-between gap-4" aria-label="Primary">
          <Logo />

          <div className="hidden items-center gap-1 lg:flex">
            {/* Services menu */}
            <div className="relative" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
              <button
                type="button"
                aria-expanded={mega}
                aria-haspopup="true"
                onClick={() => setMega((v) => !v)}
                onFocus={() => setMega(true)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-semibold tracking-[0.01em] transition-colors",
                  mega || isActivePath(path, "/services") ? "text-gold-200" : "text-sand hover:text-ivory",
                )}
              >
                Services
                <Icon name="chevron-down" className={cn("h-3.5 w-3.5 transition-transform duration-300", mega && "rotate-180")} />
              </button>

              <div
                className={cn(
                  "absolute top-full left-1/2 w-[760px] -translate-x-1/2 pt-4 transition-all duration-300",
                  mega ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
                )}
              >
                <div className="lux-panel grid grid-cols-[1fr_250px] overflow-hidden rounded-[24px]">
                  <div className="grid grid-cols-2 gap-1 p-3">
                    {services.map((s) => (
                      <Link
                        key={s.id}
                        to={`/services/${s.id}`}
                        className="group flex items-start gap-3.5 rounded-2xl p-3.5 transition-colors hover:bg-gold-300/[0.06]"
                      >
                        <span className="icon-tile mt-0.5 h-10 w-10 rounded-xl">
                          <Icon name={s.icon} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-ivory transition-colors group-hover:text-gold-200">
                            {s.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-mist">
                            From {s.startingAt} · {s.timeline}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="relative flex flex-col justify-between border-l border-gold-300/10 bg-gradient-to-b from-gold-400/[0.08] to-transparent p-6">
                    <div>
                      <p className="label text-gold-300">Free consultation</p>
                      <p className="display mt-3 text-[1.4rem] leading-tight">
                        30 minutes with the <span className="serif-accent text-gold">founder.</span>
                      </p>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-mist">Scope, stack and budget — answered honestly, with no obligation.</p>
                    </div>
                    <Link to="/book" className="btn btn-gold btn-sm shine mt-5 w-full" onClick={() => track("cta_click", { label: "nav_menu_book" })}>
                      Book a call
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {navLinks
              .filter((l) => l.to !== "/services")
              .map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-[13.5px] font-semibold tracking-[0.01em] transition-colors",
                    isActivePath(path, link.to) ? "text-gold-200" : "text-sand hover:text-ivory",
                  )}
                >
                  {link.label}
                  {isActivePath(path, link.to) ? (
                    <span className="absolute inset-x-4 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
                  ) : null}
                </Link>
              ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("nf:palette"))}
              aria-label="Search the site"
              title="Search (Ctrl + K)"
              className="hidden items-center gap-2 rounded-full border border-gold-300/12 py-2 pr-2 pl-3 text-mist transition hover:border-gold-300/30 hover:text-ivory md:inline-flex"
            >
              <Icon name="search" className="h-3.5 w-3.5" />
              <span className="kbd">⌘K</span>
            </button>

            <span
              className="hidden items-center gap-2 rounded-full border border-gold-300/12 px-3.5 py-2 text-[12px] text-sand xl:inline-flex"
              title={status.online ? `Online now · ${status.time} ${settings.timezoneLabel}` : `Away · ${status.time} ${settings.timezoneLabel}`}
            >
              <StatusDot online={status.online} />
              {availabilityLabel(settings)}
            </span>

            <Link
              to="/book"
              onClick={() => track("cta_click", { label: "nav_book" })}
              className="btn btn-gold btn-sm shine hidden sm:inline-flex"
            >
              Book a call
            </Link>

            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid h-11 w-11 place-items-center rounded-full border border-gold-300/20 text-ivory lg:hidden"
            >
              <span className="relative block h-3.5 w-[18px]">
                <span className={cn("absolute left-0 h-px w-full bg-current transition-all duration-300", open ? "top-1.5 rotate-45" : "top-0")} />
                <span className={cn("absolute top-1.5 left-0 h-px w-full bg-current transition-opacity", open && "opacity-0")} />
                <span className={cn("absolute left-0 h-px bg-current transition-all duration-300", open ? "top-1.5 w-full -rotate-45" : "top-3 w-2/3")} />
              </span>
            </button>
          </div>
        </nav>

        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px">
          <div className="h-full bg-gradient-to-r from-gold-700 via-gold-300 to-gold-500 transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-x-0 top-[76px] bottom-0 overflow-y-auto bg-ink-950/98 backdrop-blur-xl transition-all duration-500 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <div className="shell flex min-h-full flex-col py-8">
          <p className="label">Menu</p>
          <div className="mt-4 flex flex-col">
            {[{ label: "Home", to: "/" }, ...navLinks, { label: "Tech stack", to: "/tech-stack" }].map((link, i) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "display flex items-baseline justify-between border-b border-gold-300/[0.08] py-4 text-[2rem] leading-none transition-colors",
                  isActivePath(path, link.to) ? "text-gold-200" : "text-ivory hover:text-gold-200",
                )}
                style={{ transitionDelay: open ? `${i * 30}ms` : "0ms" }}
              >
                {link.label}
                <span className="font-mono text-[11px] text-smoke">0{i + 1}</span>
              </Link>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link to="/book" className="btn btn-gold">
              Book a call
            </Link>
            <a href={whatsappLink(settings)} target="_blank" rel="noopener noreferrer" className="btn btn-line">
              <Icon name="whatsapp" className="h-4 w-4" /> WhatsApp
            </a>
          </div>
          <div className="mt-auto flex items-center justify-between pt-10 text-[13px] text-mist">
            <a href={`mailto:${settings.email}`} className="truncate hover:text-ivory">
              {settings.email}
            </a>
            <span className="flex shrink-0 items-center gap-2">
              <StatusDot online={status.online} />
              {status.online ? "Online" : "Away"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
