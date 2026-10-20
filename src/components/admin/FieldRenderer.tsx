import { useId, useState } from "react";
import type { InsightBlock } from "../../data/types";
import { Icon } from "../Icons";
import { cn } from "../../utils/cn";
import { FieldShell, IconPicker, LinesInput, TagsInput, Toggle } from "./AdminUI";
import { getPath, setPath, type FieldDef } from "./schemas";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = { field: FieldDef; doc: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void };

/** Renders a full grid of fields for a document (dot paths supported). */
export function FieldGrid({ fields, doc, onChange }: { fields: FieldDef[]; doc: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields
        .filter((f) => !f.showIf || getPath(doc, f.showIf.key) === f.showIf.equals || (f.showIf.equals === "browser" && !getPath(doc, f.showIf.key)))
        .map((f) => (
          <div key={f.key} className={cn(f.wide || f.type === "repeater" || f.type === "blocks" ? "sm:col-span-2" : "")}>
            <FieldInput field={f} doc={doc} onChange={onChange} />
          </div>
        ))}
    </div>
  );
}

export function FieldInput({ field, doc, onChange }: Props) {
  const id = useId();
  const value = getPath(doc, field.key);
  const set = (v: unknown) => onChange(setPath(doc, field.key, v));
  const listId = field.suggestions ? `${id}-list` : undefined;

  switch (field.type) {
    case "toggle":
      return <Toggle label={field.label} description={field.hint} checked={Boolean(value)} onChange={set} />;
    case "textarea":
      return (
        <FieldShell label={field.label} hint={field.hint} required={field.required}>
          <textarea id={id} rows={field.rows ?? 3} className="field" placeholder={field.placeholder} value={String(value ?? "")} onChange={(e) => set(e.target.value)} />
        </FieldShell>
      );
    case "number":
      return (
        <FieldShell label={field.label} hint={field.hint} required={field.required}>
          <input id={id} type="number" className="field" value={value === undefined || value === null ? "" : String(value)} onChange={(e) => set(e.target.value === "" ? 0 : Number(e.target.value))} />
        </FieldShell>
      );
    case "select":
      return (
        <FieldShell label={field.label} hint={field.hint} required={field.required}>
          <select id={id} className="field" value={String(value ?? field.options?.[0]?.value ?? "")} onChange={(e) => set(e.target.value)}>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldShell>
      );
    case "tags":
      return (
        <FieldShell label={field.label} hint={field.hint ?? "Enter or comma to add"} required={field.required}>
          <TagsInput value={Array.isArray(value) ? (value as unknown[]).map(String) : []} onChange={set} placeholder={field.placeholder} />
        </FieldShell>
      );
    case "lines":
      return (
        <FieldShell label={field.label} hint={field.hint ?? "One per line"} required={field.required}>
          <LinesInput rows={field.rows} value={Array.isArray(value) ? (value as unknown[]).map(String) : []} onChange={set} placeholder={field.placeholder} />
        </FieldShell>
      );
    case "icon":
      return (
        <FieldShell label={field.label} hint={field.hint}>
          <IconPicker value={String(value ?? "")} onChange={set} />
        </FieldShell>
      );
    case "image":
      return (
        <FieldShell label={field.label} hint={field.hint ?? "Path in /public (e.g. /projects/x.jpg) or a full URL"}>
          <div className="flex items-start gap-3">
            <div className="grid h-[74px] w-[110px] shrink-0 place-items-center overflow-hidden rounded-xl border border-gold-300/12 bg-ink-950">
              {value ? <img src={String(value)} alt="" className="h-full w-full object-cover object-top" /> : <Icon name="image" className="h-5 w-5 text-smoke" />}
            </div>
            <input id={id} className="field" placeholder="/projects/screenshot.jpg" value={String(value ?? "")} onChange={(e) => set(e.target.value)} />
          </div>
        </FieldShell>
      );
    case "days": {
      const days = Array.isArray(value) ? (value as number[]) : [];
      return (
        <FieldShell label={field.label} hint={field.hint}>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <button key={d} type="button" aria-pressed={days.includes(i)} onClick={() => set(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())} className="choice rounded-full px-4 py-2 text-[13px] font-medium">
                {d}
              </button>
            ))}
          </div>
        </FieldShell>
      );
    }
    case "repeater":
      return <Repeater field={field} value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []} onChange={set} />;
    case "blocks":
      return <BlocksEditor value={Array.isArray(value) ? (value as InsightBlock[]) : []} onChange={set} />;
    default:
      return (
        <FieldShell label={field.label} hint={field.hint} required={field.required}>
          <input
            id={id}
            type={field.type === "url" ? "url" : field.type === "date" ? "date" : "text"}
            list={listId}
            className="field"
            placeholder={field.placeholder}
            value={String(value ?? "")}
            onChange={(e) => set(e.target.value)}
          />
          {field.suggestions ? (
            <datalist id={listId}>
              {field.suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          ) : null}
        </FieldShell>
      );
  }
}

