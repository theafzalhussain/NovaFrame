import { Link } from "../lib/router";
import { company, services } from "../data/content";
import { Logo } from "./Brand";

const socialPaths: Record<string, string> = {
  in: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05A4.2 4.2 0 0 1 17.6 8.7c3 0 3.9 1.9 3.9 4.9V21h-4v-6.3c0-1.5-.5-2.5-1.9-2.5-1.1 0-1.8.8-2.1 1.5-.1.3-.1.6-.1 1V21h-4V9Z",
  gh: "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z",
  dr: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.6 4.6a8.3 8.3 0 0 1 1.9 5.1c-.28-.06-3.1-.63-5.94-.27-.06-.15-.12-.3-.19-.45-.18-.42-.37-.84-.57-1.25 3.15-1.29 4.58-3.14 4.8-3.13ZM12 3.5c2.06 0 3.94.77 5.37 2.04-.18.26-1.47 2-4.5 3.14A45 45 0 0 0 9.6 3.83c.76-.21 1.56-.33 2.4-.33ZM7.85 4.4a54 54 0 0 1 3.26 4.83c-3.4.9-6.4.88-6.72.88a8.53 8.53 0 0 1 3.46-5.7ZM3.47 12v-.25c.31.01 3.9.06 7.58-1.05.21.41.41.83.6 1.25l-.29.09c-3.8 1.23-5.83 4.58-6 4.87A8.46 8.46 0 0 1 3.47 12Zm8.53 8.53a8.46 8.46 0 0 1-5.23-1.8c.13-.27 1.6-3.1 5.7-4.54l.05-.01a35 35 0 0 1 1.8 6.35 8.4 8.4 0 0 1-2.32 0Zm4.02-1.13a36.4 36.4 0 0 0-1.64-5.94c2.68-.43 5.03.27 5.32.36a8.5 8.5 0 0 1-3.68 5.58Z",
  ig: "M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.96.24 2.65.5.71.28 1.31.65 1.9 1.24a5.2 5.2 0 0 1 1.24 1.9c.27.7.46 1.48.51 2.65.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.96-.51 2.65a5.2 5.2 0 0 1-1.24 1.9 5.2 5.2 0 0 1-1.9 1.24c-.7.27-1.48.46-2.65.51-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.96-.24-2.65-.51a5.2 5.2 0 0 1-1.9-1.24 5.2 5.2 0 0 1-1.24-1.9c-.27-.7-.46-1.48-.51-2.65C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.24-1.96.51-2.65A5.2 5.2 0 0 1 4.02 2.6a5.2 5.2 0 0 1 1.9-1.24c.7-.27 1.48-.46 2.65-.51C9.83 2.21 10.2 2.2 12 2.2Zm0 1.8c-3.14 0-3.5.01-4.73.07-.94.04-1.45.2-1.79.33-.45.17-.77.38-1.11.72-.34.34-.55.66-.72 1.11-.13.34-.29.85-.33 1.79C3.26 9.25 3.25 9.6 3.25 12s.01 2.75.07 3.98c.04.94.2 1.45.33 1.79.17.45.38.77.72 1.11.34.34.66.55 1.11.72.34.13.85.29 1.79.33 1.23.06 1.59.07 4.73.07s3.5-.01 4.73-.07c.94-.04 1.45-.2 1.79-.33.45-.17.77-.38 1.11-.72.34-.34.55-.66.72-1.11.13-.34.29-.85.33-1.79.06-1.23.07-1.58.07-3.98s-.01-2.75-.07-3.98c-.04-.94-.2-1.45-.33-1.79a2.98 2.98 0 0 0-.72-1.11 2.98 2.98 0 0 0-1.11-.72c-.34-.13-.85-.29-1.79-.33C15.5 4.01 15.14 4 12 4Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm5.1-2.35a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z",
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/8 bg-ink-900/50">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 left-1/2 h-80 w-[760px] -translate-x-1/2 rounded-full bg-brand-600/18 blur-[130px]"
      />

      {/* CTA strip */}
      <div className="shell relative pt-14">
        <div className="glass grad-border flex flex-col items-center gap-5 rounded-[28px] px-6 py-8 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-brand-300 uppercase">
              Available for new projects
            </p>
            <h2 className="font-display mt-2.5 text-xl font-bold tracking-tight text-white md:text-2xl">
              Have a product in mind? Let's scope it properly.
            </h2>
          </div>
          <Link
            to="/contact"
            className="shine inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-aqua-500 px-6 py-3 font-display text-[13.5px] font-semibold text-white shadow-[0_16px_40px_-18px_rgba(79,70,229,0.95)] transition hover:brightness-110"
          >
            Start a project <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className="shell relative py-14">
        <div className="grid gap-11 lg:grid-cols-[1.5fr_1fr_1fr_1.25fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-[13.5px] leading-relaxed text-slate-400">
              {company.tagline} We design, engineer and grow digital products for ambitious teams —
              one senior squad across web, app, design, SEO and video.
            </p>
            <div className="mt-5 flex gap-2.5">
              {company.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="group grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] transition hover:border-brand-400/60 hover:bg-white/[0.09]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-slate-400 transition group-hover:fill-white">
                    <path d={socialPaths[s.icon]} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-[10.5px] font-bold tracking-[0.2em] text-slate-500 uppercase">
              Capabilities
            </h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              {services.map((s) => (
                <li key={s.id}>
                  <Link to="/services" className="text-slate-400 transition hover:text-white">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-[10.5px] font-bold tracking-[0.2em] text-slate-500 uppercase">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              {[
                { label: "Home", to: "/" },
                { label: "Capabilities", to: "/services" },
                { label: "Work", to: "/work" },
                { label: "The Studio", to: "/studio" },
                { label: "Tech Stack", to: "/tech-stack" },
                { label: "Pricing", to: "/pricing" },
                { label: "Insights", to: "/insights" },
                { label: "Contact", to: "/contact" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-slate-400 transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-[10.5px] font-bold tracking-[0.2em] text-slate-500 uppercase">
              Get in touch
            </h3>
            <ul className="mt-4 space-y-3 text-[13.5px] text-slate-400">
              <li>
                <a href={`mailto:${company.email}`} className="transition hover:text-white">
                  {company.email}
                </a>
              </li>
              <li>
                <a href={company.phoneHref} className="transition hover:text-white">
                  {company.phone}
                </a>
              </li>
              <li>{company.location}</li>
              <li className="text-slate-500">{company.hours}</li>
            </ul>
            <Link
              to="/book"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-[12.5px] font-medium text-white transition hover:border-brand-400/60 hover:bg-white/[0.09]"
            >
              Book a 30-min call <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/8 pt-6 text-[11.5px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {company.legal}. All rights reserved.
          </p>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition hover:text-white">
              Terms of Service
            </Link>
            <Link to="/sitemap" className="transition hover:text-white">
              Sitemap
            </Link>
          </nav>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Engineered with</span>
            <span className="font-mono text-[11px] text-brand-300">Next.js · TypeScript · Tailwind · SQL</span>
            <span className="text-slate-700">|</span>
            <span>Made in India, shipped worldwide</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
