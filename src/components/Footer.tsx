import { useRef, useState } from "react";
import { Link } from "../lib/router";
import { useContent } from "../lib/content";
import { api, track } from "../lib/api";
import { usePauseOffscreen } from "../lib/onscreen";
import { phoneHref, whatsappLink } from "../lib/site";
import { Logo, Seal } from "./Brand";
import { Icon } from "./Icons";
import { StudioStatusPill } from "./StudioStatus";
import { Reveal } from "./ui";
import { cn } from "../utils/cn";

function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setState("busy");
    const res = await api.subscribe(email.trim());
    if (res.ok) {
      setState("done");
      setMessage(res.data?.existing ? "You're already on the list — thank you." : "You're in. One thoughtful email a month, never more.");
      setEmail("");
      track("newsletter_signup");
    } else {
      setState("error");
      setMessage(res.error ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-md">
      <label htmlFor="nl-email" className="label px-1">
        Studio notes — monthly
      </label>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-gold-300/15 bg-ink-850/70 p-1.5 focus-within:border-gold-300/50">
        <input
          id="nl-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "busy") setState("idle");
          }}
          placeholder="you@company.com"
          autoComplete="email"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[14px] text-ivory placeholder:text-smoke focus:outline-none"
        />
        <button type="submit" disabled={state === "busy"} className="btn btn-gold btn-sm shrink-0">
          {state === "busy" ? "Joining…" : "Subscribe"}
        </button>
      </div>
      <p
        role="status"
        className={cn("mt-2.5 min-h-[1.25rem] px-2 text-[12px]", state === "error" ? "text-ember" : "text-sage")}
      >
        {state === "done" || state === "error" ? message : ""}
      </p>
    </form>
  );
}

