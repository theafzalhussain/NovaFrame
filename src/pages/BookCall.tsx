import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandMark } from "../components/Brand";
import { Icon } from "../components/Icons";
import { StudioStatusPill } from "../components/StudioStatus";
import { Eyebrow, Reveal } from "../components/ui";
import { api, track } from "../lib/api";
import { confirmationPath, saveConfirmation } from "../lib/confirmation";
import { useContent } from "../lib/content";
import { useRouter } from "../lib/router";
import { upcomingWorkdays } from "../lib/site";
import { zonedToUtc } from "../lib/time";
import { cn } from "../utils/cn";

export default function BookCallPage() {
  const { settings, advanced, collections } = useContent();
  const { navigate } = useRouter();
  const founder = collections.team[0];
  const days = useMemo(() => upcomingWorkdays(settings, Math.min(Math.max(settings.booking.daysAhead, 3), 12)), [settings]);
  const slots = settings.booking.slots;
  const minutes = settings.booking.durationMinutes;

  const [day, setDay] = useState(days[0]?.key ?? "");
  const [time, setTime] = useState("");
  const [taken, setTaken] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", companyName: "", topic: advanced.bookingTopics[0] ?? "", budget: "", notes: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Compare real offsets, not names ("Asia/Calcutta" and "Asia/Kolkata" are the same zone).
  const sameTz = useMemo(() => {
    if (visitorTz === settings.timezone) return true;
    try {
      const now = new Date();
      const fmt = (timeZone: string) => now.toLocaleString("en-US", { timeZone, hour12: false });
      return fmt(visitorTz) === fmt(settings.timezone);
    } catch {
      return true;
    }
  }, [visitorTz, settings.timezone]);

  const loadAvailability = useCallback(async () => {
    if (!days.length) return;
    const res = await api.availability(days[0].key, days[days.length - 1].key);
    if (res.ok && res.data) setTaken(res.data.taken ?? {});
  }, [days]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const takenToday = taken[day] ?? [];
  useEffect(() => {
    if (time && takenToday.includes(time)) setTime("");
  }, [takenToday, time]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const localLabel = (d: string, t: string) => {
    if (sameTz || !d || !t) return "";
    const instant = zonedToUtc(d, t, settings.timezone);
    return instant.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!day) next.date = "Pick a day.";
    if (!time) next.time = "Pick a time.";
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = "Please enter a valid email.";
    setErrors(next);
    if (Object.keys(next).length || busy) return;
    setBusy(true);
    const res = await api.book({ ...form, date: day, time });
    setBusy(false);
    if (!res.ok) {
      if (res.status === 409) {
        setErrors({ time: res.error ?? "That slot was just taken." });
        setTime("");
        void loadAvailability();
      } else {
        setErrors(res.errors ?? { form: res.error ?? "Couldn't reserve the slot. Please try WhatsApp." });
      }
      return;
    }
    track("call_booked", { topic: form.topic });
    const confirmation = {
      kind: "booking" as const,
      reference: res.data?.reference ?? "",
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      companyName: form.companyName.trim(),
      topic: form.topic,
      budget: form.budget,
      notes: form.notes.trim(),
      date: day,
      time,
      offline: Boolean(res.offline),
      mail: Boolean(res.data?.mail),
      createdAt: new Date().toISOString(),
    };
    saveConfirmation(confirmation);
    navigate(confirmationPath(confirmation), { replace: true });
  };

  return (
    <section className="relative overflow-hidden pt-40 pb-28 md:pt-48">
      <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
      <div className="shell relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div>
          <Reveal>
            <Eyebrow>Free strategy call</Eyebrow>
            <h1 className="display mt-7 text-[2.7rem] leading-[1.02] sm:text-6xl">
              {minutes} minutes that <span className="serif-accent text-gold">save you months.</span>
            </h1>
            <p className="mt-6 text-[16.5px] leading-relaxed text-sand">
              Talk scope, stack, budget and timeline directly with the founder. You'll leave with honest answers — whether or not we end up working together.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <ul className="mt-9 space-y-4">
              {[
                ["target", "Clarify the goal", "What success looks like, for whom, by when."],
                ["layers", "Map the right scope", "What to build first — and what to leave out."],
                ["rupee", "Budget & timeline", "A realistic range before any proposal."],
                ["shield", "No obligation", "No sales script, no pressure, NDA on request."],
              ].map(([icon, t, d]) => (
                <li key={t} className="flex gap-4">
                  <span className="icon-tile h-10 w-10 rounded-xl">
                    <Icon name={icon} className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-ivory">{t}</span>
                    <span className="block text-[13.5px] text-mist">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
          {founder ? (
            <Reveal delay={160}>
              <div className="lux-card mt-10 flex items-center gap-4 p-5">
                {founder.photo ? <img src={founder.photo} alt="" className="h-14 w-14 rounded-full border border-gold-300/30 object-cover object-top" /> : <BrandMark size={56} />}
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ivory">You'll speak with {founder.name}</p>
                  <p className="text-[12.5px] text-mist">{founder.role}</p>
                </div>
              </div>
              <StudioStatusPill className="mt-4" />
            </Reveal>
          ) : null}
        </div>

        <Reveal delay={120}>
          <form onSubmit={submit} noValidate className="lux-card gold-edge p-6 md:p-10">
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>

            <p className="label">
              <span className="text-gold-400">01</span> · Choose a day
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {days.map((d) => {
                const full = (taken[d.key] ?? []).length >= slots.length;
                return (
                  <button
                    key={d.key}
                    type="button"
                    aria-pressed={day === d.key}
                    disabled={full}
                    onClick={() => setDay(d.key)}
                    className="choice flex-col gap-0.5 px-2 py-3 text-center"
                  >
                    <span className="font-mono text-[10px] tracking-[0.14em] text-smoke uppercase">{d.day}</span>
                    <span className="display text-[1.35rem] leading-none text-ivory">{d.date}</span>
                    <span className="text-[11px] text-mist">{d.month}</span>
                  </button>
                );
              })}
            </div>
            {errors.date ? <p className="mt-2 text-[12px] text-ember">{errors.date}</p> : null}

            <p className="label mt-8">
              <span className="text-gold-400">02</span> · Choose a time <span className="normal-case tracking-normal text-smoke">({settings.timezoneLabel})</span>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((t) => {
                const isTaken = takenToday.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={time === t}
                    disabled={isTaken}
                    onClick={() => {
                      setTime(t);
                      setErrors((e) => ({ ...e, time: "" }));
                    }}
                    className="choice flex-col items-center justify-center gap-0.5 py-3"
                    title={isTaken ? "Already booked" : undefined}
                  >
                    <span className="text-[14px] font-semibold">{t}</span>
                    {!sameTz ? <span className="text-[10.5px] text-smoke">{localLabel(day, t) || " "}</span> : null}
                  </button>
                );
              })}
            </div>
            {errors.time ? <p className="mt-2 text-[12px] text-ember">{errors.time}</p> : null}
            {!sameTz ? <p className="mt-2 text-[11.5px] text-smoke">Times below each slot are shown in your timezone ({visitorTz}).</p> : null}

            <p className="label mt-8">
              <span className="text-gold-400">03</span> · Your details
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="b-name" className="field-label">
                  Full name <span className="text-gold-400">*</span>
                </label>
                <input id="b-name" className="field mt-2" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={Boolean(errors.name)} />
                {errors.name ? <p className="mt-1.5 text-[12px] text-ember">{errors.name}</p> : null}
              </div>
              <div>
                <label htmlFor="b-email" className="field-label">
                  Email <span className="text-gold-400">*</span>
                </label>
                <input id="b-email" type="email" className="field mt-2" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={Boolean(errors.email)} />
                {errors.email ? <p className="mt-1.5 text-[12px] text-ember">{errors.email}</p> : null}
              </div>
              <div>
                <label htmlFor="b-phone" className="field-label">
                  Phone / WhatsApp
                </label>
                <input id="b-phone" type="tel" className="field mt-2" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <label htmlFor="b-company" className="field-label">
                  Company
                </label>
                <input id="b-company" className="field mt-2" autoComplete="organization" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
              </div>
              <div>
                <label htmlFor="b-topic" className="field-label">
                  Topic
                </label>
                <select id="b-topic" className="field mt-2" value={form.topic} onChange={(e) => set("topic", e.target.value)}>
                  {advanced.bookingTopics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="b-budget" className="field-label">
                  Budget
                </label>
                <select id="b-budget" className="field mt-2" value={form.budget} onChange={(e) => set("budget", e.target.value)}>
                  <option value="">To discuss on the call</option>
                  {advanced.budgetRanges.map((b) => (
                    <option key={b.label}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="b-notes" className="field-label">
                  Anything we should read first?
                </label>
                <textarea id="b-notes" rows={3} className="field mt-2" placeholder="Links, goals, deadlines…" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>

            {errors.form ? <p className="mt-5 rounded-xl border border-ember/40 bg-ember/10 p-3 text-[13px] text-parchment">{errors.form}</p> : null}

            <div className="mt-8 flex flex-col gap-4 border-t border-gold-300/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
              <p className={cn("text-[12.5px]", time ? "text-parchment" : "text-smoke")}>
                {time && day ? (
                  <>
                    <Icon name="calendar" className="mr-1.5 inline h-3.5 w-3.5 text-gold-300" />
                    {days.find((d) => d.key === day)?.day}, {days.find((d) => d.key === day)?.month} {days.find((d) => d.key === day)?.date} · {time} {settings.timezoneLabel}
                  </>
                ) : (
                  "Free · no obligation · NDA on request"
                )}
              </p>
              <button type="submit" disabled={busy} className="btn btn-gold btn-lg shine">
                {busy ? "Reserving…" : `Confirm ${minutes}-min call`}
              </button>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
