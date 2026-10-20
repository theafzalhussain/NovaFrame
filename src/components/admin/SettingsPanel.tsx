import { useEffect, useMemo, useState } from "react";
import { defaultContent } from "../../data/defaults";
import type { AdvancedSettings, SiteSettings } from "../../data/types";
import { admin, notifyContentChanged } from "../../lib/api";
import { Icon } from "../Icons";
import { cn } from "../../utils/cn";
import { LoadingBlock, PageHeader, Panel, useConfirm, useToast } from "./AdminUI";
import { FieldGrid } from "./FieldRenderer";
import { settingsSections } from "./schemas";

/* ------------------------------------------------------------------ */
/* Site settings (structured form)                                    */
/* ------------------------------------------------------------------ */
export function SiteSettingsPanel() {
  const toast = useToast();
  const [saved, setSaved] = useState<SiteSettings | null>(null);
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    void admin.settings().then((res) => {
      if (res.ok && res.data) {
        setSaved(res.data.site);
        setDraft(res.data.site);
      } else toast(res.error ?? "Couldn't load settings.", "error");
    });
  }, [toast]);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!draft) return <LoadingBlock />;

  const save = async () => {
    setSaving(true);
    const res = await admin.saveSettings("site", draft);
    setSaving(false);
    if (res.ok && res.data) {
      setSaved(res.data as SiteSettings);
      setDraft(res.data as SiteSettings);
      notifyContentChanged();
      toast("Settings saved — the site is updated.");
    } else toast(res.error ?? "Save failed.", "error");
  };

  const section = settingsSections[active];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Site settings"
        description="Company details, contact channels, hero copy, offers and booking slots — every change goes live instantly."
        actions={
          <>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!dirty} onClick={() => setDraft(saved)}>
              Discard
            </button>
            <button type="button" className="btn btn-gold btn-sm shine" disabled={!dirty || saving} onClick={save}>
              <Icon name="save" className="h-4 w-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav className="lux-card h-fit p-2 lg:sticky lg:top-24" aria-label="Settings sections">
          {settingsSections.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setActive(i)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition", i === active ? "bg-gold-400/12 text-gold-100" : "text-sand hover:bg-gold-300/[0.04] hover:text-ivory")}
            >
              <Icon name={s.icon} className={cn("h-4 w-4", i === active ? "text-gold-300" : "text-smoke")} />
              {s.title}
            </button>
          ))}
        </nav>
        <Panel title={section.title}>
          <p className="-mt-1 mb-6 text-[13px] text-mist">{section.description}</p>
          <FieldGrid fields={section.fields} doc={draft as unknown as Record<string, unknown>} onChange={(next) => setDraft(next as unknown as SiteSettings)} />
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Advanced (validated JSON blocks)                                   */
/* ------------------------------------------------------------------ */
const BLOCKS: { key: keyof AdvancedSettings; title: string; description: string }[] = [
  { key: "estimator", title: "Cost estimator", description: "Project types, base prices (₹), size multipliers, add-ons and rush multiplier." },
  { key: "budgetRanges", title: "Budget ranges", description: "Used by the contact form, booking page and estimator. Use null for an open-ended max." },
  { key: "timelineOptions", title: "Timeline options", description: "Choices shown on the contact form." },
  { key: "bookingTopics", title: "Booking topics", description: "Topics on the Book a Call form." },
  { key: "budgetUnsure", title: "“Not sure” budget label", description: "The extra budget choice for undecided visitors." },
  { key: "comparison", title: "Comparison table", description: "Columns and rows of the “How we compare” table. Values: yes, no or partial." },
  { key: "legal", title: "Legal pages", description: "Privacy policy and terms of service content." },
];

export function AdvancedPanel({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [advanced, setAdvanced] = useState<AdvancedSettings | null>(null);
  const [active, setActive] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void admin.settings().then((res) => {
      if (res.ok && res.data) setAdvanced(res.data.advanced);
      else toast(res.error ?? "Couldn't load settings.", "error");
    });
  }, [toast]);

  const block = BLOCKS[active];
  useEffect(() => {
    if (advanced) {
      setText(JSON.stringify(advanced[block.key], null, 2));
      setError("");
    }
  }, [advanced, block.key]);

  if (!advanced) return <LoadingBlock />;

  const parse = () => {
    try {
      const value = JSON.parse(text) as unknown;
      setError("");
      return { ok: true as const, value };
    } catch (e) {
      setError((e as Error).message);
      return { ok: false as const };
    }
  };

  const save = async (value: unknown) => {
    setSaving(true);
    const res = await admin.saveSettings("advanced", { [block.key]: value });
    setSaving(false);
    if (res.ok && res.data) {
      setAdvanced(res.data as AdvancedSettings);
      notifyContentChanged();
      toast(`${block.title} saved.`);
    } else toast(res.error ?? "Save failed.", "error");
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="System" title="Advanced configuration" description="Structured data behind the estimator, forms, comparison table and legal pages — edited as validated JSON." />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav className="lux-card h-fit p-2 lg:sticky lg:top-24">
          {BLOCKS.map((b, i) => (
            <button key={b.key} type="button" onClick={() => setActive(i)} className={cn("block w-full rounded-xl px-3 py-2.5 text-left text-[13.5px] transition", i === active ? "bg-gold-400/12 text-gold-100" : "text-sand hover:bg-gold-300/[0.04] hover:text-ivory")}>
              {b.title}
            </button>
          ))}
        </nav>
        <Panel
          title={block.title}
          action={
            <span className={cn("font-mono text-[11px]", error ? "text-ember" : "text-sage")}>
              {error ? "Invalid JSON" : "Valid JSON"}
            </span>
          }
        >
          <p className="-mt-1 mb-4 text-[13px] text-mist">{block.description}</p>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              try {
                JSON.parse(e.target.value);
                setError("");
              } catch (err) {
                setError((err as Error).message);
              }
            }}
            spellCheck={false}
            rows={22}
            readOnly={!canEdit}
            className="field font-mono text-[12.5px] leading-relaxed"
            aria-invalid={Boolean(error)}
          />
          {error ? <p className="mt-2 font-mono text-[11.5px] text-ember">{error}</p> : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2.5">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const p = parse();
                if (p.ok) setText(JSON.stringify(p.value, null, 2));
              }}
            >
              Format
            </button>
            {canEdit ? (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    if (await confirm({ title: `Restore default ${block.title.toLowerCase()}?`, body: "This replaces the current value with the shipped defaults.", confirmLabel: "Restore", tone: "danger" })) {
                      void save(defaultContent.advanced[block.key]);
                    }
                  }}
                >
                  Restore default
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  disabled={saving || Boolean(error)}
                  onClick={() => {
                    const p = parse();
                    if (p.ok) void save(p.value);
                  }}
                >
                  <Icon name="save" className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
