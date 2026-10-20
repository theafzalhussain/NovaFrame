/** "10:30 AM" → { h: 10, m: 30 } (24h) */
export function parseSlot(slot: string) {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { h: 0, m: 0 };
  let h = Number(match[1]) % 12;
  if (match[3]?.toUpperCase() === "PM") h += 12;
  if (!match[3]) h = Number(match[1]);
  return { h, m: Number(match[2]) };
}

/** Wall-clock time in an IANA timezone → the real instant (UTC). */
export function zonedToUtc(date: string, slot: string, timeZone: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const { h, m } = parseSlot(slot);
  const guess = Date.UTC(y, mo - 1, d, h, m);
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .formatToParts(new Date(guess))
        .map((p) => [p.type, p.value]),
    );
    const asTz = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
    return new Date(guess - (asTz - guess));
  } catch {
    return new Date(guess);
  }
}

const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl(opts: { title: string; start: Date; minutes: number; details: string }) {
  const end = new Date(opts.start.getTime() + opts.minutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${icsStamp(opts.start)}/${icsStamp(end)}`,
    details: opts.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(opts: { title: string; start: Date; minutes: number; details: string; uid: string }) {
  const end = new Date(opts.start.getTime() + opts.minutes * 60_000);
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Novaframe Studio//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@novaframe`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(opts.start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${escape(opts.title)}`,
    `DESCRIPTION:${escape(opts.details)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "novaframe-discovery-call.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
