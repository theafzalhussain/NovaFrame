import { useCallback, useEffect, useMemo, useState } from "react";
import { admin, type Booking } from "../../lib/api";
import { localDateKey, prettyDate, timeAgo } from "../../lib/site";
import { Icon } from "../Icons";
import { Badge, Drawer, EmptyState, LoadingBlock, PageHeader, Segmented, downloadFile, toCsv, useConfirm, useToast } from "./AdminUI";

export default function Bookings({ openLead }: { openLead: (id: number) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<Booking[] | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [editing, setEditing] = useState<Booking | null>(null);
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const res = await admin.bookings();
    if (res.ok) setList(res.data ?? []);
    else {
      setList([]);
      toast(res.error ?? "Couldn't load bookings.", "error");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = localDateKey(new Date());
  const groups = useMemo(() => {
    const items = (list ?? []).filter((b) =>
      tab === "cancelled" ? ["cancelled", "no_show"].includes(b.status) : tab === "upcoming" ? b.date >= today && ["scheduled", "confirmed"].includes(b.status) : !["cancelled", "no_show"].includes(b.status) && (b.date < today || b.status === "completed"),
    );
    items.sort((a, b) => (tab === "upcoming" ? (a.date + a.time).localeCompare(b.date + b.time) : (b.date + b.time).localeCompare(a.date + a.time)));
    const map = new Map<string, Booking[]>();
    for (const b of items) map.set(b.date, [...(map.get(b.date) ?? []), b]);
    return [...map.entries()];
  }, [list, tab, today]);

  const update = async (b: Booking, patch: Parameters<typeof admin.updateBooking>[1], message: string) => {
    const res = await admin.updateBooking(b.id, patch);
    if (res.ok) {
      toast(message);
      void load();
      if (editing?.id === b.id && res.data) setEditing(res.data);
    } else toast(res.error ?? "Update failed.", "error");
  };

  const remove = async (b: Booking) => {
    const ok = await confirm({ title: "Delete this booking?", body: `${b.name}'s call on ${prettyDate(b.date)} at ${b.time} will be removed. The linked lead stays in your pipeline.`, confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    const res = await admin.deleteBooking(b.id);
    if (res.ok) {
      toast("Booking deleted.");
      setEditing(null);
      void load();
    } else toast(res.error ?? "Delete failed.", "error");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Call bookings"
        description="Discovery calls booked from the website. Each booking is also a lead in your pipeline."
        actions={
          <>
            <Segmented value={tab} onChange={setTab} options={[{ value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past" }, { value: "cancelled", label: "Cancelled" }]} />
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={!list?.length}
              onClick={() => downloadFile("novaframe-bookings.csv", toCsv((list ?? []).map((b) => ({ reference: b.reference, date: b.date, time: b.time, name: b.name, email: b.email, phone: b.phone ?? "", topic: b.topic, status: b.status }))), "text/csv")}
            >
              <Icon name="download" className="h-4 w-4" /> Export
            </button>
          </>
        }
      />

      {list === null ? (
        <div className="lux-card">
          <LoadingBlock />
        </div>
      ) : groups.length === 0 ? (
        <div className="lux-card">
          <EmptyState icon="calendar" title={tab === "upcoming" ? "No upcoming calls" : "Nothing here yet"} body="When visitors book a slot on the Book a Call page, it shows up here." />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, items]) => (
            <section key={date}>
              <p className="label mb-3">
                {prettyDate(date, { weekday: "long", day: "numeric", month: "long" })}
                {date === today ? <span className="ml-2 text-gold-300">· today</span> : null}
              </p>
              <div className="lux-card divide-y divide-gold-300/[0.07] overflow-hidden">
                {items.map((b) => (
                  <div key={b.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span className="w-20 shrink-0 font-mono text-[13px] font-semibold text-gold-100">{b.time}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-semibold text-ivory">
                          {b.name} {b.companyName ? <span className="font-normal text-mist">· {b.companyName}</span> : null}
                        </p>
                        <p className="truncate text-[12.5px] text-smoke">
                          {b.topic} · {b.email} · booked {timeAgo(b.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge value={b.status} />
                      {b.status === "scheduled" ? (
                        <button type="button" className="btn btn-gold btn-sm" onClick={() => update(b, { status: "confirmed" }, "Call confirmed.")}>
                          Confirm
                        </button>
                      ) : null}
                      {["scheduled", "confirmed"].includes(b.status) && b.date <= today ? (
                        <button type="button" className="btn btn-line btn-sm" onClick={() => update(b, { status: "completed" }, "Marked as completed.")}>
                          Completed
                        </button>
                      ) : null}
                      {b.meetingLink ? (
                        <a href={b.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-line btn-sm">
                          <Icon name="external" className="h-4 w-4" /> Join
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditing(b);
                          setLink(b.meetingLink ?? "");
                          setNotes(b.internalNotes ?? "");
                        }}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing ? (
        <Drawer
          title={editing.name}
          subtitle={`${prettyDate(editing.date, { weekday: "short", day: "numeric", month: "short" })} · ${editing.time} · ${editing.reference}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="button" className="btn btn-danger btn-sm mr-auto" onClick={() => remove(editing)}>
                <Icon name="trash" className="h-4 w-4" /> Delete
              </button>
              {editing.enquiryId ? (
                <button type="button" className="btn btn-line btn-sm" onClick={() => openLead(editing.enquiryId!)}>
                  Open lead
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                Close
              </button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="flex flex-wrap gap-1.5">
              {(["scheduled", "confirmed", "completed", "no_show", "cancelled"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => s !== editing.status && update(editing, { status: s }, `Status: ${s.replace("_", " ")}.`)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold capitalize transition ${s === editing.status ? "border-gold-300/60 bg-gold-400/20 text-gold-100" : "border-gold-300/10 text-mist hover:text-ivory"}`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
            <dl className="grid gap-px overflow-hidden rounded-2xl border border-gold-300/10 bg-gold-300/10 sm:grid-cols-2">
              {[
                ["Email", editing.email],
                ["Phone", editing.phone || "—"],
                ["Topic", editing.topic],
                ["Budget", editing.budget || "To discuss"],
              ].map(([k, v]) => (
                <div key={k} className="bg-ink-900 px-4 py-3">
                  <dt className="label text-[9.5px]">{k}</dt>
                  <dd className="mt-1 text-[13.5px] break-words text-parchment">{v}</dd>
                </div>
              ))}
            </dl>
            {editing.notes ? (
              <div>
                <p className="label mb-2">Visitor notes</p>
                <p className="rounded-2xl border border-gold-300/10 bg-ink-950/60 p-4 text-[14px] whitespace-pre-wrap text-sand">{editing.notes}</p>
              </div>
            ) : null}
            <div>
              <p className="label mb-2">Meeting link</p>
              <div className="flex gap-2">
                <input className="field field-sm" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/…" />
                <button type="button" className="btn btn-line btn-sm" onClick={() => update(editing, { meetingLink: link }, "Meeting link saved.")}>
                  Save
                </button>
              </div>
              <p className="mt-2 text-[12px] text-smoke">
                Tip: send it with{" "}
                <a className="text-gold-200 underline-offset-4 hover:underline" href={`mailto:${editing.email}?subject=${encodeURIComponent("Your discovery call")}&body=${encodeURIComponent(`Hi ${editing.name.split(" ")[0]},\n\nLooking forward to our call on ${prettyDate(editing.date)} at ${editing.time}.\n\nJoin here: ${link || "(link)"}\n`)}`}>
                  a one-click email
                </a>
                .
              </p>
            </div>
            <div>
              <p className="label mb-2">Internal notes</p>
              <textarea rows={4} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prep notes, outcome, next steps…" />
              <div className="mt-2 flex justify-end">
                <button type="button" className="btn btn-line btn-sm" onClick={() => update(editing, { internalNotes: notes }, "Notes saved.")}>
                  Save notes
                </button>
              </div>
            </div>
          </div>
        </Drawer>
      ) : null}
    </div>
  );
}
