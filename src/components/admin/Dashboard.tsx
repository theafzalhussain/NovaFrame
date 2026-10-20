import { useCallback, useEffect, useState } from "react";
import { collectionLabels } from "../../data/defaults";
import type { CollectionName } from "../../data/types";
import { admin, type AdminUser, type Overview } from "../../lib/api";
import { formatINRCompact, prettyDate, timeAgo } from "../../lib/site";
import { Icon } from "../Icons";
import { AreaChart, Badge, BarList, Donut, EmptyState, Kpi, LoadingBlock, PageHeader, Panel, useToast } from "./AdminUI";

const STATUS_COLORS: Record<string, string> = {
  new: "#e3c88c",
  contacted: "#7dd3fc",
  qualified: "#c4b5fd",
  proposal: "#fcd34d",
  won: "#8fc4a2",
  lost: "#e48a6c",
  archived: "#6d665c",
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard({ user, go }: { user: AdminUser; go: (section: string, extra?: string) => void }) {
  const toast = useToast();
  const [data, setData] = useState<Overview | null>(null);

  const load = useCallback(async () => {
    const res = await admin.overview();
    if (res.ok && res.data) setData(res.data);
    else toast(res.error ?? "Couldn't load the dashboard.", "error");
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return <LoadingBlock label="Preparing your dashboard…" />;
  const k = data.kpis;
  const trend = k.leadsPrev7d ? Math.round(((k.leads7d - k.leadsPrev7d) / k.leadsPrev7d) * 100) : k.leads7d ? 100 : null;
  const labels = data.leadsSeries.map((d) => prettyDate(d.date, { day: "numeric", month: "short" }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        title={
          <>
            {greeting()}, <span className="serif-accent text-gold">{user.fullName.split(" ")[0]}.</span>
          </>
        }
        description={k.leadsNew ? `You have ${k.leadsNew} new ${k.leadsNew === 1 ? "lead" : "leads"} waiting for a reply.` : "All caught up — no unanswered leads."}
        actions={
          <>
            <button type="button" onClick={() => go("leads")} className="btn btn-gold btn-sm shine">
              <Icon name="inbox" className="h-4 w-4" /> Open leads
            </button>
            <button type="button" onClick={() => go("content", "projects")} className="btn btn-line btn-sm">
              <Icon name="plus" className="h-4 w-4" /> Add project
            </button>
            <button type="button" onClick={() => void load()} className="btn btn-ghost btn-icon h-9 w-9" aria-label="Refresh">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi label="New leads" value={k.leadsNew} icon="inbox" trend={trend} hint={`${k.leads7d} this week`} />
        <Kpi label="Open pipeline" value={formatINRCompact(k.pipelineValue)} icon="rupee" hint="est. value in play" />
        <Kpi label="Win rate" value={k.winRate === null ? "—" : `${k.winRate}%`} icon="award" hint={`${k.won} won · ${formatINRCompact(k.wonValue)}`} />
        <Kpi label="Upcoming calls" value={k.bookingsUpcoming} icon="calendar" hint="scheduled ahead" />
        <Kpi label="Visitors · 7d" value={k.visitors7d} icon="eye" hint={`${k.views7d} page views`} />
        <Kpi label="Subscribers" value={k.subscribers} icon="mail" hint={`+${k.subscribers7d} this week`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Leads & traffic — last 30 days" action={<span className="font-mono text-[11px] text-smoke">{data.leadsSeries.reduce((s, d) => s + d.count, 0)} leads</span>}>
          <AreaChart
            labels={labels}
            series={[
              { name: "Page views", values: data.viewsSeries.map((d) => d.count), color: "#7c5c2e" },
              { name: "Leads", values: data.leadsSeries.map((d) => d.count), color: "#e3c88c" },
            ]}
          />
        </Panel>
        <Panel title="Pipeline by stage">
          <Donut
            centerLabel="leads"
            segments={data.pipeline.map((p) => ({ label: p.status, value: p.count, color: STATUS_COLORS[p.status] ?? "#c2baab" }))}
          />
          <div className="hairline my-5" />
          <BarList items={data.pipeline.filter((p) => p.value).map((p) => ({ label: p.status, value: p.value }))} format={formatINRCompact} empty="No deal values yet" />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Recent leads"
          action={
            <button type="button" onClick={() => go("leads")} className="text-[12px] font-semibold text-gold-200">
              View all →
            </button>
          }
          padded={false}
        >
          {data.recentLeads.length ? (
            <ul className="divide-y divide-gold-300/[0.07]">
              {data.recentLeads.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => go("leads", String(l.id))} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-gold-300/[0.03]">
                    <span className="icon-tile h-9 w-9 shrink-0 rounded-full font-display text-[13px]">{l.name.slice(0, 1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ivory">{l.name}</span>
                      <span className="block truncate text-[12px] text-smoke">{l.service}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Badge value={l.status} />
                      <span className="text-[11px] text-smoke">{timeAgo(l.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="inbox" title="No leads yet" body="Share your site — enquiries land here in real time." />
          )}
        </Panel>

        <Panel
          title="Upcoming calls"
          action={
            <button type="button" onClick={() => go("bookings")} className="text-[12px] font-semibold text-gold-200">
              Calendar →
            </button>
          }
          padded={false}
        >
          {data.upcomingBookings.length ? (
            <ul className="divide-y divide-gold-300/[0.07]">
              {data.upcomingBookings.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold-300/20 bg-ink-950 text-center leading-none">
                    <span>
                      <span className="block font-mono text-[9px] text-smoke uppercase">{prettyDate(b.date, { month: "short" })}</span>
                      <span className="display mt-0.5 block text-[1.05rem] text-gold-100">{prettyDate(b.date, { day: "numeric" })}</span>
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ivory">{b.name}</span>
                    <span className="block truncate text-[12px] text-smoke">
                      {b.time} · {b.topic}
                    </span>
                  </span>
                  <Badge value={b.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="calendar" title="No calls scheduled" body="Visitors book from the Book a Call page." />
          )}
        </Panel>

        <Panel title="Lead sources">
          <BarList items={data.sources.map((s) => ({ label: s.source, value: s.count }))} empty="No leads yet" />
          <div className="hairline my-5" />
          <p className="label mb-3">Top services requested</p>
          <BarList items={data.services.map((s) => ({ label: s.service, value: s.count }))} empty="No leads yet" />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Panel title="Content on the site" padded={false}>
          <ul className="grid grid-cols-2 gap-px bg-gold-300/[0.07] sm:grid-cols-3">
            {data.content.map((c) => (
              <li key={c.collection} className="bg-ink-900">
                <button type="button" onClick={() => go("content", c.collection)} className="w-full px-5 py-4 text-left transition hover:bg-gold-300/[0.03]">
                  <span className="block text-[12px] text-mist">{collectionLabels[c.collection as CollectionName]?.label ?? c.collection}</span>
                  <span className="display mt-1 block text-[1.5rem] text-ivory">
                    {c.published}
                    {c.total > c.published ? <span className="ml-1.5 font-sans text-[11px] text-smoke">+{c.total - c.published} draft</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Recent activity"
          action={
            <button type="button" onClick={() => go("activity")} className="text-[12px] font-semibold text-gold-200">
              Full log →
            </button>
          }
          padded={false}
        >
          {data.recentActivity.length ? (
            <ul className="divide-y divide-gold-300/[0.07]">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-gold-400" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-sand">
                    <span className="font-mono text-[11.5px] text-gold-200">{a.action.replace(/_/g, " ").toLowerCase()}</span> · {a.target}
                  </span>
                  <span className="shrink-0 text-[11.5px] text-smoke">{timeAgo(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="history" title="No activity yet" />
          )}
        </Panel>
      </div>
    </div>
  );
}
