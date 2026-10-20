import { useCallback, useEffect, useMemo, useState } from "react";
import { admin, type Subscriber } from "../../lib/api";
import { prettyDate } from "../../lib/site";
import { Icon } from "../Icons";
import { EmptyState, LoadingBlock, PageHeader, SearchInput, downloadFile, toCsv, useConfirm, useToast } from "./AdminUI";

export default function Subscribers() {
  const toast = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<Subscriber[] | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const res = await admin.subscribers();
    if (res.ok) setList(res.data ?? []);
    else {
      setList([]);
      toast(res.error ?? "Couldn't load subscribers.", "error");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => (list ?? []).filter((s) => s.email.includes(query.trim().toLowerCase())), [list, query]);

  const remove = async (s: Subscriber) => {
    const ok = await confirm({ title: "Remove subscriber?", body: `${s.email} will no longer receive studio notes.`, confirmLabel: "Remove", tone: "danger" });
    if (!ok) return;
    const res = await admin.deleteSubscriber(s.id);
    if (res.ok) {
      toast("Subscriber removed.");
      void load();
    } else toast(res.error ?? "Delete failed.", "error");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audience"
        title="Subscribers"
        description="People who joined the monthly studio notes from the footer."
        actions={
          <>
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={!visible.length}
              onClick={() => {
                void navigator.clipboard?.writeText(visible.map((s) => s.email).join(", "));
                toast(`${visible.length} emails copied.`, "info");
              }}
            >
              <Icon name="copy" className="h-4 w-4" /> Copy emails
            </button>
            <button type="button" className="btn btn-gold btn-sm" disabled={!visible.length} onClick={() => downloadFile("novaframe-subscribers.csv", toCsv(visible.map((s) => ({ email: s.email, source: s.source, joined: s.createdAt }))), "text/csv")}>
              <Icon name="download" className="h-4 w-4" /> Export CSV
            </button>
          </>
        }
      />
      <SearchInput value={query} onChange={setQuery} placeholder="Search emails…" className="sm:w-80" />
      <div className="lux-card overflow-hidden">
        {list === null ? (
          <LoadingBlock />
        ) : !visible.length ? (
          <EmptyState icon="mail" title={list.length ? "No matches" : "No subscribers yet"} body="The footer sign-up feeds this list." />
        ) : (
          <ul className="divide-y divide-gold-300/[0.07]">
            {visible.map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="icon-tile h-9 w-9 shrink-0 rounded-full">
                  <Icon name="mail" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ivory">{s.email}</span>
                  <span className="block text-[12px] text-smoke">
                    via {s.source} · {prettyDate(s.createdAt)}
                  </span>
                </span>
                <button type="button" onClick={() => remove(s)} className="btn btn-ghost btn-icon h-9 w-9 text-ember/80 hover:text-ember" aria-label="Remove subscriber">
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
