import { useState } from "react";
import { Link } from "../lib/router";
import { Icon } from "../components/Icons";
import { Eyebrow, Glow, PageHero, PrimaryButton, Reveal, SectionHeading } from "../components/ui";
import { company, credentials, faqs, services } from "../data/content";
import { submitEnquiry, trackEvent } from "../lib/api";
import { cn } from "../utils/cn";

const budgetOptions = [
  "Select a range",
  "Under ₹50,000",
  "₹50,000 – ₹1,00,000",
  "₹1,00,000 – ₹3,00,000",
  "₹3,00,000 – ₹8,00,000",
  "₹8,00,000+",
  "Not sure yet — need guidance",
];

const timelineOptions = ["ASAP (within 2 weeks)", "In 1 month", "In 2–3 months", "Just exploring"];

type FormState = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  service: string;
  budget: string;
  timeline: string;
  details: string;
};

const emptyForm: FormState = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  service: "",
  budget: "",
  timeline: timelineOptions[1],
  details: "",
};

function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold tracking-wide text-slate-300">
          {label} {required ? <span className="text-brand-400">*</span> : null}
        </span>
        {hint ? <span className="text-[10.5px] text-slate-500">{hint}</span> : null}
      </span>
      <div className="mt-2">{children}</div>
      {error ? <span className="mt-1.5 block text-[11.5px] text-rose-300">{error}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder:text-slate-500 transition focus:border-brand-400/70 focus:bg-white/[0.06] focus:outline-none";

export default function Contact() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [offlineNote, setOfflineNote] = useState(false);
  const [reference, setReference] = useState("");

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) next.name = "Please enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = "Please enter a valid email";
    if (!form.service) next.service = "Select a service";
    if (!form.budget || form.budget === budgetOptions[0]) next.budget = "Select a budget range";
    if (form.details.trim().length < 20) next.details = "A little more detail helps (minimum 20 characters)";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || pending) return;
    setPending(true);
    const res = await submitEnquiry({
      name: form.name,
      companyName: form.companyName,
      email: form.email,
      phone: form.phone,
      service: form.service,
      budget: form.budget,
      timeline: form.timeline,
      details: form.details,
    });
    setPending(false);
    if (!res.ok) {
      setErrors({ details: res.error ?? "Something went wrong. Please email us directly." });
      return;
    }
    setReference(res.data?.reference ?? "");
    setOfflineNote(Boolean(res.demo));
    setSent(true);
    trackEvent("enquiry_submitted", { service: form.service, budget: form.budget });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const mailto = `mailto:${company.email}?subject=${encodeURIComponent(
    `Project enquiry — ${form.service || "New project"} (${form.budget || "budget TBD"})`,
  )}&body=${encodeURIComponent(
    `Name: ${form.name}\nCompany: ${form.companyName}\nEmail: ${form.email}\nPhone: ${form.phone}\nService: ${form.service}\nBudget: ${form.budget}\nTimeline: ${form.timeline}\n\nDetails:\n${form.details}`,
  )}`;

  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title="Tell us what you're building —"
        highlight="no obligation attached."
        description="Share a short brief and we will respond with scope, timeline and a fixed quote in a written proposal. We only ask for a budget range so we can recommend something genuinely feasible for you."
      >
        <PrimaryButton to="/book">Book a 30-min call</PrimaryButton>
      </PageHero>

      <section className="py-14 md:py-20">
        <div className="shell grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          {/* form */}
          <Reveal>
            <div className="glass grad-border relative overflow-hidden rounded-[28px] p-6 md:p-9">
              <Glow className="-top-24 -right-16 h-64 w-64" color="rgba(79,70,229,0.2)" />

              {sent ? (
                <div className="relative py-8 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-aqua-500 text-white">
                    <Icon name="check" className="h-7 w-7" />
                  </div>
                  {offlineNote ? (
                    <p className="mx-auto mb-5 inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-[11.5px] text-amber-200">
                      Demo mode — the Express/PHP API is not reachable, so this brief was stored locally.
                    </p>
                  ) : null}
                  <h2 className="font-display mt-6 text-2xl font-extrabold text-white">
                    Brief received — thank you, {form.name.split(" ")[0]}.
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                    We will reply {company.responseTime.toLowerCase()}. If this is urgent, book a call
                    directly and we can scope it the same day.
                  </p>
                  <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
                    <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">
                      your summary
                    </p>
                    {reference ? (
                      <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-brand-300 uppercase">
                        Reference · {reference}
                      </p>
                    ) : null}
                    <ul className="mt-3 space-y-1.5 text-[13px] text-slate-300">
                      <li>
                        Service: <span className="text-white">{form.service}</span>
                      </li>
                      <li>
                        Budget: <span className="text-white">{form.budget}</span>
                      </li>
                      <li>
                        Timeline: <span className="text-white">{form.timeline}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <PrimaryButton href={company.booking}>Book a call now</PrimaryButton>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(emptyForm);
                        setSent(false);
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 font-display text-sm font-semibold text-slate-100 transition hover:border-brand-400/60 hover:bg-white/10"
                    >
                      Send another brief
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Eyebrow>Project enquiry</Eyebrow>
                      <h2 className="font-display mt-4 text-xl font-extrabold tracking-tight text-white md:text-2xl">
                        Tell us about the project
                      </h2>
                    </div>
                    <span className="hidden font-mono text-[10px] tracking-[0.18em] text-slate-500 uppercase sm:block">
                      takes ~2 minutes
                    </span>
                  </div>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <Field label="Full name" required error={errors.name}>
                      <input
                        className={inputClass}
                        placeholder="Aarav Mehta"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                      />
                    </Field>
                    <Field label="Company name" hint="optional">
                      <input
                        className={inputClass}
                        placeholder="Kaarva Lifestyle"
                        value={form.companyName}
                        onChange={(e) => set("companyName", e.target.value)}
                      />
                    </Field>
                    <Field label="Work email" required error={errors.email}>
                      <input
                        className={inputClass}
                        type="email"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                      />
                    </Field>
                    <Field label="Phone / WhatsApp" hint="optional">
                      <input
                        className={inputClass}
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                      />
                    </Field>
                    <Field label="Service required" required error={errors.service}>
                      <select
                        className={cn(inputClass, "appearance-none")}
                        value={form.service}
                        onChange={(e) => set("service", e.target.value)}
                      >
                        <option value="" className="bg-ink-900">
                          Select a service
                        </option>
                        {services.map((s) => (
                          <option key={s.id} value={s.title} className="bg-ink-900">
                            {s.title}
                          </option>
                        ))}
                        <option value="Multiple / Full launch" className="bg-ink-900">
                          Multiple / Full launch
                        </option>
                      </select>
                    </Field>
                    <Field
                      label="Budget range"
                      required
                      hint="helps us scope realistically"
                      error={errors.budget}
                    >
                      <select
                        className={cn(inputClass, "appearance-none")}
                        value={form.budget}
                        onChange={(e) => set("budget", e.target.value)}
                      >
                        {budgetOptions.map((b) => (
                          <option key={b} value={b} className="bg-ink-900">
                            {b}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Expected timeline">
                      <select
                        className={cn(inputClass, "appearance-none")}
                        value={form.timeline}
                        onChange={(e) => set("timeline", e.target.value)}
                      >
                        {timelineOptions.map((t) => (
                          <option key={t} value={t} className="bg-ink-900">
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="hidden sm:block" />
                    <div className="sm:col-span-2">
                      <Field
                        label="Project details"
                        required
                        hint="the problem and the goal"
                        error={errors.details}
                      >
                        <textarea
                          rows={6}
                          className={cn(inputClass, "resize-none")}
                          placeholder="What needs to be built, who it serves, and what success looks like. Reference links are welcome."
                          value={form.details}
                          onChange={(e) => set("details", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-col gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-xs text-[11.5px] leading-relaxed text-slate-500">
                      Your details are used only to discuss this enquiry. No spam, no resale, and an NDA is
                      available on request.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={mailto}
                        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 font-display text-sm font-semibold text-slate-100 transition hover:border-brand-400/60 hover:bg-white/10"
                      >
                        Send via email
                      </a>
                      <PrimaryButton type="submit">
                        {pending ? "Sending…" : "Send enquiry"}
                      </PrimaryButton>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          {/* sidebar */}
          <div className="space-y-4">
            <Reveal delay={100}>
              <div className="glass rounded-[28px] p-6">
                <p className="font-mono text-[10px] tracking-[0.22em] text-slate-500 uppercase">
                  Direct lines
                </p>
                <div className="mt-4 space-y-3">
                  <a
                    href={`mailto:${company.email}`}
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-brand-400/50"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-aqua-500 font-display text-sm font-bold text-white">
                      @
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] text-slate-500">Email</span>
                      <span className="block truncate text-[13.5px] font-semibold text-white">
                        {company.email}
                      </span>
                    </span>
                  </a>
                  <a
                    href={company.phoneHref}
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-brand-400/50"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-300">
                      <Icon name="phone" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] text-slate-500">Call / WhatsApp</span>
                      <span className="block truncate text-[13.5px] font-semibold text-white">
                        {company.phone}
                      </span>
                    </span>
                  </a>
                  <Link
                    to="/book"
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-brand-400/50"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-aqua-400">
                      <Icon name="target" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] text-slate-500">Meeting reservation</span>
                      <span className="block truncate text-[13.5px] font-semibold text-white">
                        Direct 30-Min Schedule →
                      </span>
                    </span>
                  </Link>
                </div>

                <div className="mt-5 border-t border-white/8 pt-5 text-[12.5px] text-slate-400">
                  <p>{company.location}</p>
                  <p className="mt-1 text-slate-500">{company.hours}</p>
                  <p className="mt-3 flex items-center gap-2 text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {company.responseTime}
                  </p>
                </div>

                <div className="mt-5 flex gap-2">
                  {company.socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={s.label}
                      className="grid h-10 flex-1 place-items-center rounded-xl border border-white/10 bg-white/5 font-display text-[11px] font-bold text-slate-300 transition hover:border-brand-400/60 hover:text-white"
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="grad-border rounded-[28px] bg-gradient-to-br from-brand-600/25 to-aqua-500/10 p-6">
                <p className="font-mono text-[10px] tracking-[0.22em] text-brand-200 uppercase">
                  Why we ask for a budget
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-slate-300">
                  A budget range tells us the project scale, the depth of scope and your financial
                  expectations. That lets us propose a solution that is genuinely realistic for you, which
                  saves both sides time.
                </p>
                <p className="mt-3 text-[12px] text-slate-400">
                  If the range is still open, choose "Not sure yet" and we will walk you through options.
                </p>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <div className="glass rounded-[28px] p-6">
                <p className="font-mono text-[10px] tracking-[0.22em] text-slate-500 uppercase">
                  What happens next
                </p>
                <ol className="mt-4 space-y-3">
                  {[
                    "We review your brief internally",
                    "Reply within 12 business hours, with questions if needed",
                    "Discovery call to lock scope and timeline",
                    "Written proposal with a fixed quote",
                  ].map((step, i) => (
                    <li key={step} className="flex gap-3 text-[13px] text-slate-300">
                      <span className="font-display grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-brand-300">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="glass rounded-[28px] p-6">
                <p className="font-mono text-[10px] tracking-[0.22em] text-slate-500 uppercase">
                  Working with us
                </p>
                <ul className="mt-4 space-y-2.5">
                  {credentials.slice(0, 4).map((c) => (
                    <li key={c.title} className="flex items-start gap-2.5 text-[12.5px] text-slate-300">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-aqua-500 text-white">
                        <Icon name="check" className="h-2 w-2" />
                      </span>
                      {c.title}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-white/8 bg-ink-900/40 py-20 md:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Before you write"
              title="Quick answers to"
              highlight="common questions."
            />
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {faqs.slice(0, 3).map((f) => (
                <div key={f.q} className="glass glass-hover h-full rounded-2xl p-6">
                  <h3 className="font-display text-[14.5px] font-bold text-white">{f.q}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{f.a}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
