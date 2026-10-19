import { useEffect, useState } from "react";
import { Link, useRouter } from "../lib/router";
import { company, navLinks, services } from "../data/content";
import { BrandMark, Logo } from "./Brand";
import { Icon } from "./Icons";
import { cn } from "../utils/cn";

export default function Navbar() {
  const { path } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 15);
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

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/[0.08] bg-[#05060f]/90 backdrop-blur-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.85)]"
          : "bg-transparent",
      )}
    >
      <nav className="shell flex h-[76px] items-center justify-between gap-4">
        {/* Company Brand Logo */}
        <Logo />

        {/* Center Navigation Menu Pill */}
        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-[#090b1a]/70 px-2 py-1.5 backdrop-blur-xl shadow-inner lg:flex">
          {navLinks.slice(0, 1).map((link) => (
            <NavLink key={link.to} link={link} active={path === link.to} />
          ))}

          {/* Capabilities Mega-Menu Trigger */}
          <div
            className="relative"
            onMouseEnter={() => setMega(true)}
            onMouseLeave={() => setMega(false)}
          >
            <Link
              to="/services"
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-medium transition-all duration-200",
                mega || path.startsWith("/services") || path.startsWith("/capabilities")
                  ? "bg-white/12 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/[0.04]",
              )}
            >
              <span>Capabilities</span>
              <svg
                viewBox="0 0 24 24"
                className={cn("h-3.5 w-3.5 transition-transform duration-300", mega && "rotate-180")}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Link>

            {/* Mega Dropdown Panel - Solid Opaque Background to prevent overlapping hero text */}
            <div
              className={cn(
                "absolute top-full left-1/2 w-[680px] -translate-x-1/2 pt-4 transition-all duration-300 ease-out z-[9999]",
                mega ? "pointer-events-auto opacity-100 translate-y-0 visible" : "pointer-events-none -translate-y-2 opacity-0 invisible",
              )}
            >
              <div className="relative rounded-[26px] border border-white/[0.14] bg-[#080a18] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.95)] backdrop-blur-3xl ring-1 ring-white/10">
                {/* Subtle internal gradient tint */}
                <div className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-indigo-500/[0.07] via-transparent to-cyan-500/[0.05] pointer-events-none" />

                <div className="relative grid grid-cols-2 gap-2">
                  {services.map((s) => (
                    <Link
                      key={s.id}
                      to={`/services/${s.id}`}
                      className="group flex items-start gap-3.5 rounded-2xl border border-transparent p-3.5 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.05]"
                    >
                      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-gradient-to-br from-brand-500/25 to-aqua-500/15 text-brand-300 shadow-sm transition-transform duration-200 group-hover:scale-105">
                        <Icon name={s.icon} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="font-display block text-[14px] font-bold text-white group-hover:text-brand-300 transition-colors">
                          {s.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-slate-400">
                          {s.items[0].title}
                          {s.items.length > 1 ? ` +${s.items.length - 1} more` : ""}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Banner inside dropdown */}
                <div className="relative mt-3 pt-3 border-t border-white/[0.08]">
                  <Link
                    to="/book"
                    className="flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-600/35 via-indigo-600/25 to-aqua-500/20 px-4 py-3 transition-all hover:brightness-110 border border-brand-400/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-display text-[13px] font-semibold text-white">
                        Free 30-min discovery session with our Lead Architect
                      </span>
                    </div>
                    <span aria-hidden="true" className="text-white text-sm font-bold transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {navLinks.slice(2).map((link) => (
            <NavLink key={link.to} link={link} active={path === link.to} />
          ))}
        </div>

        {/* Right CTA / Indicators */}
        <div className="flex items-center gap-3">
          {/* Availability Badge */}
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#090b1a]/70 px-3.5 py-1.5 text-[12px] text-slate-300 xl:inline-flex backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-lime-glow animate-pulse" />
            <span className="font-medium text-slate-200">2 Q3 Slots Open</span>
          </div>

          {/* Primary CTA */}
          <Link
            to="/contact"
            className="shine hidden items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-aqua-500 px-5 py-2.5 font-display text-[13.5px] font-semibold text-white shadow-[0_12px_32px_-12px_rgba(79,70,229,0.95)] transition hover:brightness-110 active:scale-[0.98] sm:inline-flex"
          >
            Start a Project
          </Link>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-white/5 text-white lg:hidden"
          >
            <span className="relative block h-3.5 w-4.5">
              <span
                className={cn(
                  "absolute left-0 h-[2px] w-full rounded bg-current transition-all duration-300",
                  open ? "top-1.5 rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute top-1.5 left-0 h-[2px] w-full rounded bg-current transition-all duration-200",
                  open && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 h-[2px] w-full rounded bg-current transition-all duration-300",
                  open ? "top-1.5 -rotate-45" : "top-3",
                )}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Top Scroll Indicator Line */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.04]">
        <div
          className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-aqua-400 transition-[width] duration-100 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Mobile Drawer Navigation */}
      <div
        className={cn(
          "max-h-[82vh] overflow-y-auto border-t border-white/8 bg-[#05060f]/98 backdrop-blur-3xl transition-all duration-300 lg:hidden",
          open ? "max-h-[82vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none",
        )}
      >
        <div className="shell flex flex-col gap-1.5 py-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase px-3">Navigation</p>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "font-display rounded-2xl px-4 py-3 text-[16px] font-semibold transition",
                path === link.to ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/6",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="hairline my-3" />
          <Link
            to="/contact"
            className="rounded-2xl bg-gradient-to-r from-brand-500 to-aqua-500 px-4 py-3.5 text-center font-display text-[15px] font-semibold text-white shadow-lg"
          >
            Start a Project
          </Link>
          <div className="mt-4 flex items-center justify-between px-3 text-[13px] text-slate-400">
            <a href={company.phoneHref} className="hover:text-white">
              {company.phone}
            </a>
            <a href={`mailto:${company.email}`} className="hover:text-white">
              {company.email}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ link, active }: { link: { label: string; to: string }; active: boolean }) {
  return (
    <Link
      to={link.to}
      className={cn(
        "relative rounded-full px-4 py-2 text-[13.5px] font-medium transition-all duration-200",
        active
          ? "bg-white/12 text-white shadow-sm"
          : "text-slate-300 hover:text-white hover:bg-white/[0.04]",
      )}
    >
      {link.label}
      {active ? (
        <span className="absolute inset-x-3.5 -bottom-[2px] h-[2px] rounded-full bg-gradient-to-r from-brand-400 to-aqua-400" />
      ) : null}
    </Link>
  );
}

export { BrandMark };
