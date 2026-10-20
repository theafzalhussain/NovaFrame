import { useState } from "react";
import { Link } from "../lib/router";
import { useContent } from "../lib/content";
import { api, track } from "../lib/api";
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
      <label htmlFor="nl-email" className="label">
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
          className="min-w-0 flex-1 bg-transparent px-3.5 py-2 text-[14px] text-ivory placeholder:text-smoke focus:outline-none"
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

  const studio = [
    { label: "Work", to: "/work" },
    { label: "The Studio", to: "/studio" },
    { label: "Pricing", to: "/pricing" },
    { label: "Tech stack", to: "/tech-stack" },
    { label: "Insights", to: "/insights" },
    { label: "Contact", to: "/contact" },
    { label: "Pay online", to: "/pay" },
  ];

  return (
    <footer className="relative z-10 mt-10 overflow-hidden border-t border-gold-300/[0.08] bg-ink-950">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-gold-500/[0.08] blur-[120px]" />

      {/* Closing CTA */}
      <div className="shell relative pt-24 pb-16 md:pt-28">
        <Reveal>
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">Let's talk</p>
              <h2 className="display mt-6 text-[2.6rem] leading-[1.02] sm:text-6xl md:text-[5rem]">
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
            <Seal size={170} className="hidden lg:block" text={`${settings.name.toUpperCase()} · EST. ${settings.founded} · ${settings.city.toUpperCase()} · `} />
          </div>
        </Reveal>
      </div>

      <div className="shell relative">
        <div className="hairline" />
        <div className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr]">
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
                  className="grid h-10 w-10 place-items-center rounded-full border border-gold-300/15 text-mist transition hover:border-gold-300/60 hover:text-gold-200"
                >
                  <Icon name={s.icon} className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="label">Services</h3>
            <ul className="mt-5 space-y-3 text-[14px]">
              {collections.services.map((s) => (
                <li key={s.id}>
                  <Link to={`/services/${s.id}`} className="text-sand transition hover:text-gold-200">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="label">Studio</h3>
            <ul className="mt-5 space-y-3 text-[14px]">
              {studio.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sand transition hover:text-gold-200">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="label">Get in touch</h3>
            <ul className="mt-5 space-y-3 text-[14px] text-sand">
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2.5 break-all transition hover:text-gold-200">
                  <Icon name="mail" className="h-4 w-4 shrink-0 text-gold-400" />
                  {settings.email}
                </a>
              </li>
              <li>
                <a href={phoneHref(settings.phone)} className="inline-flex items-center gap-2.5 transition hover:text-gold-200">
                  <Icon name="call" className="h-4 w-4 shrink-0 text-gold-400" />
                  {settings.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                {settings.location}
              </li>
              <li className="flex items-start gap-2.5 text-mist">
                <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                {settings.hours}
              </li>
            </ul>
            <div className="mt-8">
              <Newsletter />
            </div>
          </div>
        </div>

        <div className="overflow-hidden" aria-hidden>
          <p className="wordmark-outline display select-none text-center text-[21vw] leading-[0.8] tracking-[-0.05em] lg:text-[16.5rem]">
            {settings.short}
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-gold-300/[0.08] py-8 text-[12px] text-smoke md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {settings.legal}. All rights reserved.
          </p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Legal">
            <Link to="/privacy" className="transition hover:text-gold-200">
              Privacy
            </Link>
            <Link to="/terms" className="transition hover:text-gold-200">
              Terms
            </Link>
            <Link to="/sitemap" className="transition hover:text-gold-200">
              Sitemap
            </Link>
          </nav>
          <p className="flex items-center gap-2">
            <span>Designed & engineered in {settings.city}</span>
            <span className="h-1 w-1 rotate-45 bg-gold-500" />
            <span className="font-mono text-gold-500/80">React · Node · SQL</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
