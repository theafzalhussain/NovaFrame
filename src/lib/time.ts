import { buildIcs } from "./calendar";

// Pure helpers live in calendar.ts so the Node server can share them.
export { googleCalendarUrl, parseSlot, zonedToUtc } from "./calendar";

export function downloadIcs(opts: { title: string; start: Date; minutes: number; details: string; uid: string }) {
  const body = buildIcs(opts);
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "novaframe-discovery-call.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
