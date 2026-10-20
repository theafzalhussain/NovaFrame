import { useCallback, useEffect, useMemo, useState } from "react";
import { blankFor } from "../../data/blanks";
import type { CollectionName, Project } from "../../data/types";
import { admin, notifyContentChanged, type ContentEntry } from "../../lib/api";
import { timeAgo } from "../../lib/site";
import { Icon } from "../Icons";
import ProjectCard from "../ProjectCard";
import { cn } from "../../utils/cn";
import { Badge, Drawer, EmptyState, LoadingBlock, PageHeader, SearchInput, Toggle, useConfirm, useToast } from "./AdminUI";
import { FieldGrid } from "./FieldRenderer";
import { getPath, schemas } from "./schemas";

type Doc = Record<string, unknown> & { id?: string };
type Editing = { entry?: ContentEntry; doc: Doc; published: boolean; id: string };

const SITE_PATH: Partial<Record<CollectionName, string>> = { projects: "/work/", services: "/services/", insights: "/insights/" };

const slugify = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);

export default function CollectionManager({ name, canReset }: { name: CollectionName; canReset: boolean }) {
  const schema = schemas[name];
  const toast = useToast();
  const confirm = useConfirm();
  const [entries, setEntries] = useState<ContentEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [idTouched, setIdTouched] = useState(false);

  const load = useCallback(async () => {
    const res = await admin.list<Doc>(name);
    if (res.ok) setEntries(res.data ?? []);
    else {
      setEntries([]);
      toast(res.error ?? "Couldn't load content.", "error");
    }
  }, [name, toast]);

  useEffect(() => {
    setEntries(null);
    setEditing(null);
    setQuery("");
    setFilter("all");
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (entries ?? []).filter((e) => (filter === "all" ? true : filter === "published" ? e.published : !e.published)).filter((e) => !q || JSON.stringify(e.data).toLowerCase().includes(q));
  }, [entries, query, filter]);

  const changed = () => {
    notifyContentChanged();
    void load();
  };

  const openNew = () => {
    setIdTouched(false);
    setEditing({ doc: blankFor(name) as unknown as Doc, published: true, id: "" });
  };
  const openEdit = (entry: ContentEntry) => {
    setIdTouched(true);
    setEditing({ entry, doc: JSON.parse(JSON.stringify(entry.data)) as Doc, published: entry.published, id: entry.id });
  };

  const save = async () => {
    if (!editing) return;
    const missing = schema.fields.filter((f) => f.required && !String(getPath(editing.doc, f.key) ?? "").trim());
    if (missing.length) {
      toast(`Please fill in: ${missing.map((m) => m.label).join(", ")}`, "error");
      return;
    }
    setSaving(true);
    const doc = { ...editing.doc };
    delete doc.id;
    const res = editing.entry
      ? await admin.update(name, editing.entry.id, doc, { published: editing.published, newId: editing.id && editing.id !== editing.entry.id ? editing.id : undefined })
      : await admin.create(name, { ...doc, id: editing.id || undefined }, editing.published);
    setSaving(false);
    if (!res.ok) {
      toast(res.error ?? "Save failed.", "error");
      return;
    }
    toast(`${schema.singular} ${editing.entry ? "updated" : "created"} — live on the site.`);
    setEditing(null);
    changed();
  };

  const togglePublish = async (entry: ContentEntry) => {
    const res = await admin.update(name, entry.id, entry.data, { published: !entry.published });
    if (res.ok) {
      toast(entry.published ? "Moved to drafts — hidden from the site." : "Published.");
      changed();
    } else toast(res.error ?? "Update failed.", "error");
  };

  const duplicate = async (entry: ContentEntry) => {
    const titleKey = schema.titleField;
    const copy = { ...entry.data, [titleKey]: `${String(entry.data[titleKey] ?? "")} (copy)` } as Doc;
    delete copy.id;
    const res = await admin.create(name, copy, false);
    if (res.ok) {
      toast("Duplicated as a draft.");
      changed();
    } else toast(res.error ?? "Duplicate failed.", "error");
  };

  const remove = async (entry: ContentEntry) => {
    const ok = await confirm({ title: `Delete this ${schema.singular.toLowerCase()}?`, body: `"${String(entry.data[schema.titleField] ?? entry.id)}" will be removed from the database and the live site. This can't be undone.`, confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    const res = await admin.remove(name, entry.id);
    if (res.ok) {
      toast("Deleted.");
      changed();
    } else toast(res.error ?? "Delete failed.", "error");
  };

  const reorder = async (index: number, dir: -1 | 1) => {
    if (!entries) return;
    const ids = entries.map((e) => e.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setEntries(ids.map((id) => entries.find((e) => e.id === id)!));
    const res = await admin.reorder(name, ids);
    if (res.ok) notifyContentChanged();
    else {
      toast(res.error ?? "Reorder failed.", "error");
      void load();
    }
  };

  const reset = async () => {
    const ok = await confirm({ title: `Reset ${schema.label.toLowerCase()} to defaults?`, body: "All entries in this section will be replaced with the shipped defaults. Other sections are untouched.", confirmLabel: "Reset section", tone: "danger" });
    if (!ok) return;
    const res = await admin.reset(name);
    if (res.ok) {
      toast(`${schema.label} restored to defaults.`);
      changed();
    } else toast(res.error ?? "Reset failed.", "error");
  };

  const sitePath = SITE_PATH[name];
  const filtering = Boolean(query) || filter !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title={schema.label}
        description={schema.description}
        actions={
          <>
            {canReset ? (
              <button type="button" onClick={reset} className="btn btn-ghost btn-sm">
                <Icon name="refresh" className="h-4 w-4" /> Reset
              </button>
            ) : null}
            <button type="button" onClick={openNew} className="btn btn-gold btn-sm shine">
              <Icon name="plus" className="h-4 w-4" /> New {schema.singular.toLowerCase()}
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder={`Search ${schema.label.toLowerCase()}…`} className="sm:w-80" />
        <div className="flex gap-1.5">
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn("rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition", filter === f ? "border-gold-300/50 bg-gold-400/15 text-gold-100" : "border-gold-300/10 text-mist hover:text-ivory")}
            >
              {f} <span className="ml-1 text-[11px] tabular-nums opacity-60">{f === "all" ? entries?.length ?? 0 : entries?.filter((e) => (f === "published" ? e.published : !e.published)).length ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="lux-card overflow-hidden">
        {entries === null ? (
          <LoadingBlock />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={schema.icon}
            title={filtering ? "Nothing matches" : `No ${schema.label.toLowerCase()} yet`}
            body={filtering ? "Try a different search or filter." : `Create the first ${schema.singular.toLowerCase()} — it appears on the site as soon as it's published.`}
            action={
              filtering ? null : (
                <button type="button" onClick={openNew} className="btn btn-gold btn-sm">
                  <Icon name="plus" className="h-4 w-4" /> New {schema.singular.toLowerCase()}
                </button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-gold-300/[0.07]">
            {visible.map((entry) => {
              const index = (entries ?? []).findIndex((e) => e.id === entry.id);
              const title = String(entry.data[schema.titleField] ?? entry.id);
              const subtitle = schema.subtitleField ? String(entry.data[schema.subtitleField] ?? "") : "";
              const image = schema.imageField ? String(entry.data[schema.imageField] ?? "") : "";
              return (
                <li key={entry.id} className="group flex items-center gap-4 px-4 py-3.5 transition hover:bg-gold-300/[0.03] sm:px-5">
                  {!filtering ? (
                    <div className="hidden flex-col sm:flex">
                      <button type="button" onClick={() => reorder(index, -1)} disabled={index === 0} className="text-smoke hover:text-gold-200 disabled:opacity-20" aria-label="Move up">
                        <Icon name="chevron-down" className="h-4 w-4 rotate-180" />
                      </button>
                      <button type="button" onClick={() => reorder(index, 1)} disabled={index === (entries?.length ?? 0) - 1} className="text-smoke hover:text-gold-200 disabled:opacity-20" aria-label="Move down">
                        <Icon name="chevron-down" className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  <button type="button" onClick={() => openEdit(entry)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                    {schema.imageField ? (
                      <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-gold-300/10 bg-ink-950">
                        {image ? <img src={image} alt="" className="h-full w-full object-cover object-top" /> : <Icon name={schema.icon} className="h-4 w-4 text-smoke" />}
                      </span>
                    ) : (
                      <span className="icon-tile h-10 w-10 shrink-0 rounded-xl">
                        <Icon name={String(entry.data.icon ?? schema.icon)} className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14.5px] font-semibold text-ivory">{title}</span>
                        {entry.data.featured ? <Icon name="star" className="h-3.5 w-3.5 shrink-0 fill-current text-gold-300" /> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-smoke">
                        {subtitle ? `${subtitle} · ` : ""}
                        updated {timeAgo(entry.updatedAt)}
                      </span>
                    </span>
                  </button>
                  <Badge value={entry.published ? "published" : "draft"} className="hidden sm:inline-flex" />
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button type="button" onClick={() => togglePublish(entry)} className="btn btn-ghost btn-icon h-9 w-9" title={entry.published ? "Unpublish" : "Publish"} aria-label={entry.published ? "Unpublish" : "Publish"}>
                      <Icon name={entry.published ? "eye" : "eye-off"} className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => duplicate(entry)} className="btn btn-ghost btn-icon hidden h-9 w-9 sm:inline-grid" title="Duplicate" aria-label="Duplicate">
                      <Icon name="copy" className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => openEdit(entry)} className="btn btn-ghost btn-icon h-9 w-9" title="Edit" aria-label="Edit">
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(entry)} className="btn btn-ghost btn-icon h-9 w-9 text-ember/80 hover:text-ember" title="Delete" aria-label="Delete">
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing ? (
        <Drawer
          width="max-w-3xl"
          title={editing.entry ? `Edit ${schema.singular.toLowerCase()}` : `New ${schema.singular.toLowerCase()}`}
          subtitle={editing.entry ? `ID: ${editing.entry.id}` : "Fill in the details, then publish or save as a draft."}
          onClose={() => setEditing(null)}
          footer={
            <>
              {editing.entry && sitePath && editing.entry.published ? (
                <a href={`#${sitePath}${editing.entry.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm mr-auto">
                  <Icon name="external" className="h-4 w-4" /> View on site
                </a>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-gold btn-sm shine" onClick={save} disabled={saving}>
                <Icon name="save" className="h-4 w-4" /> {saving ? "Saving…" : editing.published ? "Save & publish" : "Save draft"}
              </button>
            </>
          }
        >
          <div className="space-y-6">
            {name === "projects" ? (
              <div className="pointer-events-none mx-auto max-w-sm select-none" aria-hidden>
                <p className="label mb-3 text-center">Live preview</p>
                <ProjectCard project={{ ...(blankFor("projects") as Project), ...(editing.doc as Partial<Project>), id: editing.id || "preview" }} />
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <span className="field-label">URL slug / ID</span>
                <input
                  className="field mt-2 font-mono text-[13px]"
                  value={editing.id}
                  placeholder="auto-generated from the title"
                  onChange={(e) => {
                    setIdTouched(true);
                    setEditing({ ...editing, id: slugify(e.target.value) });
                  }}
                />
              </div>
              <div className="sm:w-56">
                <Toggle label={editing.published ? "Published" : "Draft"} description={editing.published ? "Visible on the site" : "Hidden from visitors"} checked={editing.published} onChange={(v) => setEditing({ ...editing, published: v })} />
              </div>
            </div>
            <div className="hairline" />
            <FieldGrid
              fields={schema.fields}
              doc={editing.doc}
              onChange={(doc) => {
                const title = String(doc[schema.titleField] ?? "");
                setEditing({ ...editing, doc, id: !editing.entry && !idTouched ? slugify(title) : editing.id });
              }}
            />
          </div>
        </Drawer>
      ) : null}
    </div>
  );
}