export default function Footer() {
  const { settings, collections } = useContent();
  const year = new Date().getFullYear();
  const pauseOffscreen = usePauseOffscreen(); // the gold shimmer on the closing line runs only while visible
  const wordmarkRef = useRef<HTMLDivElement | null>(null);

  // The outlined wordmark lights up in gold around the mouse. Mouse only; written straight to the DOM.
  const onWordmarkMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = wordmarkRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const studio = [
    { label: "Work", to: "/work" },
    { label: "The Studio", to: "/studio" },
    { label: "Pricing", to: "/pricing" },
    { label: "Tech stack", to: "/tech-stack" },
    { label: "Insights", to: "/insights" },
    { label: "Contact", to: "/contact" },
    { label: "Pay online", to: "/pay" },
    { label: "Earn with us", to: "/earn" },
  ];

  return (
    <footer ref={pauseOffscreen} className="cv-auto relative z-10 mt-10 overflow-hidden border-t border-gold-300/[0.08] bg-ink-950">
      {/* Gold edge along the top, brightest in the middle */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gold-300/50 to-transparent" />
      {/* Soft glow as a gradient — the old 120px blur filter was very expensive to paint on phones. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[280px] left-1/2 h-[560px] w-[1300px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(195,149,74,0.08),transparent)]"
      />

      {/* Closing CTA, framed like the hero's instrument panel */}
      <div className="shell relative pt-20 pb-16 md:pt-24">
        <Reveal>
          <div className="footer-cta relative overflow-hidden rounded-[32px] px-6 py-12 sm:px-10 md:py-16 lg:px-14">
            <div aria-hidden className="grid-lines pointer-events-none absolute inset-0" />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-40 -right-32 h-[520px] w-[520px] bg-[radial-gradient(closest-side,rgba(212,173,102,0.16),transparent)]"
            />
            <span className="hero-corner top-4 left-4 border-t border-l" aria-hidden />
            <span className="hero-corner top-4 right-4 border-t border-r" aria-hidden />
            <span className="hero-corner bottom-4 left-4 border-b border-l" aria-hidden />
            <span className="hero-corner right-4 bottom-4 border-r border-b" aria-hidden />

            <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="eyebrow">Let's talk</p>
                <h2 className="display mt-6 text-[2.5rem] leading-[1.02] sm:text-[3.4rem] md:text-[4.4rem]">
                  Have a project in mind? <br className="hidden md:block" />
                  <span className="serif-accent text-gold-shine">Let's build it properly.</span>
                </h2>
                <div className="mt-10 flex flex-wrap items-center gap-3.5">
                  <Link to="/book" className="btn btn-gold btn-lg shine group" onClick={() => track("cta_click", { label: "footer_book" })}>
                    Book a free strategy call
                    <Icon name="arrow" className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={2.2} />
                  </Link>
                  <a
                    href={whatsappLink(settings)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-line btn-lg"
                    onClick={() => track("cta_click", { label: "footer_whatsapp" })}
                  >
                    <Icon name="whatsapp" className="h-4 w-4" /> WhatsApp the founder
                  </a>
                </div>
              </div>
              {/* The studio seal, held in a slow orbit */}
              <div className="relative hidden h-[250px] w-[250px] place-items-center lg:grid" aria-hidden>
                <span className="absolute inset-0 rounded-full border border-gold-300/10" />
                <span className="animate-spin-slow absolute inset-[18px] rounded-full border border-dashed border-gold-300/15 [animation-direction:reverse]" />
                <span className="animate-spin-slow absolute inset-0">
                  <span className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-200 shadow-[0_0_14px_3px_rgba(242,214,151,0.55)]" />
                </span>
                <Seal size={170} text={`${settings.name.toUpperCase()} · EST. ${settings.founded} · ${settings.city.toUpperCase()} · `} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="shell relative">
        <div className="grid gap-12 pt-6 pb-16 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-mist">
              {settings.tagline} A founder-led studio designing and engineering websites, web apps and PWAs for ambitious brands.
            </p>
            <div className="mt-6">
              <StudioStatusPill />
            </div>
            <div className="mt-6 flex gap-2.5">
              {[...settings.socials, { label: "WhatsApp", href: whatsappLink(settings), icon: "whatsapp" }].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="foot-social grid h-10 w-10 place-items-center rounded-full border border-gold-300/15 text-mist"
                >
                  <Icon name={s.icon} className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="foot-heading label">Services</h3>
            <ul className="mt-5 space-y-3 text-[14px]">
              {collections.services.map((s) => (
                <li key={s.id}>
                  <Link to={`/services/${s.id}`} className="foot-link">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="foot-heading label">Studio</h3>
            <ul className="mt-5 space-y-3 text-[14px]">
              {studio.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="foot-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="foot-heading label">Get in touch</h3>
            <ul className="mt-3.5 space-y-1 text-[14px] text-sand">
              <li>
                <a href={`mailto:${settings.email}`} className="group inline-flex items-center gap-3 py-1.5 break-all transition hover:text-gold-200">
                  <span className="foot-icon">
                    <Icon name="mail" className="h-3.5 w-3.5" />
                  </span>
                  {settings.email}
                </a>
              </li>
              <li>
                <a href={phoneHref(settings.phone)} className="group inline-flex items-center gap-3 py-1.5 transition hover:text-gold-200">
                  <span className="foot-icon">
                    <Icon name="call" className="h-3.5 w-3.5" />
                  </span>
                  {settings.phone}
                </a>
              </li>
              <li className="flex items-center gap-3 py-1.5">
                <span className="foot-icon">
                  <Icon name="map-pin" className="h-3.5 w-3.5" />
                </span>
                {settings.location}
              </li>
              <li className="flex items-center gap-3 py-1.5 text-mist">
                <span className="foot-icon">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                </span>
                {settings.hours}
              </li>
            </ul>
            <div className="lux-inset mt-7 rounded-2xl px-3.5 pt-4 pb-1.5">
              <Newsletter />
            </div>
          </div>
        </div>

        {/* Outlined wordmark; the mouse lights it up in gold */}
        <div
          ref={wordmarkRef}
          onPointerMove={onWordmarkMove}
          className="foot-wordmark relative overflow-hidden [mask-image:linear-gradient(180deg,#000_45%,transparent)]"
          aria-hidden
        >
          <p className="wordmark-outline display select-none text-center text-[21vw] leading-[0.8] tracking-[-0.05em] lg:text-[16.5rem]">
            {settings.short}
          </p>
          <p className="wordmark-fill display pointer-events-none absolute inset-0 select-none text-center text-[21vw] leading-[0.8] tracking-[-0.05em] lg:text-[16.5rem]">
            {settings.short}
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-gold-300/[0.08] py-8 text-[12px] text-smoke md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {settings.legal}. All rights reserved.
          </p>
          <nav className="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-1" aria-label="Legal">
            <Link to="/privacy" className="rounded-md px-2 py-2 transition hover:text-gold-200">
              Privacy
            </Link>
            <Link to="/terms" className="rounded-md px-2 py-2 transition hover:text-gold-200">
              Terms
            </Link>
            <Link to="/sitemap" className="rounded-md px-2 py-2 transition hover:text-gold-200">
              Sitemap
            </Link>
          </nav>
          <div className="flex items-center justify-between gap-5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Designed & engineered in {settings.city}</span>
              <span className="h-1 w-1 rotate-45 bg-gold-500" />
              <span className="font-mono whitespace-nowrap text-gold-500/80">React · Node · SQL</span>
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0 })}
              aria-label="Back to top"
              title="Back to top"
              className="foot-top group grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold-300/20 text-gold-200"
            >
              <Icon name="arrow-up" className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
