import { useId, useRef, useState, type DragEvent } from "react";
import type { InsightBlock } from "../../data/types";
import { Icon } from "../Icons";
import { cn } from "../../utils/cn";
import { IMAGE_ACCEPT, formatBytes, uploadImage } from "../../lib/media";
import { FieldShell, IconPicker, LinesInput, Spinner, TagsInput, Toggle, useToast } from "./AdminUI";
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
      return <ImageField field={field} id={id} value={String(value ?? "")} onChange={set} />;
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

/* ================================================================== */
/* Image field — upload from the device, link is optional             */
/* ================================================================== */
const fileName = (url: string) => url.split("?")[0].split("/").pop() || url;

function ImageField({ field, id, value, onChange }: { field: FieldDef; id: string; value: string; onChange: (v: string) => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  const browse = () => fileRef.current?.click();

  const take = async (file: File | null | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    const res = await uploadImage(file);
    setBusy(false);
    if (res.ok && res.data) {
      setBroken(false);
      onChange(res.data.url);
      toast(`Image added — ${formatBytes(res.data.bytes)}.`);
    } else {
      toast(res.error ?? "Couldn't upload that image.", "error");
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void take(e.dataTransfer.files?.[0]);
  };

  return (
    <FieldShell label={field.label} hint={field.hint ?? "JPG, PNG, WebP or GIF · up to 4 MB"} required={field.required}>
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          void take(e.target.files?.[0]);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-gold-300/12 bg-ink-950">
          <div className="relative grid min-h-[96px] place-items-center">
            {broken ? (
              <p className="flex items-center gap-2 px-4 py-8 text-center text-[12.5px] text-smoke">
                <Icon name="alert" className="h-4 w-4 text-ember" /> This image couldn't be loaded — upload a new one.
              </p>
            ) : (
              <img src={value} alt="" className="max-h-56 w-full object-cover object-top" onError={() => setBroken(true)} onLoad={() => setBroken(false)} />
            )}
            {busy ? (
              <div className="absolute inset-0 grid place-items-center bg-ink-950/70">
                <Spinner className="h-5 w-5" />
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 border-t border-gold-300/10 bg-ink-900/60 px-2.5 py-2">
            <button type="button" onClick={browse} disabled={busy} className="btn btn-ghost btn-sm h-8 disabled:opacity-50">
              <Icon name="upload" className="h-3.5 w-3.5" /> Replace
            </button>
            <button type="button" onClick={() => onChange("")} disabled={busy} className="btn btn-ghost btn-sm h-8 text-ember/90 hover:text-ember disabled:opacity-50">
              <Icon name="trash" className="h-3.5 w-3.5" /> Remove
            </button>
            <span className="ml-auto max-w-[45%] truncate pr-1 font-mono text-[10.5px] text-smoke" title={value}>
              {fileName(value)}
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={browse}
          disabled={busy}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-7 text-center transition",
            dragging ? "border-gold-300/70 bg-gold-300/[0.07]" : "border-gold-300/25 hover:border-gold-300/55 hover:bg-gold-300/[0.04]",
          )}
        >
          <span className="icon-tile h-10 w-10 rounded-xl">{busy ? <Spinner /> : <Icon name="image" className="h-4 w-4" />}</span>
          <span className="mt-1 text-[13.5px] font-semibold text-gold-100">{busy ? "Uploading…" : "Upload image"}</span>
          <span className="text-[11.5px] text-smoke">Drag & drop or click to browse</span>
        </button>
      )}

      <div className="mt-2">
        <button type="button" onClick={() => setLinkOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-smoke transition hover:text-gold-200">
          <Icon name="link" className="h-3.5 w-3.5" />
          {linkOpen ? "Hide link field" : "Or use an image link"}
          <span className="text-smoke/70">(optional)</span>
        </button>
        {linkOpen ? (
          <input
            id={id}
            className="field field-sm mt-2"
            placeholder="/projects/screenshot.jpg or https://…"
            value={value}
            onChange={(e) => {
              setBroken(false);
              onChange(e.target.value);
            }}
          />
        ) : null}
      </div>
    </FieldShell>
  );
}

function move<T>(list: T[], from: number, to: number) {  const next = [...list];
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
