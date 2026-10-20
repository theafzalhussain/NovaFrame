import { useCallback, useEffect, useState } from "react";
import { admin, type Analytics as AnalyticsData } from "../../lib/api";
import { prettyDate } from "../../lib/site";
import { AreaChart, BarList, Kpi, LoadingBlock, PageHeader, Panel, Segmented, useToast } from "./AdminUI";

export default function Analytics() {
  const toast = useToast();
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const [data, setData] = useState<AnalyticsData | null>(null);

  const load = useCallback(async () => {
    setData(null);
    const res = await admin.analytics(Number(days));
    if (res.ok && res.data) setData(res.data);
    else toast(res.error ?? "Couldn't load analytics.", "error");
  }, [days, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="First-party, cookie-free measurement recorded by your own API — page views, unique visitors, CTA clicks and conversion."
        actions={<Segmented value={days} onChange={setDays} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }]} />}
      />
      {!data ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Page views" value={data.totals.views} icon="eye" />
            <Kpi label="Unique visitors" value={data.totals.visitors} icon="users" />
            <Kpi label="Leads" value={data.totals.leads} icon="inbox" />
            <Kpi label="Visitor → lead" value={`${data.totals.conversion}%`} icon="target" hint="conversion rate" />
          </div>
          <Panel title="Traffic">
            <AreaChart
              labels={data.series.map((s) => prettyDate(s.date, { day: "numeric", month: "short" }))}
              series={[
                { name: "Views", values: data.series.map((s) => s.views), color: "#7c5c2e" },
                { name: "Visitors", values: data.series.map((s) => s.visitors), color: "#e3c88c" },
              ]}
            />
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Top pages">
              <BarList items={data.topPages.map((p) => ({ label: p.path || "/", value: p.views }))} empty="No page views yet" />
            </Panel>
            <Panel title="Call-to-action clicks">
              <BarList items={data.ctas.map((c) => ({ label: c.label.replace(/_/g, " "), value: c.count }))} empty="No CTA clicks yet" />
            </Panel>
            <Panel title="Conversion events">
              <BarList items={data.topEvents.map((e) => ({ label: e.name.replace(/_/g, " "), value: e.count }))} empty="No events yet" />
            </Panel>
            <Panel title="Referrers">
              <BarList items={data.referrers.map((r) => ({ label: r.referrer, value: r.count }))} empty="No external referrers yet" />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
