import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, iconNames } from "../Icons";
import { cn } from "../../utils/cn";

/* ================================================================== */
/* Toasts                                                             */
/* ================================================================== */
type Toast = { id: number; tone: "success" | "error" | "info"; message: string };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[10000] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "lux-panel pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3.5 text-[13.5px] text-parchment",
              t.tone === "error" && "border-ember/50",
            )}
            style={{ animation: "fade-up .35s both" }}
          >
            <Icon
              name={t.tone === "error" ? "alert" : t.tone === "info" ? "info" : "check-circle"}
              className={cn("mt-0.5 h-4 w-4 shrink-0", t.tone === "error" ? "text-ember" : t.tone === "info" ? "text-gold-300" : "text-sage")}
            />
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ================================================================== */
/* Confirm dialog                                                     */
/* ================================================================== */
type ConfirmOpts = { title: string; body?: string; confirmLabel?: string; tone?: "danger" | "default" };
const ConfirmContext = createContext<(opts: ConfirmOpts) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...opts, resolve })), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state ? (
        <Modal onClose={() => close(false)} size="sm" title={state.title}>
          {state.body ? <p className="text-[14px] leading-relaxed text-mist">{state.body}</p> : null}
          <div className="mt-7 flex justify-end gap-2.5">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => close(false)}>
              Cancel
            </button>
            <button type="button" className={cn("btn btn-sm", state.tone === "danger" ? "btn-danger" : "btn-gold")} onClick={() => close(true)} autoFocus>
              {state.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </Modal>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

/* ================================================================== */
/* Overlays                                                           */
/* ================================================================== */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

export function Modal({ title, children, onClose, size = "md", footer }: { title: ReactNode; children: ReactNode; onClose: () => void; size?: "sm" | "md" | "lg"; footer?: ReactNode }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-[9990] flex items-start justify-center overflow-y-auto p-4 pt-[10vh]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="fixed inset-0 cursor-default bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("lux-panel page-enter relative w-full rounded-[22px]", size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl")}>
        <div className="flex items-center justify-between gap-4 border-b border-gold-300/10 px-6 py-4">
          <h2 className="display text-[1.3rem]">{title}</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon h-9 w-9" aria-label="Close">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2.5 border-t border-gold-300/10 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Drawer({ title, subtitle, children, onClose, footer, width = "max-w-2xl" }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; onClose: () => void; footer?: ReactNode; width?: string }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-[9980] flex justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close panel" className="absolute inset-0 cursor-default bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative flex h-full w-full flex-col border-l border-gold-300/12 bg-ink-900 shadow-2xl", width)} style={{ animation: "drawer-in .45s cubic-bezier(.16,1,.3,1) both" }}>
        <div className="flex items-start justify-between gap-4 border-b border-gold-300/10 px-6 py-5">
          <div className="min-w-0">
            <h2 className="display truncate text-[1.5rem] leading-tight">{title}</h2>
            {subtitle ? <div className="mt-1 text-[12.5px] text-mist">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon h-9 w-9 shrink-0" aria-label="Close">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-gold-300/10 bg-ink-950/50 px-6 py-4">{footer}</div> : null}
      </div>
      <style>{`@keyframes drawer-in{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

/* ================================================================== */
/* Layout pieces                                                      */
/* ================================================================== */
export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="label text-gold-400">{eyebrow}</p> : null}
        <h1 className="display mt-2 text-[2rem] leading-tight md:text-[2.4rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[14px] text-mist">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, action, children, className, padded = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("lux-card overflow-hidden", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-gold-300/10 px-5 py-4">
          <h2 className="text-[14px] font-semibold tracking-[0.01em] text-ivory">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon = "inbox", title, body, action }: { icon?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="icon-tile h-14 w-14 rounded-2xl">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-5 text-[15px] font-semibold text-ivory">{title}</p>
      {body ? <p className="mt-1.5 max-w-sm text-[13.5px] text-mist">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold-300/30 border-t-gold-300", className)} aria-label="Loading" />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-[13.5px] text-mist">
      <Spinner /> {label}
    </div>
  );
}

const TONES: Record<string, string> = {
  new: "border-gold-300/50 bg-gold-400/15 text-gold-100",
  contacted: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  qualified: "border-violet-300/30 bg-violet-300/10 text-violet-100",
  proposal: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  won: "border-sage/50 bg-sage/15 text-[#dff3e6]",
  lost: "border-ember/40 bg-ember/10 text-[#ffd9cc]",
  archived: "border-smoke/40 bg-smoke/10 text-mist",
  scheduled: "border-gold-300/50 bg-gold-400/15 text-gold-100",
  confirmed: "border-sage/50 bg-sage/15 text-[#dff3e6]",
  completed: "border-smoke/40 bg-smoke/10 text-sand",
  cancelled: "border-ember/40 bg-ember/10 text-[#ffd9cc]",
  no_show: "border-ember/40 bg-ember/10 text-[#ffd9cc]",
  high: "border-ember/40 bg-ember/10 text-[#ffd9cc]",
  normal: "border-gold-300/25 bg-gold-300/5 text-sand",
  low: "border-smoke/40 bg-smoke/10 text-mist",
  owner: "border-gold-300/50 bg-gold-400/15 text-gold-100",
  admin: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  editor: "border-violet-300/30 bg-violet-300/10 text-violet-100",
  published: "border-sage/50 bg-sage/15 text-[#dff3e6]",
  draft: "border-smoke/40 bg-smoke/10 text-mist",
};

export function Badge({ value, label, className }: { value: string; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize", TONES[value] ?? TONES.normal, className)}>
      {label ?? value.replace(/_/g, " ")}
    </span>
  );
}

export function Kpi({ label, value, hint, icon, trend }: { label: string; value: ReactNode; hint?: ReactNode; icon: string; trend?: number | null }) {
  return (
    <div className="lux-card group relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium text-mist">{label}</p>
        <span className="icon-tile h-9 w-9 rounded-[11px]">
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className="display mt-3 text-[2.1rem] leading-none text-ivory">{value}</p>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-smoke">
        {trend !== undefined && trend !== null ? (
          <span className={cn("inline-flex items-center gap-1 font-semibold", trend >= 0 ? "text-sage" : "text-ember")}>
            <Icon name={trend >= 0 ? "arrow-up" : "arrow-down"} className="h-3 w-3" strokeWidth={2.4} />
            {Math.abs(trend)}%
          </span>
        ) : null}
        {hint}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Charts (dependency-free SVG)                                       */
/* ================================================================== */
export function AreaChart({ series, height = 180, labels }: { series: { name: string; values: number[]; color: string }[]; height?: number; labels: string[] }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement | null>(null);
  const width = 600;
  const len = Math.max(...series.map((s) => s.values.length), 1);
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i: number) => (len <= 1 ? 0 : (i / (len - 1)) * width);
  const y = (v: number) => height - 8 - (v / max) * (height - 24);

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        preserveAspectRatio="none"
        onPointerMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          const i = Math.round(((e.clientX - r.left) / r.width) * (len - 1));
          setHover(Math.max(0, Math.min(len - 1, i)));
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={series.map((s) => `${s.name}: ${s.values.reduce((a, b) => a + b, 0)} total`).join(", ")}
      >
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.name} id={`${id}-g${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity="0.32" />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={width} y1={height * f} y2={height * f} stroke="rgba(227,200,140,0.07)" strokeDasharray="3 5" />
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          return (
            <g key={s.name}>
              <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#${id}-g${si})`} />
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
        {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1="0" y2={height} stroke="rgba(227,200,140,0.35)" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      {hover !== null ? (
        <div
          className="lux-panel pointer-events-none absolute top-0 z-10 rounded-xl px-3 py-2 text-[11.5px]"
          style={{ left: `${(hover / Math.max(len - 1, 1)) * 100}%`, transform: `translateX(${hover > len / 2 ? "-105%" : "5%"})` }}
        >
          <p className="font-mono text-smoke">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.name} className="mt-0.5 flex items-center gap-2 text-parchment">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}: <span className="font-semibold">{s.values[hover] ?? 0}</span>
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-2 flex justify-between font-mono text-[10px] text-smoke">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

export function BarList({ items, format = (v: number) => String(v), empty = "No data yet" }: { items: { label: string; value: number; hint?: string }[]; format?: (v: number) => string; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-[13px] text-smoke">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.label}>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="truncate text-parchment capitalize">{it.label}</span>
            <span className="shrink-0 font-mono text-[12px] text-sand">
              {format(it.value)}
              {it.hint ? <span className="ml-2 text-smoke">{it.hint}</span> : null}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gold-300/[0.07]">
            <div className="bar-grow h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-300" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Donut({ segments, size = 140, centerLabel, centerValue }: { segments: { label: string; value: number; color: string }[]; size?: number; centerLabel?: string; centerValue?: ReactNode }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(227,200,140,0.08)" strokeWidth="12" />
          {total > 0
            ? segments.map((s) => {
                const len = (s.value / total) * c;
                const el = <circle key={s.label} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="12" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
                offset += len;
                return el;
              })
            : null}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="display text-[1.6rem] leading-none text-ivory">{centerValue ?? total}</p>
            {centerLabel ? <p className="mt-1 text-[10.5px] text-smoke">{centerLabel}</p> : null}
          </div>
        </div>
      </div>
      <ul className="min-w-0 space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-[12.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="truncate text-sand capitalize">{s.label}</span>
            <span className="font-mono text-[11.5px] text-smoke">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================================================================== */
/* Form inputs                                                        */
/* ================================================================== */
export function FieldShell({ label, hint, children, required, className }: { label: string; hint?: ReactNode; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="field-label">
          {label} {required ? <span className="text-gold-400">*</span> : null}
        </span>
        {hint ? <span className="text-[11px] text-smoke">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-gold-300/10 px-4 py-3 text-left transition hover:border-gold-300/25">
      <span>
        <span className="block text-[13.5px] font-semibold text-parchment">{label}</span>
        {description ? <span className="mt-0.5 block text-[12px] text-smoke">{description}</span> : null}
      </span>
      <span className="toggle" data-on={checked} aria-hidden />
    </button>
  );
}

/** Chips input for string arrays (Enter or comma to add). */
export function TagsInput({ value, onChange, placeholder = "Type and press Enter" }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setDraft("");
  };
  return (
    <div className="field flex min-h-[3rem] flex-wrap items-center gap-1.5 py-2">
      {value.map((tag, i) => (
        <span key={tag + i} className="chip chip-gold gap-1.5 py-1 pr-1.5 pl-2.5">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid h-4 w-4 place-items-center rounded-full hover:bg-gold-300/20" aria-label={`Remove ${tag}`}>
            <Icon name="close" className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-[14px] text-ivory placeholder:text-smoke focus:outline-none"
      />
    </div>
  );
}

/** One item per line (or per blank-line-separated paragraph), edited as plain text. */
export function LinesInput({
  value,
  onChange,
  rows = 4,
  placeholder,
  mode = "line",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
  placeholder?: string;
  mode?: "line" | "paragraph";
}) {
  const joiner = mode === "paragraph" ? "\n\n" : "\n";
  const parse = (raw: string) => (mode === "paragraph" ? raw.split(/\n\s*\n/) : raw.split("\n")).map((l) => l.trim()).filter(Boolean);
  const [text, setText] = useState(value.join(joiner));
  const last = useRef(value);
  useEffect(() => {
    // Only resync when the value changed from outside (e.g. reset), never while typing.
    if (value !== last.current && value.join(joiner) !== parse(text).join(joiner)) setText(value.join(joiner));
    last.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <textarea
      rows={rows}
      className="field leading-relaxed"
      value={text}
      placeholder={placeholder ?? (mode === "paragraph" ? "Blank line between paragraphs" : "One item per line")}
      onChange={(e) => {
        setText(e.target.value);
        const next = parse(e.target.value);
        last.current = next;
        onChange(next);
      }}
    />
  );
}

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = useMemo(() => iconNames.filter((n) => n.includes(q.toLowerCase())), [q]);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="field flex items-center gap-3 text-left">
        <span className="icon-tile h-8 w-8 rounded-[10px]">
          <Icon name={value || "sparkle"} className="h-4 w-4" />
        </span>
        <span className="flex-1 text-[14px]">{value || "Choose an icon"}</span>
        <Icon name="chevron-down" className="h-4 w-4 text-gold-400" />
      </button>
      {open ? (
        <div className="lux-panel absolute z-30 mt-2 w-full rounded-2xl p-3">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search icons" className="field field-sm" />
          <div className="mt-3 grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8">
            {list.map((n) => (
              <button
                key={n}
                type="button"
                title={n}
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
                className={cn("grid aspect-square place-items-center rounded-xl border transition", n === value ? "border-gold-300/70 bg-gold-400/15 text-gold-100" : "border-transparent text-sand hover:border-gold-300/30")}
              >
                <Icon name={n} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Download helpers */
export function downloadFile(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field field-sm pl-10" aria-label={placeholder} />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-full border border-gold-300/12 bg-ink-950/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn("rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition", value === o.value ? "bg-gold-400/20 text-gold-100" : "text-mist hover:text-ivory")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
