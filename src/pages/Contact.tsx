import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icons";
import { StudioStatusPill } from "../components/StudioStatus";
import { Button, PageHero, Reveal } from "../components/ui";
import { api, track } from "../lib/api";
import { useContent } from "../lib/content";
import { Link, useRouter } from "../lib/router";
import { clearBriefDraft, phoneHref, readBriefDraft, whatsappLink } from "../lib/site";
import { cn } from "../utils/cn";

type FormState = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  service: string;
  budget: string;
  timeline: string;
  details: string;
  website: string;
};

const EMPTY: FormState = { name: "", companyName: "", email: "", phone: "", service: "", budget: "", timeline: "", details: "", website: "" };

function Field({ label, hint, error, htmlFor, children, required }: { label: string; hint?: string; error?: string; htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="field-label">
          {label} {required ? <span className="text-gold-400">*</span> : null}
        </label>
        {hint ? <span className="text-[11px] text-smoke">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-1.5 text-[12px] text-ember" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceGroup({ options, value, onChange, label }: { options: string[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className="choice rounded-full px-4 py-2 text-[13px] font-medium">
          {o}
        </button>
      ))}
    </div>
  );
}

export default function Contact() {
  const { settings, advanced, collections } = useContent();
  const { query } = useRouter();
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, timeline: advanced.timelineOptions[1] ?? "" }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<{ reference: string; offline: boolean } | null>(null);
  const [source, setSource] = useState("contact");
  const [prefilled, setPrefilled] = useState(false);

  const serviceOptions = useMemo(() => [...collections.services.map((s) => s.title), "Multiple / not sure"], [collections.services]);
  const budgetOptions = useMemo(() => [...advanced.budgetRanges.map((b) => b.label), advanced.budgetUnsure], [advanced]);

  useEffect(() => {
    const draft = readBriefDraft();
    const qs = query.get("service");
    if (draft) {
      setForm((f) => ({ ...f, service: draft.service ?? f.service, budget: draft.budget ?? f.budget, timeline: draft.timeline ?? f.timeline, details: draft.details ?? f.details }));
      setSource(draft.source ?? "estimator");
      setPrefilled(true);
      clearBriefDraft();
    } else if (qs) {
      setForm((f) => ({ ...f, service: qs }));
      setSource("service_page");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = "Please enter a valid email address.";
    if (!form.service) next.service = "Choose the closest service.";
    if (!form.budget) next.budget = "Choose a budget range — it helps us scope realistically.";
    if (form.details.trim().length < 20) next.details = "A little more detail helps (at least 20 characters).";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !validate()) return;
    setPending(true);
    const res = await api.submitEnquiry({ ...form, source });
    setPending(false);
    if (!res.ok) {
      if (res.errors) setErrors(res.errors as Partial<Record<keyof FormState, string>>);
      else setErrors({ details: res.error ?? "Something went wrong. Please email us directly." });
      return;
    }
    setSent({ reference: res.data?.reference ?? "", offline: Boolean(res.offline) });
    track("enquiry_submitted", { service: form.service, budget: form.budget, source });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const briefText = `Name: ${form.name}\nCompany: ${form.companyName}\nEmail: ${form.email}\nPhone: ${form.phone}\nService: ${form.service}\nBudget: ${form.budget}\nTimeline: ${form.timeline}\n\n${form.details}`;
  const mailto = `mailto:${settings.email}?subject=${encodeURIComponent(`Project enquiry — ${form.service || "New project"}`)}&body=${encodeURIComponent(briefText)}`;

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Tell us what you're building —"
        highlight="we'll reply within 12 hours."
        description="Share a short brief and receive a written scope, timeline and fixed quote. We ask for a budget range only so we can recommend something genuinely feasible."
      >
        <Button to="/book" arrow track="contact_book">
          Prefer a call? Book 30 min
        </Button>
        <Button href={whatsappLink(settings)} variant="line" icon="whatsapp" track="contact_whatsapp">
          WhatsApp
        </Button>
      </PageHero>

      <section className="pb-24">
        <div className="shell grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Reveal>
            <div className="lux-card gold-edge relative overflow-hidden p-6 md:p-10">
              {sent ? (
                <div className="py-6 text-center md:py-10" aria-live="polite">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-b from-gold-200 to-gold-500 text-ink-950 shadow-[0_14px_40px_-12px_rgba(212,173,102,0.9)]">
                    <Icon name="check" className="h-7 w-7" strokeWidth={2.4} />
                  </div>
                  <h2 className="display mt-8 text-[2.2rem] leading-tight">
                    Thank you, {form.name.split(" ")[0]}. <span className="serif-accent text-gold">Brief received.</span>
                  </h2>
                  {sent.offline ? (
                    <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-ember/40 bg-ember/10 p-5 text-left text-[13.5px] leading-relaxed text-parchment">
                      <p className="font-semibold text-ivory">Our server didn't respond, so the brief is only saved in this browser.</p>
                      <p className="mt-1.5 text-sand">Please send it with one tap so it definitely reaches us:</p>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        <a href={mailto} className="btn btn-gold btn-sm">
                          <Icon name="mail" className="h-4 w-4" /> Send by email
                        </a>
                        <a href={whatsappLink(settings, `Hi! My project brief:\n\n${briefText}`)} target="_blank" rel="noopener noreferrer" className="btn btn-line btn-sm">
                          <Icon name="whatsapp" className="h-4 w-4" /> Send on WhatsApp
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-mist">
                      {settings.responseTime}. If it's urgent, book a call and we can scope it the same day.
                    </p>
                  )}
                  <dl className="mx-auto mt-8 max-w-sm space-y-2.5 rounded-2xl border border-gold-300/10 bg-ink-950/60 p-5 text-left text-[13.5px]">
                    {sent.reference ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-mist">Reference</dt>
                        <dd className="font-mono text-gold-200">{sent.reference}</dd>
                      </div>
                    ) : null}
                    {[
                      ["Service", form.service],
                      ["Budget", form.budget],
                      ["Timeline", form.timeline],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt className="text-mist">{k}</dt>
                        <dd className="text-right font-semibold text-parchment">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button to="/book" arrow>
                      Book a call now
                    </Button>
                    <button
                      type="button"
                      className="btn btn-line"
                      onClick={() => {
                        setForm({ ...EMPTY, timeline: advanced.timelineOptions[1] ?? "" });
                        setSent(null);
                        setPrefilled(false);
                      }}
                    >
                      Send another brief
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="eyebrow">Project brief</p>
                      <h2 className="display mt-4 text-[1.9rem] leading-tight md:text-[2.3rem]">About the project</h2>
                    </div>
                    <span className="label">takes ~2 minutes</span>
                  </div>

                  {prefilled ? (
                    <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-gold-300/25 bg-gold-400/[0.07] px-4 py-3 text-[13px] text-gold-100">
                      <Icon name="sparkle" className="h-4 w-4 shrink-0" />
                      We pre-filled this from your estimate — adjust anything before sending.
                    </div>
                  ) : null}

                  {/* Honeypot (hidden from people, irresistible to bots) */}
                  <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                    <label>
                      Website
                      <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
                    </label>
                  </div>

                  <p className="label mt-9">
                    <span className="text-gold-400">01</span> · About you
                  </p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Field label="Full name" required error={errors.name} htmlFor="c-name">
                      <input id="c-name" className="field" autoComplete="name" placeholder="Your name" value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={Boolean(errors.name)} />
                    </Field>
                    <Field label="Company" hint="optional" htmlFor="c-company">
                      <input id="c-company" className="field" autoComplete="organization" placeholder="Company or brand" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
                    </Field>
                    <Field label="Email" required error={errors.email} htmlFor="c-email">
                      <input id="c-email" className="field" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={Boolean(errors.email)} />
                    </Field>
                    <Field label="Phone / WhatsApp" hint="optional" htmlFor="c-phone">
                      <input id="c-phone" className="field" type="tel" autoComplete="tel" placeholder="+91 …" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                    </Field>
                  </div>

                  <p className="label mt-10">
                    <span className="text-gold-400">02</span> · The project
                  </p>
                  <div className="mt-5 space-y-7">
                    <Field label="What do you need?" required error={errors.service}>
                      <ChoiceGroup label="Service" options={serviceOptions.includes(form.service) || !form.service ? serviceOptions : [form.service, ...serviceOptions]} value={form.service} onChange={(v) => set("service", v)} />
                    </Field>
                    <Field label="Budget range" required error={errors.budget}>
                      <ChoiceGroup label="Budget" options={budgetOptions} value={form.budget} onChange={(v) => set("budget", v)} />
                    </Field>
                    <Field label="Ideal start">
                      <ChoiceGroup label="Timeline" options={advanced.timelineOptions} value={form.timeline} onChange={(v) => set("timeline", v)} />
                    </Field>
                  </div>

                  <p className="label mt-10">
                    <span className="text-gold-400">03</span> · Details
                  </p>
                  <div className="mt-5">
                    <Field label="Tell us about it" required hint={`${form.details.trim().length}/20+`} error={errors.details} htmlFor="c-details">
                      <textarea
                        id="c-details"
                        rows={6}
                        className="field"
                        placeholder="What needs to be built, who it's for, and what success looks like. Links to references are welcome."
                        value={form.details}
                        onChange={(e) => set("details", e.target.value)}
                        aria-invalid={Boolean(errors.details)}
                      />
                    </Field>
                  </div>

                  <div className="mt-9 flex flex-col gap-5 border-t border-gold-300/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex max-w-xs items-start gap-2 text-[12px] leading-relaxed text-smoke">
                      <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
                      Used only to discuss this enquiry. No spam, no resale — NDA available on request.
                    </p>
                    <button type="submit" disabled={pending} className="btn btn-gold btn-lg shine group">
                      {pending ? "Sending…" : "Send my brief"}
                      <Icon name="send" className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          <aside className="space-y-5">
            <Reveal delay={100}>
              <div className="lux-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="label">Direct lines</p>
                </div>
                <StudioStatusPill className="mt-4" />
                <div className="mt-5 space-y-2.5">
                  {[
                    { icon: "whatsapp", label: "WhatsApp", value: "Fastest reply", href: whatsappLink(settings), external: true },
                    { icon: "mail", label: "Email", value: settings.email, href: `mailto:${settings.email}` },
                    { icon: "call", label: "Call", value: settings.phone, href: phoneHref(settings.phone) },
                  ].map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      onClick={() => track("cta_click", { label: `contact_side_${l.icon}` })}
                      className="group flex items-center gap-3 rounded-2xl border border-gold-300/10 p-3.5 transition hover:border-gold-300/40 hover:bg-gold-300/[0.04]"
                    >
                      <span className="icon-tile h-10 w-10 rounded-xl">
                        <Icon name={l.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] text-smoke">{l.label}</span>
                        <span className="block truncate text-[13.5px] font-semibold text-parchment">{l.value}</span>
                      </span>
                    </a>
                  ))}
                  <Link to="/book" className="group flex items-center gap-3 rounded-2xl border border-gold-300/10 p-3.5 transition hover:border-gold-300/40 hover:bg-gold-300/[0.04]">
                    <span className="icon-tile h-10 w-10 rounded-xl">
                      <Icon name="calendar" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] text-smoke">Video call</span>
                      <span className="block truncate text-[13.5px] font-semibold text-parchment">Book a free 30-min slot →</span>
                    </span>
                  </Link>
                </div>
                <div className="mt-5 space-y-1.5 border-t border-gold-300/10 pt-5 text-[12.5px] text-mist">
                  <p>{settings.location}</p>
                  <p className="text-smoke">{settings.hours}</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="lux-card p-6">
                <p className="label">What happens next</p>
                <ol className="mt-5 space-y-4">
                  {["We review your brief the same day", "Reply within 12 business hours", "A discovery call to lock scope", "A written proposal with a fixed quote"].map((step, i) => (
                    <li key={step} className="flex gap-3 text-[13.5px] text-sand">
                      <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px]", i === 0 ? "border-gold-300/60 text-gold-200" : "border-gold-300/20 text-smoke")}>
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            <Reveal delay={220}>
              <div className="lux-card p-6">
                <p className="label">Working with us</p>
                <ul className="mt-5 space-y-3">
                  {collections.guarantees.slice(0, 4).map((g) => (
                    <li key={g.id} className="flex items-start gap-2.5 text-[13px] text-sand">
                      <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300" strokeWidth={2.4} />
                      {g.title}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  );
}