function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function Repeater({ field, value, onChange }: { field: FieldDef; value: Record<string, unknown>[]; onChange: (v: Record<string, unknown>[]) => void }) {
  const sub = field.fields ?? [];
  const blank = Object.fromEntries(sub.map((f) => [f.key, f.type === "number" ? 0 : ""]));
  return (
    <FieldShell label={field.label} hint={`${value.length} item${value.length === 1 ? "" : "s"}`}>
      <div className="space-y-2.5">
        {value.map((row, i) => (
          <div key={i} className="lux-inset rounded-2xl p-3.5">
            <div className="flex items-start gap-3">
              <span className="mt-2.5 font-mono text-[10.5px] text-gold-500">{String(i + 1).padStart(2, "0")}</span>
              <div className={cn("grid flex-1 gap-3", sub.length >= 3 ? "sm:grid-cols-3" : sub.length === 2 ? "sm:grid-cols-2" : "")}>
                {sub.map((f) => (
                  <FieldInput key={f.key} field={{ ...f, hint: undefined }} doc={row} onChange={(next) => onChange(value.map((r, j) => (j === i ? next : r)))} />
                ))}
              </div>
              <div className="flex shrink-0 flex-col gap-1 pt-6">
                <button type="button" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} className="btn btn-ghost btn-icon h-7 w-7 disabled:opacity-30" aria-label="Move up">
                  <Icon name="arrow-up" className="h-3.5 w-3.5" />
                </button>
                <button type="button" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))} className="btn btn-ghost btn-icon h-7 w-7 disabled:opacity-30" aria-label="Move down">
                  <Icon name="arrow-down" className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="btn btn-ghost btn-icon h-7 w-7 text-ember" aria-label="Remove">
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...value, { ...blank }])} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gold-300/25 py-3 text-[13px] font-semibold text-gold-200 transition hover:border-gold-300/60 hover:bg-gold-300/[0.04]">
          <Icon name="plus" className="h-4 w-4" /> Add {field.label.toLowerCase().replace(/s$/, "")}
        </button>
      </div>
    </FieldShell>
  );
}

function BlocksEditor({ value, onChange }: { value: InsightBlock[]; onChange: (v: InsightBlock[]) => void }) {
  const [open, setOpen] = useState<number | null>(value.length ? 0 : null);
  const update = (i: number, patch: Partial<InsightBlock>) => onChange(value.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <FieldShell label="Article body" hint={`${value.length} section${value.length === 1 ? "" : "s"}`}>
      <div className="space-y-2.5">
        {value.map((block, i) => (
          <div key={i} className="lux-inset overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="font-mono text-[10.5px] text-gold-500">§{i + 1}</span>
                <span className="truncate text-[13.5px] font-semibold text-parchment">{block.heading || (i === 0 ? "Introduction" : "Untitled section")}</span>
                <span className="text-[11.5px] text-smoke">
                  {block.paragraphs.length}¶{block.list?.length ? ` · ${block.list.length} bullets` : ""}
                </span>
              </button>
              <button type="button" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} className="btn btn-ghost btn-icon h-7 w-7 disabled:opacity-30" aria-label="Move up">
                <Icon name="arrow-up" className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))} className="btn btn-ghost btn-icon h-7 w-7 disabled:opacity-30" aria-label="Move down">
                <Icon name="arrow-down" className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="btn btn-ghost btn-icon h-7 w-7 text-ember" aria-label="Remove section">
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </div>
            {open === i ? (
              <div className="space-y-4 border-t border-gold-300/10 p-4">
                <FieldShell label="Section heading" hint="Leave empty for an intro">
                  <input className="field" value={block.heading ?? ""} onChange={(e) => update(i, { heading: e.target.value })} />
                </FieldShell>
                <FieldShell label="Paragraphs" hint="Blank line between paragraphs">
                  <LinesInput rows={6} mode="paragraph" value={block.paragraphs} onChange={(paragraphs) => update(i, { paragraphs })} />
                </FieldShell>
                <FieldShell label="Bullet list" hint="Optional · one per line">
                  <LinesInput rows={3} value={block.list ?? []} onChange={(list) => update(i, { list })} />
                </FieldShell>
              </div>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            onChange([...value, { heading: "", paragraphs: [], list: [] }]);
            setOpen(value.length);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gold-300/25 py-3 text-[13px] font-semibold text-gold-200 transition hover:border-gold-300/60 hover:bg-gold-300/[0.04]"
        >
          <Icon name="plus" className="h-4 w-4" /> Add section
        </button>
      </div>
    </FieldShell>
  );
}
