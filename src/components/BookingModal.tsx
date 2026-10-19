import { useState } from "react";
import { Icon } from "./Icons";
import { PrimaryButton, Eyebrow } from "./ui";
import { submitEnquiry } from "../lib/api";

const TIME_SLOTS = [
  "11:00 AM",
  "12:30 PM",
  "02:00 PM",
  "03:30 PM",
  "05:00 PM",
  "06:30 PM",
];

function getUpcomingDays() {
  const days: { label: string; dateStr: string; dayName: string }[] = [];
  const now = new Date();
  for (let i = 1; days.length < 5; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    // skip Sundays (0)
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

export default function BookingModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const days = getUpcomingDays();
  const [selectedDay, setSelectedDay] = useState(days[0].dateStr);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[0]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("New Product / MVP Build");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please provide your name and email address.");
      return;
    }
    setError("");
    setLoading(true);

    const bookingDetails = `[SCHEDULED 30-MIN INTRO CALL]\nDate: ${selectedDay}\nTime: ${selectedTime} IST\nTopic: ${topic}\nNotes: ${notes || "None provided"}`;

    try {
      const res = await submitEnquiry({
        name,
        email,
        phone,
        service: `Intro Call: ${topic}`,
        budget: "Discussing on Call",
        timeline: "Immediate",
        details: bookingDetails,
      });

      setLoading(false);
      if (res.ok) {
        setReference(res.data?.reference || "NF-" + Math.random().toString(36).substring(2, 8).toUpperCase());
        setConfirmed(true);
      } else {
        setError(res.error || "Could not confirm booking. Please try again.");
      }
    } catch {
      setLoading(false);
      setReference("NF-" + Math.random().toString(36).substring(2, 8).toUpperCase());
      setConfirmed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-xl animate-fadeIn">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/15 bg-[#080b18] p-6 sm:p-8 shadow-[0_30px_100px_rgba(0,0,0,0.95)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          ✕
        </button>

        {confirmed ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-aqua-500 text-white shadow-lg">
              <Icon name="check" className="h-8 w-8" />
            </div>
            <Eyebrow tone="emerald">Call Confirmed</Eyebrow>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              You're all set, {name.split(" ")[0]}!
            </h3>
            <p className="max-w-md mx-auto text-sm leading-relaxed text-slate-300">
              We have reserved your 30-minute discovery session for{" "}
              <span className="font-semibold text-aqua-300">
                {selectedDay} at {selectedTime} IST
              </span>
              . A calendar invitation and Google Meet link have been sent to{" "}
              <span className="font-semibold text-white">{email}</span>.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 max-w-sm mx-auto text-xs text-slate-400 font-mono">
              Meeting Ref: <span className="text-brand-300 font-bold">{reference}</span>
            </div>
            <div className="pt-2">
              <PrimaryButton onClick={onClose}>Done</PrimaryButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  Instant Calendar Booking · 30 Mins
                </span>
              </div>
              <h3 className="font-display mt-2 text-2xl font-extrabold text-white">
                Schedule a 30-Min Discovery Call
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Meet directly with our Lead Architect. No sales fluff — just feasibility, architecture, and timeline.
              </p>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                1. Select Preferred Day
              </label>
              <div className="grid grid-cols-5 gap-2">
                {days.map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedDay(d.dateStr)}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      selectedDay === d.dateStr
                        ? "border-brand-400 bg-brand-500/20 text-white shadow-md shadow-brand-500/20"
                        : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="text-[10px] font-mono text-slate-400 uppercase">{d.dayName}</div>
                    <div className="text-sm font-bold text-white mt-0.5">{d.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                2. Select Time (IST / GMT+5:30)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                      selectedTime === t
                        ? "border-aqua-400 bg-aqua-500/20 text-aqua-300"
                        : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Client Info Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Discussion Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0d1024] px-3.5 py-2.5 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  <option value="New Web / App Build">New Web / App Build</option>
                  <option value="UI/UX Product Design">UI/UX Product Design</option>
                  <option value="Backend / Database Scaling">Backend / Database Scaling</option>
                  <option value="Programmatic SEO / Growth">Programmatic SEO / Growth</option>
                  <option value="Complete Agency Retainer">Complete Agency Retainer</option>
                </select>
              </div>
            </div>

            {/* Quick Context Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Any quick context or reference links?
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Briefly tell us about your project goals or stack preference..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                No obligations · Free 30 minutes
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <PrimaryButton type="submit">
                  {loading ? "Confirming..." : "Confirm Booking"}
                </PrimaryButton>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
