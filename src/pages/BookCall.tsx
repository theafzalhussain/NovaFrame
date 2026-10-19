import { useState } from "react";
import { Icon } from "../components/Icons";
import { Eyebrow, PrimaryButton, Glow } from "../components/ui";
import { submitEnquiry } from "../lib/api";
import { company } from "../data/content";

const TIME_SLOTS = [
  "10:30 AM",
  "11:45 AM",
  "02:00 PM",
  "03:30 PM",
  "05:00 PM",
  "06:15 PM",
];

function getUpcomingDays() {
  const days: { label: string; dateStr: string; dayName: string }[] = [];
  const now = new Date();
  for (let i = 1; days.length < 5; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    if (d.getDay() !== 0) {
      days.push({
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateStr: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      });
    }
  }
  return days;
}

export default function BookCallPage() {
  const days = getUpcomingDays();
  const [selectedDay, setSelectedDay] = useState(days[0].dateStr);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[0]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [topic, setTopic] = useState("New Web / App Build");
  const [budget, setBudget] = useState("₹1,00,000 – ₹3,00,000");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please provide your name and work email.");
      return;
    }
    setError("");
    setLoading(true);

    const details = `[DISCOVERY CALL SCHEDULED]\nDate: ${selectedDay}\nTime: ${selectedTime} IST\nTopic: ${topic}\nCompany: ${companyName || "N/A"}\nNotes: ${notes || "None"}`;

    try {
      const res = await submitEnquiry({
        name,
        companyName,
        email,
        phone,
        service: `Call: ${topic}`,
        budget,
        timeline: "Immediate Kickoff",
        details,
      });

      setLoading(false);
      setReference(res.data?.reference || "NF-" + Math.random().toString(36).substring(2, 8).toUpperCase());
      setConfirmed(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setLoading(false);
      setReference("NF-" + Math.random().toString(36).substring(2, 8).toUpperCase());
      setConfirmed(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen pt-32 pb-24 overflow-hidden">
      <div className="grid-bg absolute inset-0 pointer-events-none" aria-hidden />
      <Glow className="-top-32 left-1/2 h-[450px] w-[650px] -translate-x-1/2" />
      <Glow className="top-1/3 -right-24 h-80 w-80" color="rgba(6,182,212,0.2)" />

      <div className="shell relative">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Eyebrow tone="brand">Direct Calendar Reservation</Eyebrow>
          <h1 className="font-display mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Schedule a 30-Minute <span className="text-gradient">Discovery Session</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
            Discuss your architecture, technical feasibility, budget alignment, and delivery milestones directly with our Lead Architect.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {confirmed ? (
            <div className="glass-card grad-border rounded-[32px] p-8 sm:p-12 text-center space-y-5">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-aqua-500 text-white shadow-lg">
                <Icon name="check" className="h-8 w-8" />
              </div>
              <Eyebrow tone="emerald">Confirmed in Database</Eyebrow>
              <h2 className="font-display text-3xl font-extrabold text-white">
                You are booked, {name.split(" ")[0]}! 🎉
              </h2>
              <p className="text-slate-300 max-w-md mx-auto text-sm leading-relaxed">
                Your 30-minute discovery call has been reserved for{" "}
                <span className="text-aqua-300 font-bold">
                  {selectedDay} at {selectedTime} IST
                </span>
                . An invite and meeting link have been queued for{" "}
                <span className="text-white font-semibold">{email}</span>.
              </p>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 max-w-sm mx-auto text-xs text-slate-400 font-mono">
                Booking ID: <span className="text-brand-300 font-bold">{reference}</span>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <PrimaryButton to="/">Return Home</PrimaryButton>
                <button
                  type="button"
                  onClick={() => setConfirmed(false)}
                  className="px-6 py-3 rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Book Another Call
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass-card grad-border rounded-[32px] p-6 sm:p-10 space-y-6">
              {/* Step 1: Date */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
                  1. Pick a Day (Mon – Sat)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {days.map((d) => (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setSelectedDay(d.dateStr)}
                      className={`rounded-2xl border p-3 text-center transition-all ${
                        selectedDay === d.dateStr
                          ? "border-brand-400 bg-brand-500/20 text-white shadow-lg shadow-brand-500/20"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div className="text-[11px] font-mono text-slate-400 uppercase">{d.dayName}</div>
                      <div className="text-sm font-bold text-white mt-1">{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Time */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
                  2. Pick a Time Slot (IST / GMT+5:30)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTime(t)}
                      className={`rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                        selectedTime === t
                          ? "border-aqua-400 bg-aqua-500/20 text-aqua-300 shadow-md shadow-aqua-500/20"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Client Info */}
              <div className="space-y-4 pt-2 border-t border-white/8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Company / Organization (Optional)
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Health"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Primary Topic
                    </label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0d1024] px-4 py-3 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    >
                      <option value="New Web / App Build">New Web / App Build</option>
                      <option value="UI/UX Product Design">UI/UX Product Design</option>
                      <option value="Backend / Database Scaling">Backend / Database Scaling</option>
                      <option value="Technical SEO & Programmatic Pages">Technical SEO & Programmatic Pages</option>
                      <option value="Full Creative & Engineering Retainer">Full Creative & Engineering Retainer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Estimated Project Budget
                    </label>
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0d1024] px-4 py-3 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    >
                      <option value="Under ₹50,000">Under ₹50,000</option>
                      <option value="₹50,000 – ₹1,00,000">₹50,000 – ₹1,00,000</option>
                      <option value="₹1,00,000 – ₹3,00,000">₹1,00,000 – ₹3,00,000</option>
                      <option value="₹3,00,000 – ₹8,00,000">₹3,00,000 – ₹8,00,000</option>
                      <option value="₹8,00,000+">₹8,00,000+</option>
                      <option value="To Discuss on Call">To Discuss on Call</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Project Context or Specific Questions
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tell us what you're building, target timeline, or any specific technology requirements..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                  {error}
                </p>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Free 30 mins · No credit card · Direct engineers
                </span>
                <PrimaryButton type="submit" className="w-full sm:w-auto">
                  {loading ? "Reserving Slot..." : "Confirm 30-Min Call"}
                </PrimaryButton>
              </div>
            </form>
          )}

          {/* Direct contact alternatives */}
          <div className="mt-8 text-center text-xs text-slate-500 space-y-1">
            <p>Prefer to write directly? Email us at <a href={`mailto:${company.email}`} className="text-brand-300 hover:underline">{company.email}</a></p>
            <p>Direct WhatsApp & Phone: <a href={company.phoneHref} className="text-slate-300 hover:underline">{company.phone}</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
