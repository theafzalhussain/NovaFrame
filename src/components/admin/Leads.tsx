import { useCallback, useEffect, useMemo, useState } from "react";
import { LEAD_PRIORITIES, LEAD_STATUSES } from "../../data/types";
import { admin, type Lead, type LeadActivity } from "../../lib/api";
import { useSettings } from "../../lib/content";
import { formatINR, formatINRCompact, prettyDate, timeAgo } from "../../lib/site";
import { Icon } from "../Icons";
import { cn } from "../../utils/cn";
import { Badge, Drawer, EmptyState, LoadingBlock, PageHeader, SearchInput, Segmented, downloadFile, toCsv, useConfirm, useToast } from "./AdminUI";

type Detail = Lead & { activity: LeadActivity[]; booking: { id: number; reference: string; date: string; time: string; status: string } | null };

const BOARD = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
const PRIORITY_DOT: Record<string, string> = { high: "bg-ember", normal: "bg-gold-400", low: "bg-smoke" };

function LeadDrawer({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: (lead: Lead | null) => void }) {
  const settings = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const [lead, setLead] = useState<Detail | null>(null);
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState("");
  const [value, setValue] = useState("");

  const load = useCallback(async () => {
    const res = await admin.lead(id);
    if (res.ok && res.data) {
      setLead(res.data);
      setSummary(res.data.notes ?? "");
      setValue(res.data.valueEstimate ? String(res.data.valueEstimate) : "");
    } else toast(res.error ?? "Couldn't load the lead.", "error");
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (p: Parameters<typeof admin.updateLead>[1], message: string) => {
    const res = await admin.updateLead(id, p);
    if (res.ok) {
      toast(message);
      onChanged(res.data ?? null);
      void load();
    } else toast(res.error ?? "Update failed.", "error");
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const res = await admin.addLeadNote(id, note.trim());
    if (res.ok) {
      setNote("");
      void load();
    } else toast(res.error ?? "Couldn't add the note.", "error");
  };

  const remove = async () => {
    if (!lead) return;
    const ok = await confirm({ title: "Delete this lead?", body: `${lead.name}'s enquiry and its notes will be permanently removed.`, confirmLabel: "Delete lead", tone: "danger" });
    if (!ok) return;
    const res = await admin.deleteLead(id);
    if (res.ok) {
      toast("Lead deleted.");
      onChanged(null);
      onClose();
    } else toast(res.error ?? "Delete failed.", "error");
  };

  if (!lead) {
    return (
      <Drawer title="Lead" onClose={onClose}>
        <LoadingBlock />
      </Drawer>
    );
  }

  const first = lead.name.split(" ")[0];
  const replySubject = `Re: your ${lead.service} enquiry (${lead.reference})`;
  const replyBody = `Hi ${first},\n\nThank you for reaching out to ${settings.name} about your ${lead.service.toLowerCase()} project. I've read your brief and would love to learn more.\n\nWould you be free for a short call this week? You can pick a slot here: ${window.location.origin}${window.location.pathname}#/book\n\nBest regards,\n${settings.name}`;
  const phoneDigits = (lead.phone ?? "").replace(/\D/g, "");
  const waNumber = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;

  return (
    <Drawer
      title={lead.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{lead.reference}</span>· received {timeAgo(lead.createdAt)} · via {lead.source}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={remove} className="btn btn-danger btn-sm mr-auto">
            <Icon name="trash" className="h-4 w-4" /> Delete
          </button>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Close
          </button>
        </>
      }
    >
      <div className="space-y-7">
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${lead.email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`} className="btn btn-gold btn-sm">
            <Icon name="mail" className="h-4 w-4" /> Reply by email
          </a>
          {waNumber ? (
            <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi ${first}, this is ${settings.short} — thanks for your enquiry about ${lead.service}!`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-line btn-sm">
              <Icon name="whatsapp" className="h-4 w-4" /> WhatsApp
            </a>
          ) : null}
          {lead.phone ? (
            <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="btn btn-line btn-sm">
              <Icon name="call" className="h-4 w-4" /> Call
            </a>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void navigator.clipboard?.writeText(lead.email);
              toast("Email copied.", "info");
            }}
          >
            <Icon name="copy" className="h-4 w-4" /> Copy email
          </button>
        </div>

        <div>
          <p className="label mb-3">Pipeline stage</p>
          <div className="flex flex-wrap gap-1.5">
            {LEAD_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => s !== lead.status && patch({ status: s }, `Moved to ${s}.`)}
                className={cn("rounded-full border px-3 py-1.5 text-[12px] font-semibold capitalize transition", s === lead.status ? "border-gold-300/60 bg-gold-400/20 text-gold-100" : "border-gold-300/10 text-mist hover:text-ivory")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label mb-3">Priority</p>
            <Segmented value={lead.priority as (typeof LEAD_PRIORITIES)[number]} onChange={(p) => patch({ priority: p }, `Priority set to ${p}.`)} options={LEAD_PRIORITIES.map((p) => ({ value: p, label: p }))} />
          </div>
          <div>
            <p className="label mb-3">Deal value (₹)</p>
            <div className="flex gap-2">
              <input className="field field-sm" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 6000" />
              <button type="button" className="btn btn-line btn-sm" onClick={() => patch({ valueEstimate: value ? Number(value) : null }, "Deal value saved.")}>
                Save
              </button>
            </div>
          </div>
        </div>

        <dl className="grid gap-px overflow-hidden rounded-2xl border border-gold-300/10 bg-gold-300/10 sm:grid-cols-2">
          {[
            ["Email", lead.email],
            ["Phone", lead.phone || "—"],
            ["Company", lead.companyName || "—"],
            ["Service", lead.service],
            ["Budget", lead.budget],
            ["Timeline", lead.timeline || "—"],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink-900 px-4 py-3">
              <dt className="label text-[9.5px]">{k}</dt>
              <dd className="mt-1 text-[13.5px] break-words text-parchment">{v}</dd>
            </div>
          ))}
        </dl>

        {lead.booking ? (
          <div className="flex items-center gap-3 rounded-2xl border border-gold-300/25 bg-gold-400/[0.06] px-4 py-3 text-[13px]">
            <Icon name="calendar" className="h-4 w-4 text-gold-300" />
            <span className="text-parchment">
              Discovery call · {prettyDate(lead.booking.date)} at {lead.booking.time} · <Badge value={lead.booking.status} />
            </span>
          </div>
        ) : null}

        <div>
          <p className="label mb-3">Brief</p>
          <p className="rounded-2xl border border-gold-300/10 bg-ink-950/60 p-4 text-[14px] leading-relaxed whitespace-pre-wrap text-sand">{lead.details}</p>
        </div>

        <div>
          <p className="label mb-3">Internal summary</p>
          <textarea rows={3} className="field" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Key facts, objections, next step…" />
          <div className="mt-2 flex justify-end">
            <button type="button" className="btn btn-line btn-sm" onClick={() => patch({ notes: summary }, "Summary saved.")}>
              Save summary
            </button>
          </div>
        </div>

        <div>
          <p className="label mb-3">Activity</p>
          <div className="flex gap-2">
            <input
              className="field field-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()}
              placeholder="Log a call, email or next step…"
            />
            <button type="button" className="btn btn-gold btn-sm" onClick={addNote}>
              Add
            </button>
          </div>
          <ol className="mt-5 space-y-4 border-l border-gold-300/15 pl-5">
            {lead.activity.length === 0 ? <li className="text-[13px] text-smoke">No activity yet.</li> : null}
            {lead.activity.map((a) => (
              <li key={a.id} className="relative">
                <span className={cn("absolute top-1.5 -left-[25px] h-2 w-2 rounded-full", a.kind === "note" ? "bg-gold-300" : "bg-smoke")} />
                <p className="text-[13.5px] text-parchment">{a.body}</p>
                <p className="mt-0.5 text-[11.5px] text-smoke">
                  {a.author ? `${a.author} · ` : ""}
                  {timeAgo(a.createdAt)}
                </p>
              </li>
            ))}
            <li className="relative">
              <span className="absolute top-1.5 -left-[25px] h-2 w-2 rounded-full bg-sage" />
              <p className="text-[13.5px] text-parchment">Enquiry received via {lead.source}</p>
              <p className="mt-0.5 text-[11.5px] text-smoke">{prettyDate(lead.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            </li>
          </ol>
        </div>
      </div>
    </Drawer>
  );
}

export default function Leads({ focusId }: { focusId?: number | null }) {
  const toast = useToast();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [view, setView] = useState<"table" | "board">("table");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(focusId ?? null);
  const [dragId, setDragId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await admin.leads();
    if (res.ok) setLeads(res.data ?? []);
    else {
      setLeads([]);
      toast(res.error ?? "Couldn't load leads.", "error");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (focusId) setOpenId(focusId);
  }, [focusId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads ?? [])
      .filter((l) => (status === "all" ? l.status !== "archived" : l.status === status))
      .filter((l) => !q || `${l.name} ${l.email} ${l.companyName ?? ""} ${l.service} ${l.reference} ${l.details}`.toLowerCase().includes(q));
  }, [leads, status, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const l of leads ?? []) {
      c[l.status] = (c[l.status] ?? 0) + 1;
      if (l.status !== "archived") c.all += 1;
    }
    return c;
  }, [leads]);

  const pipelineValue = (leads ?? []).filter((l) => ["new", "contacted", "qualified", "proposal"].includes(l.status)).reduce((s, l) => s + (l.valueEstimate ?? 0), 0);

  const moveTo = async (id: number, next: string) => {
    const lead = leads?.find((l) => l.id === id);
    if (!lead || lead.status === next) return;
    setLeads((ls) => ls?.map((l) => (l.id === id ? { ...l, status: next } : l)) ?? null);
    const res = await admin.updateLead(id, { status: next });
    if (res.ok) toast(`${lead.name} → ${next}`);
    else {
      toast(res.error ?? "Couldn't move the lead.", "error");
      void load();
    }
  };

  const exportCsv = () => {
    const rows = filtered.map((l) => ({
      reference: l.reference,
      received: l.createdAt,
      name: l.name,
      company: l.companyName ?? "",
      email: l.email,
      phone: l.phone ?? "",
      service: l.service,
      budget: l.budget,
      timeline: l.timeline ?? "",
      status: l.status,
      priority: l.priority,
      value_inr: l.valueEstimate ?? "",
      source: l.source,
      details: l.details,
    }));
    downloadFile(`novaframe-leads-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows), "text/csv");
    toast(`Exported ${rows.length} leads.`, "info");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Leads"
        description={`Every enquiry, estimator brief and booked call lands here. Open pipeline: ${formatINR(pipelineValue)}.`}
        actions={
          <>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: <span className="inline-flex items-center gap-1.5"><Icon name="list" className="h-3.5 w-3.5" />Table</span> },
                { value: "board", label: <span className="inline-flex items-center gap-1.5"><Icon name="kanban" className="h-3.5 w-3.5" />Board</span> },
              ]}
            />
            <button type="button" onClick={exportCsv} className="btn btn-line btn-sm" disabled={!filtered.length}>
              <Icon name="download" className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" onClick={() => void load()} className="btn btn-ghost btn-icon h-9 w-9" aria-label="Refresh">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {["all", ...LEAD_STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn("rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition", status === s ? "border-gold-300/50 bg-gold-400/15 text-gold-100" : "border-gold-300/10 text-mist hover:text-ivory")}
            >
              {s === "all" ? "Active" : s} <span className="ml-1 text-[11px] tabular-nums opacity-60">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, brief…" className="lg:w-80" />
      </div>

      {leads === null ? (
        <div className="lux-card">
          <LoadingBlock />
        </div>
      ) : view === "table" ? (
        <div className="lux-card overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState icon="inbox" title={leads.length ? "No leads match" : "No leads yet"} body={leads.length ? "Try another stage or search." : "Enquiries from the contact form, estimator and call bookings will appear here instantly."} />
          ) : (
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-gold-300/10">
                  {["Lead", "Service", "Budget", "Value", "Stage", "Source", "Received"].map((h) => (
                    <th key={h} scope="col" className="label px-5 py-3.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} onClick={() => setOpenId(l.id)} className="cursor-pointer border-b border-gold-300/[0.06] transition last:border-0 hover:bg-gold-300/[0.035]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[l.priority] ?? PRIORITY_DOT.normal)} title={`${l.priority} priority`} />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-ivory">{l.name}</p>
                          <p className="truncate text-[12px] text-smoke">{l.companyName ? `${l.companyName} · ` : ""}{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-3.5 text-[13px] text-sand">{l.service}</td>
                    <td className="px-5 py-3.5 text-[12.5px] text-mist">{l.budget}</td>
                    <td className="px-5 py-3.5 font-mono text-[12.5px] text-gold-200">{l.valueEstimate ? formatINRCompact(l.valueEstimate) : "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge value={l.status} />
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-mist capitalize">{l.source}</td>
                    <td className="px-5 py-3.5 text-[12.5px] whitespace-nowrap text-smoke">{timeAgo(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${BOARD.length}, minmax(240px, 1fr))` }}>
          {BOARD.map((col) => {
            const items = (leads ?? []).filter((l) => l.status === col).filter((l) => !query || `${l.name} ${l.email} ${l.service}`.toLowerCase().includes(query.toLowerCase()));
            const total = items.reduce((s, l) => s + (l.valueEstimate ?? 0), 0);
            return (
              <div
                key={col}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) void moveTo(dragId, col);
                  setDragId(null);
                }}
                className={cn("flex min-h-[420px] flex-col rounded-[20px] border bg-ink-900/60 p-3 transition", dragId ? "border-gold-300/25 border-dashed" : "border-gold-300/10")}
              >
                <div className="flex items-center justify-between px-1.5 pt-1 pb-3">
                  <span className="flex items-center gap-2">
                    <Badge value={col} />
                    <span className="font-mono text-[11px] text-smoke">{items.length}</span>
                  </span>
                  <span className="font-mono text-[11px] text-gold-300/80">{total ? formatINRCompact(total) : ""}</span>
                </div>
                <div className="flex-1 space-y-2.5">
                  {items.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      draggable
                      onDragStart={() => setDragId(l.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setOpenId(l.id)}
                      className={cn("lux-card block w-full cursor-grab p-3.5 text-left transition hover:border-gold-300/35 active:cursor-grabbing", dragId === l.id && "opacity-50")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-ivory">{l.name}</span>
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[l.priority] ?? PRIORITY_DOT.normal)} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] text-mist">{l.service}</p>
                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-gold-200">{l.valueEstimate ? formatINRCompact(l.valueEstimate) : "—"}</span>
                        <span className="text-smoke">{timeAgo(l.createdAt)}</span>
                      </div>
                    </button>
                  ))}
                  {!items.length ? <p className="px-2 py-6 text-center text-[12px] text-smoke">Drop leads here</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openId ? (
        <LeadDrawer
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={(updated) => {
            if (!updated) void load();
            else setLeads((ls) => ls?.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)) ?? null);
          }}
        />
      ) : null}
    </div>
  );
}
